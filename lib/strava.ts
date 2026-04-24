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
}

export const STRAVA_DISPLAY_MAP: Record<string, string> = {
  ...SPORT_MAP,
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
  Kayaking: 'Kayaking',
  Canoeing: 'Canoeing',
  Rowing: 'Rowing',
  StandUpPaddling: 'SUP',
  Surfing: 'Surfing',
  Windsurf: 'Windsurfing',
  Kitesurf: 'Kitesurfing',
  Soccer: 'Soccer',
  Tennis: 'Tennis',
  Squash: 'Squash',
  Badminton: 'Badminton',
  Golf: 'Golf',
  Boxing: 'Boxing',
  MartialArts: 'Martial Arts',
  InlineSkate: 'Inline Skating',
  IceSkate: 'Ice Skating',
  AlpineSki: 'Alpine Skiing',
  NordicSki: 'Nordic Skiing',
  BackcountrySki: 'Backcountry Skiing',
  Snowboard: 'Snowboarding',
  Snowshoe: 'Snowshoeing',
  HighIntensityIntervalTraining: 'HIIT',
  Dance: 'Dance',
  Skateboard: 'Skateboarding',
  Wheelchair: 'Wheelchair',
  Handcycle: 'Handcycle',
}

export const PACEPACT_SPORTS = new Set(Object.values(SPORT_MAP))

export function mapStravaType(stravaType: string): string {
  return STRAVA_DISPLAY_MAP[stravaType] ?? stravaType
}

export function isPacePactSport(sport: string): boolean {
  return PACEPACT_SPORTS.has(sport)
}

export async function fetchActivityKudos(
  accessToken: string,
  activityId: number
): Promise<{ strava_id: number; name: string }[]> {
  try {
    const res = await fetch(
      `${STRAVA_BASE}/activities/${activityId}/kudos?per_page=200`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (res.status === 429) return []
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data.map((k: { id: number; firstname: string; lastname: string }) => ({
      strava_id: k.id,
      name: `${k.firstname} ${k.lastname}`.trim(),
    }))
  } catch {
    return []
  }
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
