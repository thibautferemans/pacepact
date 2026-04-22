import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabase
    .from('competitions')
    .select('*')
    .eq('status', 'active')
    .order('start_date')

  return NextResponse.json(data ?? [])
}
