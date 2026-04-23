import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncUser } from '@/lib/sync'

// Increase Vercel serverless timeout to 60s (max on Hobby plan)
export const maxDuration = 60

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Skip joint detection on manual syncs — it makes one API call per activity
    // and is too slow for large histories. Joint detection runs on the daily cron.
    const count = await syncUser(session.user.id, { skipJointDetection: true })
    return NextResponse.json({ synced: count })
  } catch (err: any) {
    console.error('Manual sync error:', err)
    const message = err?.message ?? 'Sync failed'
    const status = message.includes('rate limit') ? 429 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
