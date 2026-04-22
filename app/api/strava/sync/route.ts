import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncUser } from '@/lib/sync'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const count = await syncUser(session.user.id)
    return NextResponse.json({ synced: count })
  } catch (err: any) {
    console.error('Manual sync error:', err)
    const message = err?.message ?? 'Sync failed'
    const status = message.includes('rate limit') ? 429 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
