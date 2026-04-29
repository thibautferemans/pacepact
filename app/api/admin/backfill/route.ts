import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { backfillKudos, backfillJointDetection } from '@/lib/sync'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, type, limit, offset, since } = await req.json()
  if (!userId || !type) {
    return NextResponse.json({ error: 'userId and type required' }, { status: 400 })
  }

  try {
    if (type === 'kudos') {
      await backfillKudos(userId, limit ?? 100)
      return NextResponse.json({ ok: true, type: 'kudos' })
    }

    if (type === 'joint') {
      const result = await backfillJointDetection(
        userId,
        since ?? '2025-01-01T00:00:00Z',
        limit ?? 50,
        offset ?? 0,
      )
      return NextResponse.json({ ok: true, type: 'joint', ...result })
    }

    return NextResponse.json({ error: 'type must be kudos or joint' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Backfill failed' }, { status: 500 })
  }
}
