'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  LabelList,
  ResponsiveContainer,
} from 'recharts'

interface HeroData {
  totalDistanceKm: number
  totalTrainingHours: number
  totalRES: number
  totalActiveDays: number
  totalDaysElapsed: number
  activityCount: number
}

interface VolumeData {
  distancePerSport: { sport: string; km: number }[]
  timePerSport: { sport: string; hours: number }[]
  totalElevationM: number
  avgDurationMins: number
}

interface EffortData {
  projectedYearlyRES: number
  avgHR: number | null
  highestHR: { sport: string; date: string; hr: number } | null
  mostIntenseWeek: { start: string; end: string; res: number } | null
  mostIntenseMonth: { month: number; res: number } | null
}

interface ConsistencyData {
  activeDaysPerMonth: number[]
  longestStreak: { days: number; start: string; end: string } | null
  mostActiveMonth: number | null
  mostActiveDayOfWeek: number | null
}

interface SocialData {
  topPartner: { name: string; count: number } | null
  topFan: { name: string; count: number } | null
  totalJointActivities: number
  totalActivityCount: number
}

interface FunData {
  longestByDistance: { sport: string; km: number; date: string } | null
  longestByDuration: { sport: string; hours: number; date: string } | null
  blaarmeersen: { count: number; first: string | null; last: string | null } | null
}

interface YearInReviewData {
  user: { id: string; name: string }
  year: number
  availableYears: number[]
  allUsers: { id: string; name: string }[]
  hero: HeroData
  volume: VolumeData
  effort: EffortData
  consistency: ConsistencyData
  social: SocialData
  fun: FunData
}

const ACCENT = '#185FA5'
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-3 sm:p-5 flex flex-col gap-1 shadow-sm">
      <span className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wide leading-tight min-h-[2rem] sm:min-h-0 block">{label}</span>
      <span className="text-xl sm:text-3xl font-bold text-gray-900 leading-tight">{value}</span>
      {sub && <span className="text-[11px] sm:text-[13px] text-gray-500">{sub}</span>}
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  open,
  onToggle,
}: {
  icon: string
  title: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-3 text-left"
    >
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        {title}
      </h2>
      <svg
        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

function Insight({ text }: { text: string }) {
  return <p className="text-[13px] text-gray-500 mt-1">{text}</p>
}

function BigStat({ label, value, insight }: { label: string; value: string; insight?: string }) {
  return (
    <div className="py-2">
      <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {insight && <Insight text={insight} />}
    </div>
  )
}

function HorizontalBarChart({
  data,
  valueKey,
  labelKey,
  unit,
}: {
  data: Record<string, string | number>[]
  valueKey: string
  labelKey: string
  unit: string
}) {
  if (!data.length) return <p className="text-sm text-gray-400">No data</p>
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 44, 80)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 64, left: 0, bottom: 0 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey={labelKey}
          width={96}
          tick={{ fontSize: 13, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <Bar dataKey={valueKey} radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={ACCENT} />
          ))}
          <LabelList
            dataKey={valueKey}
            position="right"
            style={{ fontSize: 12, fill: '#6b7280', fontWeight: 500 }}
            formatter={(v: number) => `${v} ${unit}`}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function YearTimeline({
  year,
  totalActiveDays,
  totalDaysElapsed,
}: {
  year: number
  totalActiveDays: number
  totalDaysElapsed: number
}) {
  const now = new Date()
  const isCurrentYear = year === now.getFullYear()
  const totalDaysInYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365
  const progressPct = Math.min((totalDaysElapsed / totalDaysInYear) * 100, 100)
  const daysLeft = totalDaysInYear - totalDaysElapsed
  const activeRate = totalDaysElapsed > 0 ? Math.round((totalActiveDays / totalDaysElapsed) * 100) : 0

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
        <span>1 Jan</span>
        {isCurrentYear && (
          <span className="font-medium text-[#185FA5]">
            Today · Day {totalDaysElapsed}
          </span>
        )}
        <span>31 Dec</span>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        {/* Active days fill */}
        <div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            width: `${progressPct}%`,
            background: `linear-gradient(90deg, #185FA5 0%, #3b82f6 100%)`,
          }}
        />
        {/* Today marker */}
        {isCurrentYear && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-[#185FA5] rounded-full shadow"
            style={{ left: `calc(${progressPct}% - 6px)` }}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-3 text-sm">
        <span className="text-gray-700 font-medium">
          <span className="text-[#185FA5] font-bold">{totalActiveDays}</span> active days
        </span>
        <span className="text-gray-400">
          {activeRate}% of days trained
        </span>
        {isCurrentYear && daysLeft > 0 && (
          <span className="text-gray-400">
            {daysLeft} days to go
          </span>
        )}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-gray-200 rounded-2xl h-20" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-2xl h-28" />
        ))}
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-gray-200 rounded-2xl h-40" />
      ))}
    </div>
  )
}

