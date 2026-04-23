import { supabase } from './supabase'
import {
  refreshStravaToken,
  fetchStravaActivities,
  fetchRelatedActivities,
  mapStravaType,
} from './strava'
import { calculateScore } from './scoring'
import { GlobalSettings } from '@/types'

async function getSettings(): Promise<GlobalSettings> {
  const { data } = await supabase.from('settings').select('key, value')
  const map: Record<string, string> = {}
  data?.forEach((s) => { map[s.key] = s.value })
  return {
    no_hr_penalty: parseFloat(map.no_hr_penalty ?? '0.7'),
    fallback_intensity: parseFloat(map.fallback_intensity ?? '40'),
    social_bonus_points: parseFloat(map.social_bonus_points ?? '10'),
  }
}

async function getMultipliers(): Promise<Record<string, number>> {
  const { data } = await supabase.from('sport_multipliers').select('sport, multiplier')
  const map: Record<string, number> = {}
  data?.forEach((m) => { map[m.sport] = parseFloat(m.multiplier) })
  return map
}

export async function syncUser(
  userId: string,
  options: { skipJointDetection?: boolean } = {}
): Promise<number> {
  const { data: tokenRow } = await supabase
    .from('strava_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!tokenRow) throw new Error('No Strava token for user')

  // Refresh token if expiring within 5 minutes
  let accessToken = tokenRow.access_token
  const expiresAt = new Date(tokenRow.expires_at)
  if (expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    const refreshed = await refreshStravaToken(tokenRow.refresh_token)
    accessToken = refreshed.access_token
    await supabase.from('strava_tokens').update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
    }).eq('user_id', userId)
  }

  const { data: user } = await supabase
    .from('users')
    .select('threshold_hr')
    .eq('id', userId)
    .single()

  const thresholdHr = user?.threshold_hr ?? 175
  const settings = await getSettings()
  const multipliers = await getMultipliers()

  // Determine 'after' param from last successful sync
  const after = tokenRow.last_synced_at
    ? Math.floor(new Date(tokenRow.last_synced_at).getTime() / 1000)
    : undefined

  // Fetch all pages
  let page = 1
  const allActivities: any[] = []
  while (true) {
    const batch = await fetchStravaActivities(accessToken, after, page)
    if (!batch.length) break
    allActivities.push(...batch)
    if (batch.length < 100) break
    page++
  }

  for (const stravaActivity of allActivities) {
    const sport = mapStravaType(stravaActivity.type)
    const scoreInput = {
      duration_secs: stravaActivity.moving_time ?? 0,
      avg_hr: stravaActivity.average_heartrate ?? null,
      distance_m: stravaActivity.distance ?? null,
      elevation_m: stravaActivity.total_elevation_gain ?? null,
      sport,
      is_joint: false,
    }

    const { res_score, social_bonus, total_score, score_tier } = calculateScore(
      scoreInput, thresholdHr, multipliers, settings
    )

    const polylineStr = stravaActivity.map?.summary_polyline ?? null

    await supabase.from('activities').upsert(
      {
        user_id: userId,
        strava_id: stravaActivity.id,
        sport,
        duration_secs: stravaActivity.moving_time ?? 0,
        distance_m: stravaActivity.distance ?? null,
        avg_hr: stravaActivity.average_heartrate ?? null,
        elevation_m: stravaActivity.total_elevation_gain ?? null,
        start_lat: stravaActivity.start_latlng?.[0] ?? null,
        start_lng: stravaActivity.start_latlng?.[1] ?? null,
        polyline: polylineStr,
        res_score,
        social_bonus,
        total_score,
        score_tier,
        is_joint: false,
        recorded_at: stravaActivity.start_date,
      },
      { onConflict: 'strava_id' }
    )

    // Detect joint activities via Strava's related endpoint (skipped on manual syncs)
    if (options.skipJointDetection) continue
    try {
      const related = await fetchRelatedActivities(accessToken, stravaActivity.id)
      for (const rel of related) {
        const { data: relActivity } = await supabase
          .from('activities')
          .select('id, res_score')
          .eq('strava_id', rel.id)
          .maybeSingle()

        if (relActivity) {
          const bonus = settings.social_bonus_points
          // Update current activity
          await supabase.from('activities').update({
            is_joint: true,
            social_bonus: bonus,
            total_score: res_score + bonus,
          }).eq('strava_id', stravaActivity.id)

          // Update related activity
          await supabase.from('activities').update({
            is_joint: true,
            social_bonus: bonus,
            total_score: parseFloat(relActivity.res_score) + bonus,
          }).eq('id', relActivity.id)

          break
        }
      }
    } catch {
      // Non-fatal: joint detection may fail on some accounts
    }
  }

  await supabase.from('strava_tokens').update({
    last_synced_at: new Date().toISOString(),
  }).eq('user_id', userId)

  return allActivities.length
}

export async function syncAllUsers(): Promise<{ userId: string; synced: number; error?: string }[]> {
  const { data: tokens } = await supabase.from('strava_tokens').select('user_id')
  if (!tokens?.length) return []

  const results = await Promise.allSettled(tokens.map((t) => syncUser(t.user_id)))
  return results.map((r, i) => ({
    userId: tokens[i].user_id,
    synced: r.status === 'fulfilled' ? r.value : 0,
    error: r.status === 'rejected' ? String(r.reason) : undefined,
  }))
}

export async function recalculateAllScores(): Promise<void> {
  const settings = await getSettings()
  const multipliers = await getMultipliers()

  const { data: activities } = await supabase
    .from('activities')
    .select('id, user_id, duration_secs, avg_hr, distance_m, elevation_m, sport, is_joint')

  if (!activities?.length) return

  // Get all user threshold HRs
  const { data: users } = await supabase.from('users').select('id, threshold_hr')
  const thresholdMap: Record<string, number> = {}
  users?.forEach((u) => { thresholdMap[u.id] = u.threshold_hr ?? 175 })

  for (const activity of activities) {
    const thresholdHr = thresholdMap[activity.user_id] ?? 175
    const { res_score, social_bonus, total_score, score_tier } = calculateScore(
      {
        duration_secs: activity.duration_secs,
        avg_hr: activity.avg_hr,
        distance_m: activity.distance_m,
        elevation_m: activity.elevation_m,
        sport: activity.sport,
        is_joint: activity.is_joint,
      },
      thresholdHr,
      multipliers,
      settings
    )

    await supabase.from('activities').update({
      res_score,
      social_bonus,
      total_score,
      score_tier,
    }).eq('id', activity.id)
  }
}
