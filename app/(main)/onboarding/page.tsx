import { Suspense } from 'react'
import OnboardingClient from './OnboardingClient'

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-page" />}>
      <OnboardingClient />
    </Suspense>
  )
}
