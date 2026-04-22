import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { refreshStravaToken, fetchStravaActivities, mapStravaType } from '@/lib/strava'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const userId = session.user.id
  const log: string[] = []

  // 1. Check strava token
  const { data: tokenRow, error: tokenErr } = await supabase
    .from('strava_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (tokenErr || !tokenRow) {
    return NextResponse.json({ error: 'No Strava token found', detail: tokenErr?.message })
  }

  log.push(`✅ Strava token found. Strava user ID: ${tokenRow.strava_user_id}`)
  log.push(`   Last synced: ${tokenRow.last_synced_at ?? 'never'}`)
  log.push(`   Token expires: ${tokenRow.expires_at}`)

  // 2. Refresh token if needed
  let accessToken = tokenRow.access_token
  const expiresAt = new Date(tokenRow.expires_at)
  if (expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    log.push('⚠️ Token expiring soon — refreshing...')
    try {
      const refreshed = await refreshStravaToken(tokenRow.refresh_token)
      accessToken = refreshed.access_token
      log.push('✅ Token refreshed')
    } catch (e: any) {
      log.push(`❌ Token refresh failed: ${e.message}`)
      return NextResponse.json({ log })
    }
  } else {
    log.push('✅ Token is still valid')
  }

  // 3. Fetch first page of activities from Strava
  log.push('📡 Fetching activities from Strava (page 1)...')
  try {
    const activities = await fetchStravaActivities(accessToken, undefined, 1, 10)
    log.push(`✅ Strava returned ${activities.length} activities on page 1`)
    if (activities.length > 0) {
      log.push('First 3 activities:')
      activities.slice(0, 3).forEach((a: any) => {
        log.push(`  - [${a.type}] "${a.name}" on ${a.start_date} — mapped to: ${mapStravaType(a.type)}`)
      })
    }
  } catch (e: any) {
    log.push(`❌ Strava fetch failed: ${e.message}`)
    return NextResponse.json({ log })
  }

  // 4. Check activities already in DB
  const { count } = await supabase
    .from('activities')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  log.push(`📦 Activities currently in DB for your account: ${count ?? 0}`)

  return NextResponse.json({ log })
}
