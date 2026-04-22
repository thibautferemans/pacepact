import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import CompetitionsGrid from './CompetitionsGrid'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const { data: competitions } = await supabase
    .from('competitions')
    .select('*')
    .order('status')
    .order('start_date')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Competitions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back, {session.user.name?.split(' ')[0]}
        </p>
      </div>
      <CompetitionsGrid
        competitions={competitions ?? []}
        currentUserId={session.user.id}
      />
    </div>
  )
}
