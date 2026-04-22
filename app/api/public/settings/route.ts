import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const [{ data: settings }, { data: multipliers }] = await Promise.all([
    supabase.from('settings').select('*'),
    supabase.from('sport_multipliers').select('*').order('sport'),
  ])

  return NextResponse.json({
    settings: settings ?? [],
    multipliers: multipliers ?? [],
  })
}
