import { supabase } from './supabase'
import {
  refreshStravaToken,
  fetchStravaActivities,
  fetchRelatedActivities,
  fetchActivityKudos,
  mapStravaType,
  isPacePactSport,
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

async function syncKudos(userId: string, accessToken: string, maxActivities = 30): Promise<void> {
  // Fetch most recent activities that have no kudos records yet
  const { data: activities } = await supabase
    .from('activities')
    .select('id, strava_id, activity_kudos(activity_id)')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(maxActivities)

  if (!activities?.length) return

  // Filter to only those with no kudos records
  const noKudosActivities = activities.filter(
    (a: any) => !a.activity_kudos || a.activity_kudos.length === 0
  )

  let consecutiveEmpty = 0

  for (const activity of noKudosActivities) {
    const kudos = await fetchActivityKudos(accessToken, activity.strava_id)

    if (kudos.length === 0) {
      consecutiveEmpty++
      if (consecutiveEmpty >= 3) break
      continue
    }

    consecutiveEmpty = 0

    for (const k of kudos) {
      await supabase.from('activity_kudos').upsert(
        {
          activity_id: activity.id,
          kudos_giver_strava_id: k.strava_id,
          kudos_giver_name: k.name,
        },
        { onConflict: 'activity_id,kudos_giver_strava_id' }
      )
    }
  }
}

export async function syncUser(
  userId: string,
  options: { skipJointDetection?: boolean; syncKudos?: boolean; forceFull?: boolean } = {}
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

  // Determine 'after' param from last successful sync (skip if forceFull)
  const after = !options.forceFull && tokenRow.last_synced_at
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
    const excluded = !isPacePactSport(sport)

    const polylineStr = stravaActivity.map?.summary_polyline ?? null

    let res_score: number
    let social_bonus: number
    let total_score: number
    let score_tier: 1 | 2 | 3

    if (excluded) {
      res_score = 0
      social_bonus = 0
      total_score = 0
      score_tier = 3
    } else {
      const scoreInput = {
        duration_secs: stravaActivity.moving_time ?? 0,
        avg_hr: stravaActivity.average_heartrate ?? null,
        distance_m: stravaActivity.distance ?? null,
        elevation_m: stravaActivity.total_elevation_gain ?? null,
        sport,
        is_joint: false,
      }
      const result = calculateScore(scoreInput, thresholdHr, multipliers, settings)
      res_score = result.res_score
      social_bonus = result.social_bonus
      total_score = result.total_score
      score_tier = result.score_tier
    }

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
        excluded_from_competition: excluded,
        recorded_at: stravaActivity.start_date,
      },
      { onConflict: 'strava_id' }
    )

    // Detect joint activities via Strava's related endpoint (only for non-excluded, non-manual syncs)
    if (excluded || options.skipJointDetection) continue
    try {
      const related = await fetchRelatedActivities(accessToken, stravaActivity.id)
      if (related.length > 0) {
        // Store ALL Strava partner names (not just PacePact members)
        const partnerNames: string[] = related
          .map((rel: any) => {
            const fn = (rel.athlete?.firstname ?? '').trim()
            const ln = (rel.athlete?.lastname ?? '').trim()
            return `${fn} ${ln}`.trim()
          })
          .filter(Boolean)

        if (partnerNames.length > 0) {
          await supabase.from('activities').update({
            joint_partner_names: partnerNames,
          }).eq('strava_id', stravaActivity.id)
        }

        // Also check if any related activity belongs to a PacePact member → award bonus
        for (const rel of related) {
          const { data: relActivity } = await supabase
            .from('activities')
            .select('id, res_score')
            .eq('strava_id', rel.id)
            .maybeSingle()

          if (relActivity) {
            const bonus = settings.social_bonus_points
            await supabase.from('activities').update({
              is_joint: true,
              social_bonus: bonus,
              total_score: res_score + bonus,
            }).eq('strava_id', stravaActivity.id)

            await supabase.from('activities').update({
              is_joint: true,
              social_bonus: bonus,
              total_score: parseFloat(relActivity.res_score) + bonus,
            }).eq('id', relActivity.id)

            break
          }
        }
      }
    } catch {
      // Non-fatal: joint detection may fail on some accounts
    }
  }

  await supabase.from('strava_tokens').update({
    last_synced_at: new Date().toISOString(),
  }).eq('user_id', userId)

  // Optionally sync kudos after activity sync
  if (options.syncKudos) {
    try {
      await syncKudos(userId, accessToken)
    } catch {
      // Non-fatal: kudos sync failure should not fail the overall sync
    }
  }

  return allActivities.length
}

export async function syncAllUsers(): Promise<{ userId: string; synced: number; error?: string }[]> {
  const { data: tokens } = await supabase.from('strava_tokens').select('user_id')
  if (!tokens?.length) return []

  const results = await Promise.allSettled(
    tokens.map((t) => syncUser(t.user_id, { skipJointDetection: false, syncKudos: true }))
  )
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
    .select('id, user_id, duration_secs, avg_hr, distance_m, elevation_m, sport, is_joint, excluded_from_competition')

  if (!activities?.length) return

  // Get all user threshold HRs
  const { data: users } = await supabase.from('users').select('id, threshold_hr')
  const thresholdMap: Record<string, number> = {}
  users?.forEach((u) => { thresholdMap[u.id] = u.threshold_hr ?? 175 })

  for (const activity of activities) {
    if (activity.excluded_from_competition) {
      await supabase.from('activities').update({
        res_score: 0,
        social_bonus: 0,
        total_score: 0,
        score_tier: 3,
      }).eq('id', activity.id)
      continue
    }

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
