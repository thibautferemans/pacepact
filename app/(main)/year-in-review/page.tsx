import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import YearInReviewClient from './YearInReviewClient'

export default async function YearInReviewPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const isAdmin = session.user.role === 'admin'

  // Check feature flag
  const { data: flagRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'feature_year_in_review')
    .maybeSingle()

  const featureEnabled = flagRow?.value === 'true'

  if (!featureEnabled && !isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Coming Soon</h1>
        <p className="text-gray-500 max-w-sm">
          Your Year in Review is being prepared. Check back later!
        </p>
      </div>
    )
  }

  return (
    <Suspense fallback={null}>
      <YearInReviewClient
        currentUserId={session.user.id}
        isAdmin={isAdmin}
      />
    </Suspense>
  )
}
