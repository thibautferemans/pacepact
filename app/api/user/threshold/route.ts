import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { threshold_hr } = await req.json()
  if (!threshold_hr || threshold_hr < 100 || threshold_hr > 250) {
    return NextResponse.json({ error: 'Invalid threshold HR (100–250)' }, { status: 400 })
  }

  const { error } = await supabase
    .from('users')
    .update({ threshold_hr })
    .eq('id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
