const STRAVA_BASE = 'https://www.strava.com/api/v3'

export const SPORT_MAP: Record<string, string> = {
  Run: 'Running',
  TrailRun: 'Running',
  VirtualRun: 'Running',
  Swim: 'Swimming',
  Ride: 'Cycling',
  VirtualRide: 'Cycling',
  EBikeRide: 'Cycling',
  MountainBikeRide: 'Cycling',
  Hike: 'Hiking',
  Walk: 'Hiking',
  WeightTraining: 'Strength',
  Workout: 'Strength',
  Crossfit: 'Strength',
  Elliptical: 'Strength',
  StairStepper: 'Strength',
  RockClimbing: 'Strength',
  Yoga: 'Strength',
  Pilates: 'Strength',
}

export function mapStravaType(stravaType: string): string {
  return SPORT_MAP[stravaType] ?? 'Running'
}

export async function refreshStravaToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_at: number
}> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error('Failed to refresh Strava token')
  return res.json()
}

export async function fetchStravaActivities(
  accessToken: string,
  after?: number,
  page = 1,
  perPage = 100
): Promise<any[]> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })
  if (after) params.set('after', String(after))

  const res = await fetch(`${STRAVA_BASE}/athlete/activities?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (res.status === 429) throw new Error('Strava rate limit reached — try again in 15 minutes')
  if (!res.ok) throw new Error(`Strava activities fetch failed: ${res.status}`)
  return res.json()
}

export async function fetchRelatedActivities(
  accessToken: string,
  activityId: number
): Promise<any[]> {
  const res = await fetch(`${STRAVA_BASE}/activities/${activityId}/related`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export function buildStravaAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    state,
  })
  return `https://www.strava.com/oauth/authorize?${params}`
}

export async function exchangeStravaCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: { id: number; firstname: string; lastname: string }
}> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error('Failed to exchange Strava code')
  return res.json()
}
