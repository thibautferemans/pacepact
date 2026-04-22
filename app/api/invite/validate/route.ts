import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ valid: false })

  const { data } = await supabase
    .from('invite_links')
    .select('id, expires_at, used_by')
    .eq('code', code)
    .maybeSingle()

  if (!data || data.used_by || new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false })
  }

  return NextResponse.json({ valid: true })
}
