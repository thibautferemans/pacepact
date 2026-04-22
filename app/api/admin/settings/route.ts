import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { recalculateAllScores } from '@/lib/sync'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data } = await supabase.from('settings').select('*')
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updates: Record<string, string> = await req.json()

  for (const [key, value] of Object.entries(updates)) {
    await supabase.from('settings').upsert({ key, value: String(value) })
  }

  // Retroactive recalculation
  await recalculateAllScores()

  return NextResponse.json({ ok: true })
}
