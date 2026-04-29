import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: users } = await supabase
    .from('users')
    .select('id, name, email, role, threshold_hr, created_at')
    .order('created_at')

  const { data: tokens } = await supabase
    .from('strava_tokens')
    .select('user_id, last_synced_at, backfill_offset_kudos, backfill_offset_joint, backfill_complete_at')

  const { data: memberships } = await supabase
    .from('team_memberships')
    .select('user_id, teams(id, name, colour)')

  // Activity counts per user
  const { data: activityCounts } = await supabase
    .from('activities')
    .select('user_id')
  const { data: jointCounts } = await supabase
    .from('activities')
    .select('user_id')
    .eq('is_joint', true)

  // Kudos: get all activity_ids with kudos, then look up their user_ids
  const { data: kudosRows } = await supabase
    .from('activity_kudos')
    .select('activity_id')
  const { data: kudosActivities } = kudosRows?.length
    ? await supabase
        .from('activities')
        .select('id, user_id')
        .in('id', [...new Set(kudosRows.map((k) => k.activity_id))])
    : { data: [] }

  // Build per-user maps
  const actCountMap: Record<string, number> = {}
  const jointCountMap: Record<string, number> = {}
  const kudosCountMap: Record<string, number> = {}
  const kudosActivityUserMap: Record<string, string> = {}

  for (const a of kudosActivities ?? []) {
    kudosActivityUserMap[a.id] = a.user_id
  }
  for (const a of activityCounts ?? []) {
    actCountMap[a.user_id] = (actCountMap[a.user_id] ?? 0) + 1
  }
  for (const a of jointCounts ?? []) {
    jointCountMap[a.user_id] = (jointCountMap[a.user_id] ?? 0) + 1
  }
  for (const k of kudosRows ?? []) {
    const uid = kudosActivityUserMap[k.activity_id]
    if (uid) kudosCountMap[uid] = (kudosCountMap[uid] ?? 0) + 1
  }

  const enriched = (users ?? []).map((u) => {
    const token = (tokens ?? []).find((t) => t.user_id === u.id)
    return {
      ...u,
      stravaConnected: !!token,
      lastSynced: token?.last_synced_at ?? null,
      backfillComplete: !!token?.backfill_complete_at,
      backfillOffsetKudos: token?.backfill_offset_kudos ?? 0,
      backfillOffsetJoint: token?.backfill_offset_joint ?? 0,
      team: (memberships ?? []).find((m) => m.user_id === u.id)?.teams ?? null,
      totalActivities: actCountMap[u.id] ?? 0,
      totalJoint: jointCountMap[u.id] ?? 0,
      totalKudos: kudosCountMap[u.id] ?? 0,
    }
  })

  return NextResponse.json(enriched)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const userId = searchParams.get('id')
  if (!userId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (userId === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  const { error } = await supabase.from('users').delete().eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
