'use client'

import { useEffect, useState } from 'react'
import { Activity } from '@/types'
import { format } from 'date-fns'

const SPORT_ICONS: Record<string, string> = {
  Running: '🏃',
  Swimming: '🏊',
  Cycling: '🚴',
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function ScoreBadge({ activity }: { activity: Activity }) {
  const res = Math.round(activity.res_score)
  const tier = activity.score_tier
  const warn = tier >= 2 ? ' ⚠️' : ''

  if (activity.is_joint && activity.social_bonus > 0) {
    return (
      <span className="font-mono text-sm">
        {res}
        <span className="text-[#185FA5] font-semibold"> + {activity.social_bonus} 🤝</span>
      </span>
    )
  }
  return (
    <span className="font-mono text-sm text-gray-800">
      {res}{warn}
    </span>
  )
}

export default function ActivityFeed({
  competitionId,
  limit = 30,
}: {
  competitionId?: string
  limit?: number
}) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (competitionId) params.set('competition_id', competitionId)
    fetch(`/api/activities?${params}`)
      .then((r) => r.json())
      .then((data) => { setActivities(data); setLoading(false) })
  }, [competitionId, limit])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (!activities.length) {
    return <p className="text-gray-400 text-sm py-8 text-center">No activities yet</p>
  }

  return (
    <div className="space-y-2">
      {activities.map((a) => (
        <div
          key={a.id}
          className="bg-white rounded-lg px-4 py-3 flex items-center gap-3 border border-gray-100"
        >
          <span className="text-xl shrink-0">{SPORT_ICONS[a.sport] ?? '🏅'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-sm text-gray-900 truncate">
                {(a.user as any)?.name ?? 'Unknown'}
              </span>
              <span className="text-xs text-gray-400">{a.sport}</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {format(new Date(a.recorded_at), 'd MMM, HH:mm')}
              {a.distance_m ? ` · ${(a.distance_m / 1000).toFixed(1)} km` : ''}
              {' · '}{formatDuration(a.duration_secs)}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <ScoreBadge activity={a} />
          </div>
        </div>
      ))}
    </div>
  )
}
