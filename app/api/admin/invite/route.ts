import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data } = await supabase
    .from('invite_links')
    .select('*, creator:created_by(name, email), usedBy:used_by(name, email)')
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { expiresInHours = 72 } = await req.json().catch(() => ({}))
  const code = randomUUID()
  const expires_at = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString()

  const { data, error } = await supabase
    .from('invite_links')
    .insert({ code, created_by: session.user.id, expires_at })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
