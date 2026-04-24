import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { activityMatchesLocation } from '@/lib/location'
import { LeaderboardEntry } from '@/types'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const mode = searchParams.get('mode') ?? 'individual'

  const { data: comp } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!comp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch activities in competition window
  let query = supabase
    .from('activities')
    .select('user_id, total_score, res_score, distance_m, duration_secs, sport, polyline, start_lat, start_lng, recorded_at')
    .gte('recorded_at', `${comp.start_date}T00:00:00Z`)
    .lte('recorded_at', `${comp.end_date}T23:59:59Z`)
    .eq('excluded_from_competition', false)

  if (comp.sport_filter) {
    query = query.eq('sport', comp.sport_filter)
  }

  const { data: activities } = await query

  // Location filtering
  let filtered = activities ?? []
  if (comp.location_lat && comp.location_lng && comp.location_radius_m) {
    filtered = filtered.filter((a) =>
      activityMatchesLocation(a, comp.location_lat, comp.location_lng, comp.location_radius_m, comp.location_match_logic ?? 'route')
    )
  }

  // Aggregate by user
  const userMap: Record<string, { score: number; count: number }> = {}
  for (const a of filtered) {
    if (!userMap[a.user_id]) userMap[a.user_id] = { score: 0, count: 0 }
    const val =
      comp.metric === 'total_res' ? (a.total_score ?? 0)
      : comp.metric === 'total_distance' ? ((a.distance_m ?? 0) / 1000)
      : comp.metric === 'total_duration' ? ((a.duration_secs ?? 0) / 3600)
      : 1
    userMap[a.user_id].score += val
    userMap[a.user_id].count += 1
  }

  if (mode === 'team') {
    const { data: memberships } = await supabase
      .from('team_memberships')
      .select('user_id, teams(id, name, colour)')

    const { data: users } = await supabase.from('users').select('id, name')
    const teamMap: Record<string, { name: string; colour: string; score: number; count: number }> = {}

    for (const m of memberships ?? []) {
      const team = m.teams as any
      if (!teamMap[team.id]) teamMap[team.id] = { name: team.name, colour: team.colour, score: 0, count: 0 }
      const userScore = userMap[m.user_id]
      if (userScore) {
        teamMap[team.id].score += userScore.score
        teamMap[team.id].count += userScore.count
      }
    }

    const entries: LeaderboardEntry[] = Object.entries(teamMap)
      .map(([id, t]) => ({ id, name: t.name, colour: t.colour, score: t.score, activityCount: t.count, rank: 0 }))
      .sort((a, b) => b.score - a.score)
      .map((e, i) => ({ ...e, rank: i + 1 }))

    return NextResponse.json(entries)
  }

  // Individual mode
  const { data: users } = await supabase.from('users').select('id, name')
  const userNameMap: Record<string, string> = {}
  users?.forEach((u) => { userNameMap[u.id] = u.name })

  const entries: LeaderboardEntry[] = Object.entries(userMap)
    .map(([id, d]) => ({
      id,
      name: userNameMap[id] ?? 'Unknown',
      score: d.score,
      activityCount: d.count,
      rank: 0,
    }))
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1 }))

  return NextResponse.json(entries)
}
