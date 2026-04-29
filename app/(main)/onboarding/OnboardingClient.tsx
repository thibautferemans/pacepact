'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Logo from '@/components/Logo'

const STEPS = ['connect', 'importing', 'threshold', 'follow'] as const
type Step = typeof STEPS[number]

export default function OnboardingClient() {
  const { data: session } = useSession()
  const params = useSearchParams()
  const [step, setStep] = useState<Step>('connect')
  const [thresholdHr, setThresholdHr] = useState(175)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Backfill progress state
  const [totalActivities, setTotalActivities] = useState(0)
  const [kudosOffset, setKudosOffset] = useState(0)
  const [jointOffset, setJointOffset] = useState(0)
  const [backfillDone, setBackfillDone] = useState(false)

  useEffect(() => {
    const stepParam = params.get('step') as Step
    const stravaJustConnected = params.get('strava') === 'connected'
    const stravaConnected = stravaJustConnected || session?.user.stravaConnected

    if (stepParam && STEPS.includes(stepParam)) {
      setStep(stepParam)
    } else if (stravaJustConnected) {
      // Fresh OAuth — go to importing step
      setStep('importing')
    } else if (stravaConnected) {
      setStep('threshold')
    }
  }, [params, session])

  // Auto-run backfill batches while on the importing step
  useEffect(() => {
    if (step !== 'importing') return

    let cancelled = false

    async function runBackfill() {
      // Get initial state
      const statusRes = await fetch('/api/strava/backfill')
      if (!statusRes.ok || cancelled) return
      const status = await statusRes.json()

      if (status.backfillComplete) { setBackfillDone(true); return }

      setTotalActivities(status.totalActivities)
      setKudosOffset(status.kudosOffset)
      setJointOffset(status.jointOffset)

      let kudosDone = !status.totalActivities || status.kudosOffset >= status.totalActivities
      let jointDone = !status.totalActivities || status.jointOffset >= status.totalActivities

      // Run kudos batches
      while (!kudosDone && !cancelled) {
        const res = await fetch('/api/strava/backfill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'kudos' }),
        })
        if (!res.ok || cancelled) break
        const data = await res.json()
        setKudosOffset(data.offset)
        kudosDone = !data.hasMore
        if (!kudosDone) await new Promise((r) => setTimeout(r, 1000))
      }

      // Run joint batches
      while (!jointDone && !cancelled) {
        const res = await fetch('/api/strava/backfill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'joint' }),
        })
        if (!res.ok || cancelled) break
        const data = await res.json()
        setJointOffset(data.offset)
        jointDone = !data.hasMore
        if (!jointDone) await new Promise((r) => setTimeout(r, 1000))
      }

      if (!cancelled) setBackfillDone(true)
    }

    runBackfill()
    return () => { cancelled = true }
  }, [step])

  async function saveThreshold() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/user/threshold', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold_hr: thresholdHr }),
    })
    if (!res.ok) {
      setError('Failed to save. Please try again.')
      setSaving(false)
      return
    }
    setSaving(false)
    setStep('follow')
  }

  function finish() {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="lg" />
          <div className="flex justify-center gap-2 mt-6">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 w-12 rounded-full transition-colors ${
                  STEPS.indexOf(step) >= i ? 'bg-[#185FA5]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          {step === 'connect' && (
            <div className="text-center">
              <div className="text-4xl mb-4">🏃</div>
              <h2 className="text-xl font-semibold mb-2">Connect Strava</h2>
              <p className="text-gray-500 text-sm mb-6">
                pacepact syncs your activities from Strava to calculate your RES score.
                Click below to authorise access.
              </p>
              {params.get('error') && (
                <p className="text-red-500 text-sm mb-4">
                  {params.get('error') === 'strava_denied'
                    ? 'You denied access. Please try again.'
                    : 'Strava connection failed. Please try again.'}
                </p>
              )}
              <a
                href="/api/strava/connect"
                className="inline-block px-6 py-3 bg-[#FC4C02] text-white rounded-lg font-medium text-sm hover:bg-[#e04300] transition-colors"
              >
                Connect with Strava
              </a>
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center">
              <div className="text-4xl mb-4">📥</div>
              <h2 className="text-xl font-semibold mb-2">Importing your Strava history</h2>
              <p className="text-gray-500 text-sm mb-6">
                We're syncing your kudos and joint activities since Jan 2025.
                This takes a couple of minutes — hang tight!
              </p>

              {totalActivities > 0 && (
                <div className="space-y-3 mb-6 text-left">
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Kudos</span>
                      <span>{Math.min(kudosOffset, totalActivities)} / {totalActivities}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#185FA5] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (kudosOffset / totalActivities) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Joint activities</span>
                      <span>{Math.min(jointOffset, totalActivities)} / {totalActivities}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#185FA5] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (jointOffset / totalActivities) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {!backfillDone && totalActivities === 0 && (
                <div className="flex justify-center mb-6">
                  <div className="w-6 h-6 border-2 border-[#185FA5] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              <button
                onClick={() => setStep('threshold')}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  backfillDone
                    ? 'bg-[#185FA5] text-white hover:bg-[#145088]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!backfillDone}
              >
                {backfillDone ? 'Continue →' : 'Importing…'}
              </button>

              {!backfillDone && (
                <button
                  onClick={() => setStep('threshold')}
                  className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Skip — finish in the background
                </button>
              )}
            </div>
          )}

          {step === 'threshold' && (
            <div>
              <div className="text-4xl mb-4 text-center">❤️</div>
              <h2 className="text-xl font-semibold mb-2 text-center">Set Your Threshold HR</h2>
              <p className="text-gray-500 text-sm mb-6 text-center">
                Your lactate threshold heart rate is used to calculate Tier 1 (HR-based) scores.
                A typical value is 170–185 bpm. You can update this later in settings.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Threshold HR (bpm)
              </label>
              <input
                type="number"
                value={thresholdHr}
                onChange={(e) => setThresholdHr(Number(e.target.value))}
                min={100}
                max={250}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] mb-2"
              />
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <button
                onClick={saveThreshold}
                disabled={saving}
                className="w-full py-2.5 bg-[#185FA5] text-white rounded-lg text-sm font-medium hover:bg-[#145088] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save & continue'}
              </button>
            </div>
          )}

          {step === 'follow' && (
            <div className="text-center">
              <div className="text-4xl mb-4">🤝</div>
              <h2 className="text-xl font-semibold mb-2">Follow Your Crew on Strava</h2>
              <p className="text-gray-500 text-sm mb-4">
                pacepact detects joint activities (e.g. group runs or swims) automatically.
                For this to work, <strong>you must follow all other pacepact members on Strava</strong>,
                and they must follow you back.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Once both parties follow each other, Strava will match your activities and
                pacepact will award the social bonus 🤝 to both.
              </p>
              <button
                onClick={finish}
                className="w-full py-2.5 bg-[#185FA5] text-white rounded-lg text-sm font-medium hover:bg-[#145088]"
              >
                Get started →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
