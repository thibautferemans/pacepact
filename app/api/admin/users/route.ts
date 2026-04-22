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

  const { data: tokens } = await supabase.from('strava_tokens').select('user_id, last_synced_at')
  const { data: memberships } = await supabase
    .from('team_memberships')
    .select('user_id, teams(id, name, colour)')

  const enriched = (users ?? []).map((u) => ({
    ...u,
    stravaConnected: (tokens ?? []).some((t) => t.user_id === u.id),
    lastSynced: (tokens ?? []).find((t) => t.user_id === u.id)?.last_synced_at ?? null,
    team: (memberships ?? []).find((m) => m.user_id === u.id)?.teams ?? null,
  }))

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
