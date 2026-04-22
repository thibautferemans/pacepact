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

  const { data } = await supabase.from('sport_multipliers').select('*').order('sport')
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updates: { sport: string; multiplier: number }[] = await req.json()

  for (const { sport, multiplier } of updates) {
    await supabase
      .from('sport_multipliers')
      .upsert({ sport, multiplier })
  }

  // Retroactive recalculation
  await recalculateAllScores()

  return NextResponse.json({ ok: true })
}
