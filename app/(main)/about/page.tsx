import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import AboutMapSection from '@/app/about/AboutMapSection'

export const dynamic = 'force-dynamic'

export default async function AboutPage() {
  const [{ data: settings }, { data: multipliers }, { data: competitions }] = await Promise.all([
    supabase.from('settings').select('*'),
    supabase.from('sport_multipliers').select('*').order('multiplier', { ascending: false }),
    supabase.from('competitions').select('*').eq('status', 'active').order('start_date'),
  ])

  const settingsMap: Record<string, string> = {}
  settings?.forEach((s) => { settingsMap[s.key] = s.value })

  const noHrPenalty = parseFloat(settingsMap.no_hr_penalty ?? '0.7')
  const socialBonus = parseFloat(settingsMap.social_bonus_points ?? '10')

  return (
    <div className="max-w-4xl mx-auto space-y-16 py-4">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-4xl font-semibold text-gray-900 mb-4">
          Track. Score. Compete together.
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          pacepact turns your Strava activities into a structured leaderboard with a scoring
          system that rewards effort — not just distance. Train together, earn more.
        </p>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">How scoring works</h2>
        <p className="text-gray-500 mb-6">
          Every activity earns a <strong>RES score</strong> (Relative Effort Score) based on three tiers:
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="text-2xl mb-2">💚</div>
            <h3 className="font-semibold mb-1">Tier 1 — HR-based</h3>
            <p className="text-sm text-gray-500 mb-3">
              Most accurate. Requires a heart rate monitor.
            </p>
            <code className="text-xs bg-gray-50 block p-2 rounded">
              hours × (avg_HR / threshold_HR)² × 100 × multiplier
            </code>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="text-2xl mb-2">🟡 ⚠️</div>
            <h3 className="font-semibold mb-1">Tier 2 — Distance/elevation</h3>
            <p className="text-sm text-gray-500 mb-3">
              No HR recorded. Uses GPS data.
            </p>
            <code className="text-xs bg-gray-50 block p-2 rounded">
              (km + elevation×0.01) × multiplier × {noHrPenalty}
            </code>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="text-2xl mb-2">🔴 ⚠️</div>
            <h3 className="font-semibold mb-1">Tier 3 — Duration only</h3>
            <p className="text-sm text-gray-500 mb-3">
              Fallback. No HR, no GPS.
            </p>
            <code className="text-xs bg-gray-50 block p-2 rounded">
              hours × 40 × multiplier × {noHrPenalty}
            </code>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          ⚠️ appears on Tier 2 and 3 activities throughout the app. The{' '}
          <strong>×{noHrPenalty}</strong> penalty is intentionally conservative — it incentivises
          wearing a heart rate monitor.
        </p>
      </section>

      {/* Sport multipliers */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Sport multipliers</h2>
        <p className="text-sm text-gray-500 mb-4">Applied to every RES calculation.</p>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">Sport</th>
                <th className="px-5 py-3 text-right">Multiplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {multipliers?.map((m) => (
                <tr key={m.sport}>
                  <td className="px-5 py-3 font-medium text-gray-900">{m.sport}</td>
                  <td className="px-5 py-3 text-right font-mono text-[#185FA5]">×{m.multiplier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Joint activities */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Joint activities 🤝</h2>
        <p className="text-gray-500 mb-4">
          When two pacepact members do the same activity together, Strava automatically links
          them. pacepact detects this link and awards <strong>+{socialBonus} bonus points</strong>{' '}
          to both athletes, shown separately as{' '}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">142 + {socialBonus} 🤝</code>.
        </p>
        <div className="bg-[#E6F1FB] border border-[#185FA5]/20 rounded-xl p-5">
          <p className="text-sm text-[#185FA5] font-medium">
            ⚠️ Important: for joint detection to work, you must follow all other pacepact members
            on Strava, and they must follow you back.
          </p>
        </div>
      </section>

      {/* Active challenges */}
      {competitions && competitions.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Active challenges</h2>
          <div className="space-y-6">
            {competitions.map((comp) => (
              <div key={comp.id} className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-semibold text-gray-900 text-lg">{comp.name}</h3>
                  {comp.is_main && (
                    <span className="text-xs bg-[#185FA5] text-white px-2 py-0.5 rounded-full shrink-0">
                      Main
                    </span>
                  )}
                </div>
                {comp.description && (
                  <p className="text-gray-500 text-sm mb-3">{comp.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>📅 {format(new Date(comp.start_date), 'd MMM')} – {format(new Date(comp.end_date), 'd MMM yyyy')}</span>
                  {comp.sport_filter && <span>🏅 {comp.sport_filter} only</span>}
                  <span>📊 {comp.metric.replace(/_/g, ' ')}</span>
                  <span>👥 {comp.mode}</span>
                </div>

                {comp.location_lat && comp.location_lng && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-2">
                      📍 Location: within {comp.location_radius_m}m of target
                    </p>
                    <AboutMapSection
                      lat={comp.location_lat}
                      lng={comp.location_lng}
                      radius={comp.location_radius_m ?? 500}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
