export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
  threshold_hr: number
  created_at: string
}

export interface StravaToken {
  user_id: string
  strava_user_id: number
  access_token: string
  refresh_token: string
  expires_at: string
  last_synced_at: string | null
}

export interface Activity {
  id: string
  user_id: string
  strava_id: number
  sport: string
  duration_secs: number
  distance_m: number | null
  avg_hr: number | null
  elevation_m: number | null
  start_lat: number | null
  start_lng: number | null
  polyline: string | null
  res_score: number
  social_bonus: number
  total_score: number
  score_tier: 1 | 2 | 3
  is_joint: boolean
  recorded_at: string
  created_at: string
  user?: User
}

export interface Competition {
  id: string
  name: string
  description: string | null
  sport_filter: string | null
  metric: 'total_res' | 'total_distance' | 'total_duration' | 'activity_count'
  mode: 'individual' | 'team' | 'both'
  start_date: string
  end_date: string
  status: 'active' | 'archived'
  is_main: boolean
  location_lat: number | null
  location_lng: number | null
  location_radius_m: number | null
  location_match_logic: string | null
  created_at: string
}

export interface Team {
  id: string
  name: string
  colour: string
  created_at: string
  members?: User[]
}

export interface TeamMembership {
  user_id: string
  team_id: string
  joined_at: string
}

export interface SportMultiplier {
  sport: string
  multiplier: number
}

export interface Setting {
  key: string
  value: string
}

export interface InviteLink {
  id: string
  code: string
  created_by: string
  used_by: string | null
  expires_at: string
  created_at: string
  creator?: User
}

export interface LeaderboardEntry {
  rank: number
  id: string
  name: string
  score: number
  activityCount?: number
  colour?: string
}

export interface GlobalSettings {
  no_hr_penalty: number
  fallback_intensity: number
  social_bonus_points: number
}
