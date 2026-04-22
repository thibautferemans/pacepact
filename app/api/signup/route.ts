import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { name, email, password, code } = await req.json()

  if (!name || !email || !password || !code) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Validate invite code
  const { data: invite } = await supabase
    .from('invite_links')
    .select('*')
    .eq('code', code)
    .is('used_by', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 400 })
  }

  // Check email uniqueness
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(password, 12)

  const { data: user, error } = await supabase
    .from('users')
    .insert({ name, email: email.toLowerCase(), password_hash, role: 'member' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark invite as used
  await supabase.from('invite_links').update({ used_by: user.id }).eq('id', invite.id)

  return NextResponse.json({ ok: true })
}
