import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncUser } from '@/lib/sync'
import { supabase } from '@/lib/supabase'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  // Clear last_synced_at so the sync fetches all history (not just recent)
  await supabase.from('strava_tokens').update({ last_synced_at: null }).eq('user_id', userId)

  try {
    const count = await syncUser(userId, { skipJointDetection: true, forceFull: true })
    return NextResponse.json({ synced: count })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
