import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import ProgressClient from './ProgressClient'

export default async function ProgressPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const { data: mainComp } = await supabase
    .from('competitions')
    .select('*')
    .eq('is_main', true)
    .eq('status', 'active')
    .maybeSingle()

  if (!mainComp) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">No main competition set.</p>
        <p className="text-sm mt-1">An admin needs to mark a competition as &ldquo;main&rdquo;.</p>
      </div>
    )
  }

  const { data: activities } = await supabase
    .from('activities')
    .select('*, user:user_id(id, name)')
    .gte('recorded_at', `${mainComp.start_date}T00:00:00Z`)
    .lte('recorded_at', `${mainComp.end_date}T23:59:59Z`)
    .order('recorded_at', { ascending: false })

  const { data: users } = await supabase.from('users').select('id, name')
  const { data: teams } = await supabase.from('teams').select('id, name, colour')
  const { data: memberships } = await supabase
    .from('team_memberships')
    .select('user_id, team_id')

  const userNames: Record<string, string> = {}
  users?.forEach((u) => { userNames[u.id] = u.name })

  const teamNames: Record<string, string> = {}
  teams?.forEach((t) => { teamNames[t.id] = t.name })

  const teamMap: Record<string, string> = {}
  memberships?.forEach((m) => { teamMap[m.user_id] = m.team_id })

  const hasTeamMode = ['team', 'both'].includes(mainComp.mode)

  return (
    <ProgressClient
      competition={mainComp}
      activities={activities ?? []}
      userNames={userNames}
      teamNames={teamNames}
      teamMap={teamMap}
      hasTeamMode={hasTeamMode}
      currentUserId={session.user.id}
    />
  )
}
