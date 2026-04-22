'use client'

import { useState } from 'react'
import { Competition, Team } from '@/types'
import dynamic from 'next/dynamic'
import IndividualTeamTabs from '@/components/IndividualTeamTabs'
import Leaderboard from '@/components/Leaderboard'
import { format } from 'date-fns'

const SportBreakdownChart = dynamic(() => import('@/components/SportBreakdownChart'), { ssr: false })
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

const METRIC_LABELS: Record<string, string> = {
  total_res: 'RES Score',
  total_distance: 'Distance (km)',
  total_duration: 'Duration (h)',
  activity_count: 'Activities',
}

export default function CompetitionDetailClient({
  competition,
  activities,
  userNames,
  teams,
  memberships,
  hasTeamMode,
  currentUserId,
  locationMarkers,
}: {
  competition: Competition
  activities: any[]
  userNames: Record<string, string>
  teams: Team[]
  memberships: { user_id: string; team_id: string }[]
  hasTeamMode: boolean
  currentUserId: string
  locationMarkers: { lat: number; lng: number; label: string }[]
}) {
  const [tab, setTab] = useState<'individual' | 'team'>('individual')

  // Build individual leaderboard
  const userAgg: Record<string, { score: number; count: number }> = {}
  for (const a of activities) {
    if (!userAgg[a.user_id]) userAgg[a.user_id] = { score: 0, count: 0 }
    const val =
      competition.metric === 'total_res' ? (a.total_score ?? 0)
      : competition.metric === 'total_distance' ? (a.distance_m ?? 0) / 1000
      : competition.metric === 'total_duration' ? (a.duration_secs ?? 0) / 3600
      : 1
    userAgg[a.user_id].score += val
    userAgg[a.user_id].count += 1
  }

  const individualEntries = Object.entries(userAgg)
    .map(([id, d], i) => ({ id, name: userNames[id] ?? 'Unknown', score: d.score, activityCount: d.count, rank: 0 }))
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1 }))

  // Build team leaderboard
  const teamMemberMap: Record<string, string> = {}
  memberships.forEach((m) => { teamMemberMap[m.user_id] = m.team_id })

  const teamAgg: Record<string, { name: string; colour: string; score: number }> = {}
  teams.forEach((t) => { teamAgg[t.id] = { name: t.name, colour: t.colour, score: 0 } })

  for (const a of activities) {
    const teamId = teamMemberMap[a.user_id]
    if (teamId && teamAgg[teamId]) {
      const val =
        competition.metric === 'total_res' ? (a.total_score ?? 0)
        : competition.metric === 'total_distance' ? (a.distance_m ?? 0) / 1000
        : competition.metric === 'total_duration' ? (a.duration_secs ?? 0) / 3600
        : 1
      teamAgg[teamId].score += val
    }
  }

  const teamEntries = Object.entries(teamAgg)
    .map(([id, t]) => ({ id, name: t.name, colour: t.colour, score: t.score, rank: 0 }))
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1 }))

  const displayEntries = tab === 'team' && hasTeamMode ? teamEntries : individualEntries

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{competition.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {format(new Date(competition.start_date), 'd MMM')} – {format(new Date(competition.end_date), 'd MMM yyyy')}
            {' · '}{METRIC_LABELS[competition.metric]}
            {competition.sport_filter ? ` · ${competition.sport_filter} only` : ''}
          </p>
          {competition.description && (
            <p className="text-sm text-gray-600 mt-2 max-w-xl">{competition.description}</p>
          )}
        </div>
        {hasTeamMode && (
          <IndividualTeamTabs activeTab={tab} onChange={setTab} />
        )}
      </div>

      {/* Location map */}
      {competition.location_lat && competition.location_lng && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Location</h2>
          <MapView
            center={[competition.location_lat, competition.location_lng]}
            radius={competition.location_radius_m ?? 500}
            markers={locationMarkers}
            height={250}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Leaderboard</h2>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <Leaderboard
              entries={displayEntries}
              currentUserId={currentUserId}
              metric={competition.metric}
            />
          </div>
        </div>

        {/* Sport breakdown */}
        {tab === 'individual' && (
          <div>
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Sport Breakdown (RES)
            </h2>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <SportBreakdownChart activities={activities} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
