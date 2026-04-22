import { NextRequest, NextResponse } from 'next/server'
import { syncAllUsers } from '@/lib/sync'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`

  // Vercel cron passes the secret automatically; also allow direct call with secret
  if (process.env.CRON_SECRET && authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await syncAllUsers()
    return NextResponse.json({ results })
  } catch (err) {
    console.error('Cron sync error:', err)
    return NextResponse.json({ error: 'Cron sync failed' }, { status: 500 })
  }
}
