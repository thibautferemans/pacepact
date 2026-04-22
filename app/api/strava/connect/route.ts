import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildStravaAuthUrl } from '@/lib/strava'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.redirect(new URL('/login', req.url))

  const baseUrl = process.env.NEXTAUTH_URL!
  const redirectUri = `${baseUrl}/api/strava/callback`
  const state = Buffer.from(session.user.id).toString('base64')
  const authUrl = buildStravaAuthUrl(redirectUri, state)

  return NextResponse.redirect(authUrl)
}
