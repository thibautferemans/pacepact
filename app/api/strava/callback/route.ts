import { NextRequest, NextResponse } from 'next/server'
import { exchangeStravaCode } from '@/lib/strava'
import { supabase } from '@/lib/supabase'
import { syncUser } from '@/lib/sync'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const baseUrl = process.env.NEXTAUTH_URL!

  if (error || !code || !state) {
    return NextResponse.redirect(`${baseUrl}/onboarding?error=strava_denied`)
  }

  const userId = Buffer.from(state, 'base64').toString('utf8')
  if (!userId) {
    return NextResponse.redirect(`${baseUrl}/onboarding?error=invalid_state`)
  }

  try {
    const tokens = await exchangeStravaCode(code)

    await supabase.from('strava_tokens').upsert(
      {
        user_id: userId,
        strava_user_id: tokens.athlete.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expires_at * 1000).toISOString(),
        last_synced_at: null,
      },
      { onConflict: 'user_id' }
    )

    // Kick off an initial sync in the background — don't block the redirect
    syncUser(userId).catch((e) => console.error('Initial Strava sync error:', e))

    return NextResponse.redirect(`${baseUrl}/onboarding?step=threshold&strava=connected`)
  } catch (err) {
    console.error('Strava callback error:', err)
    return NextResponse.redirect(`${baseUrl}/onboarding?error=strava_failed`)
  }
}
