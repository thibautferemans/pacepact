import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { redirect, notFound } from 'next/navigation'
import CompetitionDetailClient from './CompetitionDetailClient'
import { activityMatchesLocation } from '@/lib/location'

export default async function CompetitionDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const { data: comp } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!comp) notFound()

  // Fetch activities within competition window
  let query = supabase
    .from('activities')
    .select('*, user:user_id(id, name)')
    .gte('recorded_at', `${comp.start_date}T00:00:00Z`)
    .lte('recorded_at', `${comp.end_date}T23:59:59Z`)

  if (comp.sport_filter) {
    query = query.eq('sport', comp.sport_filter)
  }

  const { data: rawActivities } = await query
  let activities = rawActivities ?? []

  // Location filter
  let locationMarkers: { lat: number; lng: number; label: string }[] = []
  if (comp.location_lat && comp.location_lng && comp.location_radius_m) {
    activities = activities.filter((a: any) =>
      activityMatchesLocation(
        a,
        comp.location_lat,
        comp.location_lng,
        comp.location_radius_m,
        comp.location_match_logic ?? 'route'
      )
    )
    locationMarkers = activities
      .filter((a: any) => a.start_lat && a.start_lng)
      .map((a: any) => ({
        lat: a.start_lat,
        lng: a.start_lng,
        label: `${(a.user as any)?.name ?? 'User'} – ${a.sport}`,
      }))
  }

  const [{ data: users }, { data: teams }, { data: memberships }] = await Promise.all([
    supabase.from('users').select('id, name'),
    supabase.from('teams').select('id, name, colour'),
    supabase.from('team_memberships').select('user_id, team_id'),
  ])

  const userNames: Record<string, string> = {}
  users?.forEach((u) => { userNames[u.id] = u.name })

  const hasTeamMode = ['team', 'both'].includes(comp.mode)

  return (
    <CompetitionDetailClient
      competition={comp}
      activities={activities}
      userNames={userNames}
      teams={teams ?? []}
      memberships={memberships ?? []}
      hasTeamMode={hasTeamMode}
      currentUserId={session.user.id}
      locationMarkers={locationMarkers}
    />
  )
}
