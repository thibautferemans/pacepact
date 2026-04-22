'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const SPORT_COLOURS: Record<string, string> = {
  Running: '#185FA5',
  Swimming: '#1E7BC4',
  Cycling: '#5BA3D4',
  Strength: '#A3C8E8',
  Hiking: '#D1E5F5',
}

const ALL_SPORTS = ['Running', 'Swimming', 'Cycling', 'Strength', 'Hiking']

interface DataRow {
  name: string
  [sport: string]: number | string
}

export default function SportBreakdownChart({
  activities,
}: {
  activities: Array<{
    user_id: string
    sport: string
    total_score: number
    user?: { name: string }
  }>
}) {
  // Build data keyed by user
  const userMap: Record<string, { name: string; [sport: string]: number | string }> = {}

  for (const a of activities) {
    const name = (a.user as any)?.name ?? a.user_id
    if (!userMap[a.user_id]) {
      userMap[a.user_id] = { name }
      ALL_SPORTS.forEach((s) => { userMap[a.user_id][s] = 0 })
    }
    const curr = (userMap[a.user_id][a.sport] as number) ?? 0
    userMap[a.user_id][a.sport] = curr + (a.total_score ?? 0)
  }

  const data: DataRow[] = Object.values(userMap)

  if (!data.length) return <p className="text-gray-400 text-sm text-center py-8">No data</p>

  const activeSports = ALL_SPORTS.filter((s) => data.some((d) => (d[s] as number) > 0))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number, name: string) => [Math.round(value * 10) / 10, name]}
        />
        <Legend />
        {activeSports.map((sport) => (
          <Bar key={sport} dataKey={sport} stackId="a" fill={SPORT_COLOURS[sport] ?? '#ccc'} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
