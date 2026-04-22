import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { recalculateAllScores } from '@/lib/sync'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await recalculateAllScores()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Recalculate error:', err)
    return NextResponse.json({ error: 'Recalculation failed' }, { status: 500 })
  }
}
