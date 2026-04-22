'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format, eachDayOfInterval, parseISO, startOfDay } from 'date-fns'
import { Activity } from '@/types'

const COLOURS = [
  '#185FA5', '#E85D04', '#06A77D', '#8B2FC9', '#D4A017',
  '#00A5CF', '#E63946', '#2DC653',
]

function buildCumulativeData(
  activities: Activity[],
  startDate: string,
  endDate: string,
  mode: 'individual' | 'team',
  teamMap?: Record<string, string>
) {
  const start = parseISO(startDate)
  const end = parseISO(endDate > new Date().toISOString().slice(0, 10) ? new Date().toISOString().slice(0, 10) : endDate)

  const days = eachDayOfInterval({ start, end })

  // Group by series key (user or team)
  const seriesMap: Record<string, Record<string, number>> = {}

  for (const a of activities) {
    const key = mode === 'team' && teamMap ? (teamMap[a.user_id] ?? a.user_id) : a.user_id
    const day = startOfDay(parseISO(a.recorded_at)).toISOString().slice(0, 10)
    if (!seriesMap[key]) seriesMap[key] = {}
    seriesMap[key][day] = (seriesMap[key][day] ?? 0) + (a.total_score ?? 0)
  }

  const seriesKeys = Object.keys(seriesMap)

  // Build running totals per day
  const cumulative: Record<string, number> = {}
  seriesKeys.forEach((k) => { cumulative[k] = 0 })

  return days.map((day) => {
    const dayStr = day.toISOString().slice(0, 10)
    const row: Record<string, string | number> = { date: format(day, 'd MMM') }
    seriesKeys.forEach((k) => {
      cumulative[k] += seriesMap[k][dayStr] ?? 0
      row[k] = Math.round(cumulative[k] * 10) / 10
    })
    return row
  })
}

export default function CumulativeChart({
  activities,
  startDate,
  endDate,
  userNames,
  mode = 'individual',
  teamMap,
  teamNames,
}: {
  activities: Activity[]
  startDate: string
  endDate: string
  userNames: Record<string, string>
  mode?: 'individual' | 'team'
  teamMap?: Record<string, string>
  teamNames?: Record<string, string>
}) {
  const data = buildCumulativeData(activities, startDate, endDate, mode, teamMap)
  const keys = data.length > 0 ? Object.keys(data[0]).filter((k) => k !== 'date') : []
  const nameMap = mode === 'team' && teamNames ? teamNames : userNames

  if (!activities.length) return <p className="text-gray-400 text-sm text-center py-8">No data yet</p>

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number, k: string) => [v, nameMap[k] ?? k]} />
        <Legend formatter={(k: string) => nameMap[k] ?? k} />
        {keys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={COLOURS[i % COLOURS.length]}
            strokeWidth={2}
            dot={false}
            name={nameMap[key] ?? key}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
