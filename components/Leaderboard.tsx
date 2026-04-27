'use client'

import { LeaderboardEntry } from '@/types'

const MEDALS = ['🥇', '🥈', '🥉']

function formatScore(score: number, metric: string): string {
  if (metric === 'total_distance') return `${Math.round(score)} km`
  if (metric === 'total_duration') return `${Math.round(score)} h`
  if (metric === 'activity_count') return `${Math.round(score)} acts`
  return String(Math.round(score))
}

export default function Leaderboard({
  entries,
  currentUserId,
  metric = 'total_res',
  compact = false,
}: {
  entries: LeaderboardEntry[]
  currentUserId?: string
  metric?: string
  compact?: boolean
}) {
  const displayEntries = compact ? entries.slice(0, 3) : entries

  if (!displayEntries.length) {
    return <p className="text-gray-400 text-sm py-4 text-center">No entries yet</p>
  }

  return (
    <div className="space-y-1.5">
      {displayEntries.map((entry) => {
        const isCurrentUser = entry.id === currentUserId
        const medal = MEDALS[entry.rank - 1]
        return (
          <div
            key={entry.id}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
              isCurrentUser
                ? 'bg-[#E6F1FB] border border-[#185FA5]/20'
                : 'bg-white border border-gray-100'
            }`}
          >
            <span className="w-7 text-center text-sm font-medium text-gray-400">
              {medal ?? `#${entry.rank}`}
            </span>

            {/* Team colour dot or user avatar */}
            {entry.colour ? (
              <span
                className="w-7 h-7 rounded-full shrink-0"
                style={{ backgroundColor: entry.colour }}
              />
            ) : (
              <span className="w-7 h-7 rounded-full bg-[#E6F1FB] flex items-center justify-center text-[#185FA5] text-xs font-semibold shrink-0">
                {entry.name[0]?.toUpperCase()}
              </span>
            )}

            <span className={`flex-1 text-sm font-medium ${isCurrentUser ? 'text-[#185FA5]' : 'text-gray-900'}`}>
              {entry.name}
              {isCurrentUser && <span className="text-xs text-[#185FA5]/70 ml-1">(you)</span>}
            </span>

            <span className="text-sm font-semibold text-gray-800 font-mono">
              {formatScore(entry.score, metric)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
