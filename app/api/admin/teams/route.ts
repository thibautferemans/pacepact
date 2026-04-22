import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: teams } = await supabase.from('teams').select('*').order('name')
  const { data: memberships } = await supabase
    .from('team_memberships')
    .select('user_id, team_id, users(id, name, email)')

  const teamsWithMembers = (teams ?? []).map((team) => ({
    ...team,
    members: (memberships ?? [])
      .filter((m) => m.team_id === team.id)
      .map((m) => m.users),
  }))

  return NextResponse.json(teamsWithMembers)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, colour = '#185FA5' } = await req.json()
  const { data, error } = await supabase
    .from('teams')
    .insert({ name, colour })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
