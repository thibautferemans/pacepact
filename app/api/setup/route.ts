import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  // Only works if no users exist
  const { count } = await supabase.from('users').select('id', { count: 'exact', head: true })
  if (count && count > 0) {
    return NextResponse.json({ error: 'Setup already completed' }, { status: 400 })
  }

  const { name, email, password } = await req.json()
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(password, 12)
  const { error } = await supabase.from('users').insert({
    name,
    email: email.toLowerCase(),
    password_hash,
    role: 'admin',
    threshold_hr: 175,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const { count } = await supabase.from('users').select('id', { count: 'exact', head: true })
  return NextResponse.json({ needsSetup: !count || count === 0 })
}
