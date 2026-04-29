import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { backfillKudos, backfillJointDetection } from '@/lib/sync'
import { supabase } from '@/lib/supabase'

export const maxDuration = 60

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const [{ count: totalActivities }, tokenRow] = await Promise.all([
    supabase.from('activities').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('strava_tokens').select('backfill_offset_kudos, backfill_offset_joint, backfill_complete_at').eq('user_id', userId).single(),
  ])

  return NextResponse.json({
    totalActivities: totalActivities ?? 0,
    kudosOffset: tokenRow.data?.backfill_offset_kudos ?? 0,
    jointOffset: tokenRow.data?.backfill_offset_joint ?? 0,
    backfillComplete: !!tokenRow.data?.backfill_complete_at,
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const { type } = await req.json()

  const { data: token } = await supabase
    .from('strava_tokens')
    .select('backfill_offset_kudos, backfill_offset_joint, backfill_complete_at')
    .eq('user_id', userId)
    .single()

  if (!token) return NextResponse.json({ error: 'No Strava token' }, { status: 400 })

  const BATCH = 40

  if (type === 'kudos') {
    const offset = token.backfill_offset_kudos ?? 0
    const { processed, hasMore } = await backfillKudos(userId, BATCH, offset)
    const newOffset = offset + processed
    await supabase.from('strava_tokens')
      .update({ backfill_offset_kudos: newOffset })
      .eq('user_id', userId)
    return NextResponse.json({ type: 'kudos', offset: newOffset, hasMore })
  }

  if (type === 'joint') {
    const offset = token.backfill_offset_joint ?? 0
    const { processed, hasMore } = await backfillJointDetection(userId, '2025-01-01T00:00:00Z', BATCH, offset)
    const newOffset = offset + processed
    const done = !hasMore

    await supabase.from('strava_tokens')
      .update({
        backfill_offset_joint: newOffset,
        ...(done ? { backfill_complete_at: new Date().toISOString() } : {}),
      })
      .eq('user_id', userId)

    return NextResponse.json({ type: 'joint', offset: newOffset, hasMore })
  }

  return NextResponse.json({ error: 'type must be kudos or joint' }, { status: 400 })
}
