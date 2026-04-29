import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const limit = parseInt(searchParams.get('limit') ?? '30')
  const competitionId = searchParams.get('competition_id')

  let query = supabase
    .from('activities')
    .select('*, user:user_id(id, name)')
    .eq('excluded_from_competition', false)
    .order('recorded_at', { ascending: false })
    .limit(limit)

  if (competitionId) {
    const { data: comp } = await supabase
      .from('competitions')
      .select('start_date, end_date, sport_filter')
      .eq('id', competitionId)
      .single()

    if (comp) {
      query = query
        .gte('recorded_at', `${comp.start_date}T00:00:00Z`)
        .lte('recorded_at', `${comp.end_date}T23:59:59Z`)
      if (comp.sport_filter) query = query.eq('sport', comp.sport_filter)
    }
  }

  const { data } = await query
  return NextResponse.json(data ?? [])
}
