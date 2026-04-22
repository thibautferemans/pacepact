import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { memberIds, ...teamFields } = body

  // Update team fields if provided
  if (Object.keys(teamFields).length > 0) {
    await supabase.from('teams').update(teamFields).eq('id', params.id)
  }

  // Update memberships if provided
  if (Array.isArray(memberIds)) {
    // Remove all existing memberships for this team
    await supabase.from('team_memberships').delete().eq('team_id', params.id)
    // Insert new memberships
    if (memberIds.length > 0) {
      await supabase.from('team_memberships').insert(
        memberIds.map((userId: string) => ({ user_id: userId, team_id: params.id }))
      )
    }
  }

  const { data } = await supabase.from('teams').select('*').eq('id', params.id).single()
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await supabase.from('team_memberships').delete().eq('team_id', params.id)
  const { error } = await supabase.from('teams').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
