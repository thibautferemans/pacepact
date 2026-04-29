import { NextRequest, NextResponse } from 'next/server'
import { backfillKudos, backfillJointDetection } from '@/lib/sync'
import { supabase } from '@/lib/supabase'

export const maxDuration = 60

const BATCH = 40

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find users with incomplete backfill
  const { data: pending } = await supabase
    .from('strava_tokens')
    .select('user_id, backfill_offset_kudos, backfill_offset_joint, backfill_complete_at')
    .is('backfill_complete_at', null)

  if (!pending?.length) return NextResponse.json({ ok: true, processed: 0 })

  const results = []

  for (const token of pending) {
    const userId = token.user_id

    try {
      // Advance kudos backfill one batch
      const kudosOffset = token.backfill_offset_kudos ?? 0
      const kudosResult = await backfillKudos(userId, BATCH, kudosOffset)
      const newKudosOffset = kudosOffset + kudosResult.processed

      // Advance joint backfill one batch
      const jointOffset = token.backfill_offset_joint ?? 0
      const jointResult = await backfillJointDetection(userId, '2025-01-01T00:00:00Z', BATCH, jointOffset)
      const newJointOffset = jointOffset + jointResult.processed

      // Mark complete when both are done
      const done = !kudosResult.hasMore && !jointResult.hasMore

      await supabase.from('strava_tokens').update({
        backfill_offset_kudos: newKudosOffset,
        backfill_offset_joint: newJointOffset,
        ...(done ? { backfill_complete_at: new Date().toISOString() } : {}),
      }).eq('user_id', userId)

      results.push({ userId, newKudosOffset, newJointOffset, done })
    } catch (err: any) {
      results.push({ userId, error: err.message })
    }
  }

  return NextResponse.json({ ok: true, results })
}
