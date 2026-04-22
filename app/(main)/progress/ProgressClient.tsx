'use client'

import { useState } from 'react'
import { Activity, Competition } from '@/types'
import dynamic from 'next/dynamic'
import IndividualTeamTabs from '@/components/IndividualTeamTabs'
import ActivityFeed from '@/components/ActivityFeed'

const CumulativeChart = dynamic(() => import('@/components/CumulativeChart'), { ssr: false })

export default function ProgressClient({
  competition,
  activities,
  userNames,
  teamNames,
  teamMap,
  hasTeamMode,
  currentUserId,
}: {
  competition: Competition
  activities: Activity[]
  userNames: Record<string, string>
  teamNames: Record<string, string>
  teamMap: Record<string, string>
  hasTeamMode: boolean
  currentUserId: string
}) {
  const [tab, setTab] = useState<'individual' | 'team'>('individual')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{competition.name}</h1>
          <p className="text-sm text-gray-500">Progress &amp; Activity Feed</p>
        </div>
        {hasTeamMode && (
          <IndividualTeamTabs activeTab={tab} onChange={setTab} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Live Feed
          </h2>
          <ActivityFeed competitionId={competition.id} limit={30} />
        </div>

        {/* Cumulative Chart */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Cumulative Score
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <CumulativeChart
              activities={activities}
              startDate={competition.start_date}
              endDate={competition.end_date}
              userNames={userNames}
              mode={tab}
              teamMap={teamMap}
              teamNames={teamNames}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