export default function YearInReviewClient({
  currentUserId,
  isAdmin,
}: {
  currentUserId: string
  isAdmin: boolean
}) {
  const currentYear = new Date().getFullYear()
  const [selectedUserId, setSelectedUserId] = useState(currentUserId)
  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState<YearInReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({
    1: true, 2: true, 3: true, 4: true, 5: true,
  })

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ year: String(year) })
    if (selectedUserId !== currentUserId) params.set('userId', selectedUserId)
    fetch(`/api/year-in-review?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [selectedUserId, year, currentUserId])

  const toggleSection = (n: number) =>
    setOpenSections((prev) => ({ ...prev, [n]: !prev[n] }))

  const nowMonth = new Date().getMonth()

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Year in Review</h1>
          {data && <p className="text-sm text-gray-400 mt-0.5">{data.user.name}</p>}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && data?.allUsers && data.allUsers.length > 0 && (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
            >
              {data.allUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
          >
            {(data?.availableYears ?? [currentYear]).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <Skeleton />}
      {error && <div className="text-red-500 text-sm text-center py-8">{error}</div>}

      {!loading && !error && data && (
        <div className="space-y-4">

          {/* Timeline */}
          <YearTimeline
            year={data.year}
            totalActiveDays={data.hero.totalActiveDays}
            totalDaysElapsed={data.hero.totalDaysElapsed}
          />

          {/* Hero stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Total distance"
              value={`${data.hero.totalDistanceKm.toLocaleString()} km`}
            />
            <StatCard
              label="Training time"
              value={`${data.hero.totalTrainingHours.toLocaleString()} h`}
            />
            <StatCard
              label="Total RES"
              value={data.hero.totalRES.toLocaleString()}
            />
          </div>

          {/* Section 1 — Volume & Distance */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <SectionHeader icon="📏" title="Volume & Distance" open={openSections[1]} onToggle={() => toggleSection(1)} />
            {openSections[1] && (
              <div className="space-y-6 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <BigStat
                    label="Total distance"
                    value={`${data.hero.totalDistanceKm.toLocaleString()} km`}
                    insight={data.hero.totalDistanceKm > 0
                      ? `That's ${(data.hero.totalDistanceKm / 300).toFixed(1)}× the length of Belgium`
                      : undefined}
                  />
                  <BigStat
                    label="Total elevation"
                    value={`${data.volume.totalElevationM.toLocaleString()} m`}
                    insight={data.volume.totalElevationM > 0
                      ? `${(data.volume.totalElevationM / 8849).toFixed(2)} Everests climbed`
                      : undefined}
                  />
                  <BigStat
                    label="Avg session"
                    value={`${data.volume.avgDurationMins} min`}
                    insight={`Your sweet spot is right around ${data.volume.avgDurationMins} minutes`}
                  />
                </div>

                {data.volume.distancePerSport.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Distance by sport</p>
                    <HorizontalBarChart data={data.volume.distancePerSport} valueKey="km" labelKey="sport" unit="km" />
                  </div>
                )}

                {data.volume.timePerSport.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Time by sport</p>
                    <HorizontalBarChart data={data.volume.timePerSport} valueKey="hours" labelKey="sport" unit="h" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2 — Effort & Intensity */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <SectionHeader icon="🔥" title="Effort & Intensity" open={openSections[2]} onToggle={() => toggleSection(2)} />
            {openSections[2] && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <BigStat
                  label="Projected yearly RES"
                  value={Math.round(data.effort.projectedYearlyRES).toLocaleString()}
                  insight={`On track for ${Math.round(data.effort.projectedYearlyRES).toLocaleString()} RES by end of year`}
                />
                {data.effort.avgHR !== null && (
                  <BigStat
                    label="Average heart rate"
                    value={`${data.effort.avgHR} bpm`}
                    insight="Average across all activities with HR data"
                  />
                )}
                {data.effort.highestHR && (
                  <BigStat
                    label="Highest avg HR"
                    value={`${data.effort.highestHR.hr} bpm`}
                    insight={`Your hardest session: ${data.effort.highestHR.sport} on ${format(new Date(data.effort.highestHR.date), 'd MMM')}`}
                  />
                )}
                {data.effort.mostIntenseWeek && (
                  <BigStat
                    label="Most intense week"
                    value={`${data.effort.mostIntenseWeek.res} RES`}
                    insight={`Week of ${data.effort.mostIntenseWeek.start} – ${data.effort.mostIntenseWeek.end}`}
                  />
                )}
                {data.effort.mostIntenseMonth !== null && (
                  <BigStat
                    label="Most intense month"
                    value={MONTH_NAMES[data.effort.mostIntenseMonth.month]}
                    insight={`${data.effort.mostIntenseMonth.res} RES`}
                  />
                )}
              </div>
            )}
          </div>

          {/* Section 3 — Consistency & Streaks */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <SectionHeader icon="📅" title="Consistency & Streaks" open={openSections[3]} onToggle={() => toggleSection(3)} />
            {openSections[3] && (
              <div className="space-y-6 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {data.consistency.longestStreak ? (
                    <BigStat
                      label="Longest streak"
                      value={`${data.consistency.longestStreak.days} days`}
                      insight={`${data.consistency.longestStreak.days} days straight, from ${data.consistency.longestStreak.start} to ${data.consistency.longestStreak.end}`}
                    />
                  ) : (
                    <BigStat label="Longest streak" value="—" />
                  )}
                  {data.consistency.mostActiveMonth !== null ? (
                    <BigStat
                      label="Most active month"
                      value={MONTH_NAMES[data.consistency.mostActiveMonth]}
                      insight={`${data.consistency.activeDaysPerMonth[data.consistency.mostActiveMonth]} active days`}
                    />
                  ) : (
                    <BigStat label="Most active month" value="—" />
                  )}
                  {data.consistency.mostActiveDayOfWeek !== null ? (
                    <BigStat
                      label="Favourite day"
                      value={DAY_NAMES[data.consistency.mostActiveDayOfWeek]}
                      insight={`You love a ${DAY_NAMES[data.consistency.mostActiveDayOfWeek]} session`}
                    />
                  ) : (
                    <BigStat label="Favourite day" value="—" />
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Active days per month</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      data={MONTH_NAMES.map((name, i) => ({
                        name,
                        days: data.consistency.activeDaysPerMonth[i],
                        future: year === currentYear && i > nowMonth,
                      }))}
                      margin={{ top: 16, right: 0, left: -20, bottom: 0 }}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Bar dataKey="days" radius={[4, 4, 0, 0]}>
                        {MONTH_NAMES.map((_, i) => {
                          const isFuture = year === currentYear && i > nowMonth
                          return <Cell key={i} fill={ACCENT} opacity={isFuture ? 0.2 : 1} />
                        })}
                        <LabelList
                          dataKey="days"
                          position="top"
                          style={{ fontSize: 11, fill: '#9ca3af' }}
                          formatter={(v: number) => v > 0 ? v : ''}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Section 4 — Social & Group */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <SectionHeader icon="🤝" title="Social & Group" open={openSections[4]} onToggle={() => toggleSection(4)} />
            {openSections[4] && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <BigStat
                  label="Pacepact group activities"
                  value={String(data.social.totalJointActivities)}
                  insight={
                    data.social.totalActivityCount > 0
                      ? `${data.social.totalJointActivities} of your ${data.social.totalActivityCount} activities were done with the pacepact group`
                      : 'No activities yet'
                  }
                />
                <BigStat
                  label="Top pacepact training partner"
                  value={data.social.topPartner?.name ?? '—'}
                  insight={data.social.topPartner
                    ? `You and ${data.social.topPartner.name} trained together ${data.social.topPartner.count} times`
                    : 'No joint activities detected yet'}
                />
                <BigStat
                  label="Top fan"
                  value={data.social.topFan?.name ?? '—'}
                  insight={data.social.topFan
                    ? `${data.social.topFan.name} gave you ${data.social.topFan.count} kudos — your biggest supporter`
                    : 'Kudos data syncs overnight'}
                />
              </div>
            )}
          </div>

          {/* Section 5 — Fun & Quirky */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <SectionHeader icon="🎉" title="Fun & Quirky" open={openSections[5]} onToggle={() => toggleSection(5)} />
            {openSections[5] && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <BigStat
                  label="Blaarmeersen swims 🏊"
                  value={data.fun.blaarmeersen ? String(data.fun.blaarmeersen.count) : '0'}
                  insight={data.fun.blaarmeersen ? undefined : 'No qualifying swims yet this year'}
                />
                <BigStat
                  label="First Blaarmeersen swim"
                  value={data.fun.blaarmeersen?.first ?? '—'}
                />
                <BigStat
                  label="Latest Blaarmeersen swim"
                  value={data.fun.blaarmeersen?.last ?? '—'}
                />
                <BigStat
                  label="Longest activity by distance"
                  value={data.fun.longestByDistance ? `${data.fun.longestByDistance.km} km` : '—'}
                  insight={data.fun.longestByDistance
                    ? `${data.fun.longestByDistance.sport} on ${format(new Date(data.fun.longestByDistance.date), 'd MMM')}`
                    : undefined}
                />
                <BigStat
                  label="Longest activity by duration"
                  value={data.fun.longestByDuration ? `${data.fun.longestByDuration.hours} h` : '—'}
                  insight={data.fun.longestByDuration
                    ? `${data.fun.longestByDuration.sport} on ${format(new Date(data.fun.longestByDuration.date), 'd MMM')}`
                    : undefined}
                />
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
