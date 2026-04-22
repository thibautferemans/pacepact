'use client'

export default function IndividualTeamTabs({
  activeTab,
  onChange,
  showTeam = true,
}: {
  activeTab: 'individual' | 'team'
  onChange: (tab: 'individual' | 'team') => void
  showTeam?: boolean
}) {
  if (!showTeam) return null

  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
      {(['individual', 'team'] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeTab === tab
              ? 'bg-white text-[#185FA5] shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  )
}
