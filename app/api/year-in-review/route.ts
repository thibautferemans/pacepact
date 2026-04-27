import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { activityMatchesLocation } from '@/lib/location'

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function getISOWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getUTCDay()
  // Monday = 0 offset
  const diff = (day === 0 ? -6 : 1 - day)
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

function formatDayMonth(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const isAdmin = session.user.role === 'admin'
  const currentYear = new Date().getFullYear()
  const year = parseInt(searchParams.get('year') ?? String(currentYear), 10)
  const requestedUserId = searchParams.get('userId') ?? session.user.id

  // Non-admin can only access their own data
  if (!isAdmin && requestedUserId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userId = requestedUserId

  // Check feature flag
  const { data: flagRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'feature_year_in_review')
    .single()

  const featureEnabled = flagRow?.value === 'true'
  if (!featureEnabled && !isAdmin) {
    return NextResponse.json({ error: 'Feature not available yet' }, { status: 403 })
  }

  // Fetch all users
  const { data: allUsersData } = await supabase.from('users').select('id, name')
  const allUsers = allUsersData ?? []
  const userNameMap: Record<string, string> = {}
  allUsers.forEach((u) => { userNameMap[u.id] = u.name })

  const currentUser = { id: userId, name: userNameMap[userId] ?? 'Unknown' }

  // Year boundaries
  const yearStart = `${year}-01-01T00:00:00Z`
  const yearEnd = `${year}-12-31T23:59:59Z`

  // Fetch user activities for the year
  const { data: activitiesRaw } = await supabase
    .from('activities')
    .select('id, strava_id, sport, duration_secs, distance_m, avg_hr, elevation_m, start_lat, start_lng, polyline, res_score, social_bonus, total_score, score_tier, is_joint, excluded_from_competition, recorded_at, joint_partner_names')
    .eq('user_id', userId)
    .gte('recorded_at', yearStart)
    .lte('recorded_at', yearEnd)
    .order('recorded_at', { ascending: true })

  const activities = activitiesRaw ?? []

  // Fetch activity kudos for these activities
  const activityIds = activities.map((a) => a.id)
  let kudosMap: Record<string, { strava_id: number; name: string }[]> = {}
  if (activityIds.length > 0) {
    const { data: kudosRows } = await supabase
      .from('activity_kudos')
      .select('activity_id, kudos_giver_strava_id, kudos_giver_name')
      .in('activity_id', activityIds)

    for (const k of kudosRows ?? []) {
      if (!kudosMap[k.activity_id]) kudosMap[k.activity_id] = []
      kudosMap[k.activity_id].push({ strava_id: k.kudos_giver_strava_id, name: k.kudos_giver_name })
    }
  }

  // Fetch other PacePact members' joint activities in the same year (for top partner matching)
  const { data: othersJointRaw } = await supabase
    .from('activities')
    .select('user_id, sport, recorded_at')
    .neq('user_id', userId)
    .eq('is_joint', true)
    .gte('recorded_at', yearStart)
    .lte('recorded_at', yearEnd)

  const othersJoint = othersJointRaw ?? []

  // Available years: only 2025 and 2026 (cap to current year)
  const availableYears = [2026, 2025].filter((y) => y <= currentYear)

  // ── Hero ─────────────────────────────────────────────────────────────────────

  const competitionActivities = activities.filter((a) => !a.excluded_from_competition)

  const totalDistanceM = activities.reduce((s, a) => s + (a.distance_m ?? 0), 0)
  const totalDistanceKm = totalDistanceM / 1000
  const totalDurationSecs = activities.reduce((s, a) => s + (a.duration_secs ?? 0), 0)
  const totalTrainingHours = totalDurationSecs / 3600
  const totalRES = competitionActivities.reduce((s, a) => s + (a.res_score ?? 0), 0)

  // Active days
  const activeDaysSet = new Set(activities.map((a) => a.recorded_at.slice(0, 10)))
  const totalActiveDays = activeDaysSet.size

  // Days elapsed
  let totalDaysElapsed: number
  if (year < currentYear) {
    totalDaysElapsed = isLeapYear(year) ? 366 : 365
  } else {
    const today = new Date()
    const jan1 = new Date(year, 0, 1)
    totalDaysElapsed = Math.floor((today.getTime() - jan1.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  // ── Volume ───────────────────────────────────────────────────────────────────

  const CHART_SPORTS = new Set(['Running', 'Swimming', 'Cycling'])

  const distanceBySport: Record<string, number> = {}
  const timeBySport: Record<string, number> = {}
  let totalElevationM = 0

  for (const a of activities) {
    if (a.distance_m && a.distance_m > 0) {
      distanceBySport[a.sport] = (distanceBySport[a.sport] ?? 0) + a.distance_m / 1000
    }
    timeBySport[a.sport] = (timeBySport[a.sport] ?? 0) + (a.duration_secs ?? 0) / 3600
    totalElevationM += a.elevation_m ?? 0
  }

  // Only show the three core sports in the bar charts
  const distancePerSport = Object.entries(distanceBySport)
    .filter(([sport]) => CHART_SPORTS.has(sport))
    .map(([sport, km]) => ({ sport, km: Math.round(km * 10) / 10 }))
    .sort((a, b) => b.km - a.km)

  const timePerSport = Object.entries(timeBySport)
    .filter(([sport]) => CHART_SPORTS.has(sport))
    .map(([sport, hours]) => ({ sport, hours: Math.round(hours * 10) / 10 }))
    .sort((a, b) => b.hours - a.hours)

  const avgDurationMins = activities.length > 0
    ? Math.round(totalDurationSecs / activities.length / 60)
    : 0

  // ── Effort ───────────────────────────────────────────────────────────────────

  const projectedYearlyRES = totalDaysElapsed > 0
    ? (totalRES / totalDaysElapsed) * (isLeapYear(year) ? 366 : 365)
    : 0

  const hrActivities = activities.filter((a) => a.avg_hr && a.avg_hr > 0)
  const avgHR = hrActivities.length > 0
    ? hrActivities.reduce((s, a) => s + (a.avg_hr ?? 0), 0) / hrActivities.length
    : null

  let highestHRActivity: typeof activities[0] | null = null
  for (const a of hrActivities) {
    if (!highestHRActivity || (a.avg_hr ?? 0) > (highestHRActivity.avg_hr ?? 0)) {
      highestHRActivity = a
    }
  }
  const highestHR = highestHRActivity
    ? {
        sport: highestHRActivity.sport,
        date: highestHRActivity.recorded_at.slice(0, 10),
        hr: Math.round(highestHRActivity.avg_hr ?? 0),
      }
    : null

  // Most intense week
  const weekRES: Record<string, number> = {}
  for (const a of competitionActivities) {
    const weekStart = getISOWeekStart(new Date(a.recorded_at))
    weekRES[weekStart] = (weekRES[weekStart] ?? 0) + (a.res_score ?? 0)
  }
  let mostIntenseWeek: { start: string; end: string; res: number } | null = null
  for (const [weekStart, res] of Object.entries(weekRES)) {
    if (!mostIntenseWeek || res > mostIntenseWeek.res) {
      const endDate = new Date(weekStart)
      endDate.setUTCDate(endDate.getUTCDate() + 6)
      mostIntenseWeek = {
        start: formatDayMonth(weekStart),
        end: formatDayMonth(endDate.toISOString().slice(0, 10)),
        res: Math.round(res * 10) / 10,
      }
    }
  }

  // Most intense month
  const monthRES: number[] = Array(12).fill(0)
  for (const a of competitionActivities) {
    const month = new Date(a.recorded_at).getUTCMonth()
    monthRES[month] += a.res_score ?? 0
  }
  let mostIntenseMonth: { month: number; res: number } | null = null
  for (let m = 0; m < 12; m++) {
    if (monthRES[m] > 0 && (!mostIntenseMonth || monthRES[m] > mostIntenseMonth.res)) {
      mostIntenseMonth = { month: m, res: Math.round(monthRES[m] * 10) / 10 }
    }
  }

  // ── Consistency ───────────────────────────────────────────────────────────────

  const activeDaysPerMonth: number[] = Array(12).fill(0)
  const activeDaysByMonth: Set<string>[] = Array.from({ length: 12 }, () => new Set())
  for (const a of activities) {
    const d = new Date(a.recorded_at)
    const month = d.getUTCMonth()
    activeDaysByMonth[month].add(a.recorded_at.slice(0, 10))
  }
  for (let m = 0; m < 12; m++) {
    activeDaysPerMonth[m] = activeDaysByMonth[m].size
  }

  // Longest streak
  const sortedDays = Array.from(activeDaysSet).sort()
  let longestStreak: { days: number; start: string; end: string } | null = null
  if (sortedDays.length > 0) {
    let streakStart = sortedDays[0]
    let streakLen = 1
    let bestLen = 1
    let bestStart = sortedDays[0]
    let bestEnd = sortedDays[0]

    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1])
      const curr = new Date(sortedDays[i])
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        streakLen++
        if (streakLen > bestLen) {
          bestLen = streakLen
          bestStart = streakStart
          bestEnd = sortedDays[i]
        }
      } else {
        streakStart = sortedDays[i]
        streakLen = 1
      }
    }
    longestStreak = {
      days: bestLen,
      start: formatDayMonth(bestStart),
      end: formatDayMonth(bestEnd),
    }
  }

  // Most active month
  let mostActiveMonth: number | null = null
  for (let m = 0; m < 12; m++) {
    if (activeDaysPerMonth[m] > 0 && (mostActiveMonth === null || activeDaysPerMonth[m] > activeDaysPerMonth[mostActiveMonth])) {
      mostActiveMonth = m
    }
  }

  // Most active day of week
  const dowCounts: number[] = Array(7).fill(0)
  for (const a of activities) {
    const dow = new Date(a.recorded_at).getUTCDay()
    dowCounts[dow]++
  }
  let mostActiveDayOfWeek: number | null = null
  for (let d = 0; d < 7; d++) {
    if (dowCounts[d] > 0 && (mostActiveDayOfWeek === null || dowCounts[d] > dowCounts[mostActiveDayOfWeek])) {
      mostActiveDayOfWeek = d
    }
  }

  // ── Social ───────────────────────────────────────────────────────────────────

  const myJointActivities = activities.filter((a) => a.is_joint)
  const totalJointActivities = myJointActivities.length
  const totalActivityCount = activities.length

  // Top partner: match other PacePact members who did the same sport on the same day
  const partnerCount: Record<string, number> = {}
  for (const myActivity of myJointActivities) {
    const myDate = myActivity.recorded_at.slice(0, 10)
    const mySport = myActivity.sport
    for (const other of othersJoint) {
      if (other.recorded_at.slice(0, 10) === myDate && other.sport === mySport) {
        partnerCount[other.user_id] = (partnerCount[other.user_id] ?? 0) + 1
      }
    }
  }
  let topPartner: { name: string; count: number } | null = null
  for (const [uid, count] of Object.entries(partnerCount)) {
    if (!topPartner || count > topPartner.count) {
      topPartner = { name: userNameMap[uid] ?? 'Unknown', count }
    }
  }

  // Top fan: from kudos
  const fanCount: Record<string, number> = {}
  for (const activityId of activityIds) {
    for (const k of kudosMap[activityId] ?? []) {
      fanCount[k.name] = (fanCount[k.name] ?? 0) + 1
    }
  }
  let topFan: { name: string; count: number } | null = null
  for (const [name, count] of Object.entries(fanCount)) {
    if (!topFan || count > topFan.count) {
      topFan = { name, count }
    }
  }

  // ── Fun ──────────────────────────────────────────────────────────────────────

  let longestByDistance: { sport: string; km: number; date: string } | null = null
  let longestByDuration: { sport: string; hours: number; date: string } | null = null

  for (const a of activities) {
    if (a.distance_m && (!longestByDistance || a.distance_m > (longestByDistance.km * 1000))) {
      longestByDistance = {
        sport: a.sport,
        km: Math.round((a.distance_m / 1000) * 10) / 10,
        date: a.recorded_at.slice(0, 10),
      }
    }
    if (a.duration_secs && (!longestByDuration || a.duration_secs > (longestByDuration.hours * 3600))) {
      longestByDuration = {
        sport: a.sport,
        hours: Math.round((a.duration_secs / 3600) * 10) / 10,
        date: a.recorded_at.slice(0, 10),
      }
    }
  }

  // Blaarmeersen swims
  const BLAARMEERSEN_LAT = 51.042599
  const BLAARMEERSEN_LNG = 3.687932
  const BLAARMEERSEN_RADIUS = 500

  const swimActivities = activities.filter((a) => a.sport === 'Swimming')
  const blaarmeersenSwims = swimActivities.filter((a) =>
    activityMatchesLocation(a, BLAARMEERSEN_LAT, BLAARMEERSEN_LNG, BLAARMEERSEN_RADIUS, 'route')
  )

  let blaarmeersen: { count: number; first: string | null; last: string | null } | null = null
  if (blaarmeersenSwims.length > 0) {
    const sorted = blaarmeersenSwims.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    blaarmeersen = {
      count: sorted.length,
      first: formatDayMonth(sorted[0].recorded_at.slice(0, 10)),
      last: formatDayMonth(sorted[sorted.length - 1].recorded_at.slice(0, 10)),
    }
  }

  return NextResponse.json({
    user: currentUser,
    year,
    availableYears,
    allUsers: isAdmin ? allUsers : [],

    hero: {
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalTrainingHours: Math.round(totalTrainingHours * 10) / 10,
      totalRES: Math.round(totalRES * 10) / 10,
      totalActiveDays,
      totalDaysElapsed,
      activityCount: activities.length,
    },

    volume: {
      distancePerSport,
      timePerSport,
      totalElevationM: Math.round(totalElevationM),
      avgDurationMins,
    },

    effort: {
      projectedYearlyRES: Math.round(projectedYearlyRES * 10) / 10,
      avgHR: avgHR !== null ? Math.round(avgHR) : null,
      highestHR,
      mostIntenseWeek,
      mostIntenseMonth,
    },

    consistency: {
      activeDaysPerMonth,
      longestStreak,
      mostActiveMonth,
      mostActiveDayOfWeek,
    },

    social: {
      topPartner,
      topFan,
      totalJointActivities,
      totalActivityCount,
    },

    fun: {
      longestByDistance,
      longestByDuration,
      blaarmeersen,
    },
  })
}
