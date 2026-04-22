'use client'

import { useState } from 'react'
import { Competition } from '@/types'
import CompetitionCard from '@/components/CompetitionCard'
import IndividualTeamTabs from '@/components/IndividualTeamTabs'
import { format } from 'date-fns'

export default function CompetitionsGrid({
  competitions,
  currentUserId,
}: {
  competitions: Competition[]
  currentUserId: string
}) {
  const [tab, setTab] = useState<'individual' | 'team'>('individual')

  const active = competitions.filter((c) => c.status === 'active')
  const archived = competitions.filter((c) => c.status === 'archived')
  const hasTeams = active.some((c) => ['team', 'both'].includes(c.mode))

  return (
    <div>
      {hasTeams && (
        <div className="mb-6">
          <IndividualTeamTabs activeTab={tab} onChange={setTab} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((comp) => (
          <CompetitionCard
            key={comp.id}
            competition={comp}
            currentUserId={currentUserId}
            tab={tab}
          />
        ))}
      </div>

      {!active.length && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No active competitions</p>
          <p className="text-sm mt-1">Check back later or ask an admin to create one.</p>
        </div>
      )}

      {archived.length > 0 && (
        <details className="mt-10">
          <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-600">
            {archived.length} archived competition{archived.length !== 1 ? 's' : ''}
          </summary>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4 opacity-60">
            {archived.map((comp) => (
              <CompetitionCard
                key={comp.id}
                competition={comp}
                currentUserId={currentUserId}
                tab={tab}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
