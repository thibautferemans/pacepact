'use client'

import { useState, useEffect } from 'react'
import { Competition, LeaderboardEntry } from '@/types'
import { format } from 'date-fns'
import Leaderboard from './Leaderboard'
import Link from 'next/link'

const METRIC_LABELS: Record<string, string> = {
  total_res: 'RES Score',
  total_distance: 'Distance (km)',
  total_duration: 'Duration (h)',
  activity_count: 'Activities',
}

export default function CompetitionCard({
  competition,
  currentUserId,
  tab,
}: {
  competition: Competition
  currentUserId: string
  tab: 'individual' | 'team'
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [expanded, setExpanded] = useState(false)

  const mode = tab === 'team' && ['team', 'both'].includes(competition.mode) ? 'team' : 'individual'

  useEffect(() => {
    fetch(`/api/competitions/${competition.id}/leaderboard?mode=${mode}`)
      .then((r) => r.json())
      .then(setEntries)
  }, [competition.id, mode])

  const myRank = entries.find((e) => e.id === currentUserId)
  const top3 = entries.slice(0, 3)
  const showMyRank = myRank && myRank.rank > 3

  if (competition.is_main) {
    return (
      <Link href={`/competition/${competition.id}`}>
        <div className="bg-[#E6F1FB] border-2 border-[#185FA5]/30 rounded-xl p-5 hover:border-[#185FA5] transition-colors cursor-pointer">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-semibold text-gray-900">{competition.name}</h3>
            <span className="text-xs bg-[#185FA5] text-white px-2 py-0.5 rounded-full">Main</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {format(new Date(competition.start_date), 'd MMM')} – {format(new Date(competition.end_date), 'd MMM yyyy')}
            {' · '}{METRIC_LABELS[competition.metric]}
          </p>
          <Leaderboard entries={top3} currentUserId={currentUserId} metric={competition.metric} compact />
          {showMyRank && (
            <div className="mt-2 text-xs text-[#185FA5] text-right">You: #{myRank.rank}</div>
          )}
        </div>
      </Link>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <button
        className="w-full text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-gray-900">{competition.name}</h3>
          <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
        <p className="text-xs text-gray-500">
          {format(new Date(competition.start_date), 'd MMM')} – {format(new Date(competition.end_date), 'd MMM yyyy')}
          {' · '}{METRIC_LABELS[competition.metric]}
          {competition.sport_filter ? ` · ${competition.sport_filter}` : ''}
          {competition.location_lat ? ' 📍' : ''}
        </p>
      </button>

      {!expanded && (
        <div className="mt-3">
          <Leaderboard entries={top3} currentUserId={currentUserId} metric={competition.metric} compact />
          {showMyRank && (
            <div className="mt-2 text-xs text-gray-500 text-right">You: #{myRank.rank}</div>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-3">
          {competition.description && (
            <p className="text-sm text-gray-600 mb-3">{competition.description}</p>
          )}
          <Leaderboard entries={entries} currentUserId={currentUserId} metric={competition.metric} />
        </div>
      )}
    </div>
  )
}
