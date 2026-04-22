import { GlobalSettings } from '@/types'

export interface ScoreInput {
  duration_secs: number
  avg_hr: number | null
  distance_m: number | null
  elevation_m: number | null
  sport: string
  is_joint: boolean
}

export interface ScoreResult {
  res_score: number
  social_bonus: number
  total_score: number
  score_tier: 1 | 2 | 3
}

export function calculateScore(
  activity: ScoreInput,
  thresholdHr: number,
  multipliers: Record<string, number>,
  settings: GlobalSettings
): ScoreResult {
  const { duration_secs, avg_hr, distance_m, elevation_m, sport, is_joint } = activity
  const { no_hr_penalty, fallback_intensity, social_bonus_points } = settings

  const duration_hours = duration_secs / 3600
  const sport_multiplier = multipliers[sport] ?? 1.0

  let res_score: number
  let score_tier: 1 | 2 | 3

  if (avg_hr && avg_hr > 0) {
    // Tier 1: HR available
    res_score = duration_hours * Math.pow(avg_hr / thresholdHr, 2) * 100 * sport_multiplier
    score_tier = 1
  } else if ((distance_m && distance_m > 0) || (elevation_m && elevation_m > 0)) {
    // Tier 2: no HR, has distance/elevation
    const distance_km = (distance_m ?? 0) / 1000
    const elevation = elevation_m ?? 0
    res_score = (distance_km * 1.0 + elevation * 0.01) * sport_multiplier * no_hr_penalty
    score_tier = 2
  } else {
    // Tier 3: duration only
    res_score = duration_hours * fallback_intensity * sport_multiplier * no_hr_penalty
    score_tier = 3
  }

  const social_bonus = is_joint ? social_bonus_points : 0
  const total_score = res_score + social_bonus

  return { res_score, social_bonus, total_score, score_tier }
}

export function formatScore(resScore: number, socialBonus: number, scoreTier: number, isJoint: boolean): string {
  const res = Math.round(resScore * 10) / 10
  if (isJoint && socialBonus > 0) {
    return `${res} + ${socialBonus} 🤝`
  }
  const warn = scoreTier >= 2 ? ' ⚠️' : ''
  return `${res}${warn}`
}
