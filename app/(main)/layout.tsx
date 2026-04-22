import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Read the pathname header set by middleware to avoid a redirect loop on /onboarding
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const isOnboarding = pathname.startsWith('/onboarding')

  // Check onboarding completion fresh from DB on every navigation
  const [{ data: stravaToken }, { data: user }, { data: mainComp }] = await Promise.all([
    supabase.from('strava_tokens').select('user_id').eq('user_id', session.user.id).maybeSingle(),
    supabase.from('users').select('threshold_hr').eq('id', session.user.id).single(),
    supabase.from('competitions').select('id').eq('is_main', true).eq('status', 'active').maybeSingle(),
  ])

  const onboardingComplete = !!stravaToken && !!user?.threshold_hr
  if (!onboardingComplete && !isOnboarding) redirect('/onboarding')

  // On onboarding page, render without navbar
  if (isOnboarding) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-page">
      <Navbar hasMainComp={!!mainComp} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
