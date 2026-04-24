'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import dynamic from 'next/dynamic'
import type { Competition, Team, InviteLink, SportMultiplier, Setting } from '@/types'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

type Tab = 'competitions' | 'teams' | 'users' | 'invites' | 'multipliers' | 'settings' | 'flags'

interface AdminUser {
  id: string; name: string; email: string; role: string
  stravaConnected: boolean; lastSynced: string | null; team: { id: string; name: string } | null
}

export default function AdminClient({ currentUserId }: { currentUserId: string }) {
  const [tab, setTab] = useState<Tab>('competitions')

  const TABS: { key: Tab; label: string }[] = [
    { key: 'competitions', label: 'Competitions' },
    { key: 'teams', label: 'Teams' },
    { key: 'users', label: 'Users' },
    { key: 'invites', label: 'Invite Links' },
    { key: 'multipliers', label: 'Multipliers' },
    { key: 'settings', label: 'Settings' },
    { key: 'flags', label: 'Feature Flags' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Admin Panel</h1>

      {/* Tab nav */}
      <div className="flex gap-1 flex-wrap mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-[#185FA5] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'competitions' && <CompetitionsTab />}
        {tab === 'teams' && <TeamsTab />}
        {tab === 'users' && <UsersTab currentUserId={currentUserId} />}
        {tab === 'invites' && <InvitesTab currentUserId={currentUserId} />}
        {tab === 'multipliers' && <MultipliersTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'flags' && <FeatureFlagsTab />}
      </div>
    </div>
  )
}

// ─── Competitions ─────────────────────────────────────────────────────────────
function CompetitionsTab() {
  const [comps, setComps] = useState<Competition[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Competition | null>(null)

  const load = useCallback(() => {
    fetch('/api/admin/competitions').then((r) => r.json()).then(setComps)
  }, [])

  useEffect(() => { load() }, [load])

  async function deleteComp(id: string) {
    if (!confirm('Delete this competition?')) return
    await fetch(`/api/admin/competitions/${id}`, { method: 'DELETE' })
    load()
  }

  async function toggleArchive(comp: Competition) {
    await fetch(`/api/admin/competitions/${comp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: comp.status === 'active' ? 'archived' : 'active' }),
    })
    load()
  }

  async function setMain(comp: Competition) {
    await fetch(`/api/admin/competitions/${comp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_main: true }),
    })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Competitions</h2>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="px-4 py-2 bg-[#185FA5] text-white rounded-lg text-sm font-medium hover:bg-[#145088]"
        >
          + New
        </button>
      </div>

      {(showForm || editing) && (
        <CompetitionForm
          initial={editing}
          onSave={() => { setShowForm(false); setEditing(null); load() }}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      <div className="space-y-2">
        {comps.map((c) => (
          <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{c.name}</span>
                  {c.is_main && <span className="text-xs bg-[#185FA5] text-white px-2 py-0.5 rounded-full">Main</span>}
                  {c.location_lat && <span className="text-xs text-gray-400">📍</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {format(new Date(c.start_date), 'd MMM')} – {format(new Date(c.end_date), 'd MMM yyyy')}
                  {' · '}{c.metric.replace(/_/g, ' ')}
                  {c.sport_filter ? ` · ${c.sport_filter}` : ''}
                  {' · '}{c.mode}
                </p>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                {!c.is_main && c.status === 'active' && (
                  <button onClick={() => setMain(c)} className="text-xs text-[#185FA5] hover:underline">Set main</button>
                )}
                <button onClick={() => toggleArchive(c)} className="text-xs text-gray-500 hover:underline">
                  {c.status === 'active' ? 'Archive' : 'Restore'}
                </button>
                <button onClick={() => { setEditing(c); setShowForm(false) }} className="text-xs text-gray-500 hover:underline">Edit</button>
                <button onClick={() => deleteComp(c.id)} className="text-xs text-red-500 hover:underline">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CompetitionForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Competition | null
  onSave: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    sport_filter: initial?.sport_filter ?? '',
    metric: initial?.metric ?? 'total_res',
    mode: initial?.mode ?? 'individual',
    start_date: initial?.start_date ?? '',
    end_date: initial?.end_date ?? '',
    is_main: initial?.is_main ?? false,
    location_lat: initial?.location_lat ?? null as number | null,
    location_lng: initial?.location_lng ?? null as number | null,
    location_radius_m: initial?.location_radius_m ?? 500,
    location_match_logic: initial?.location_match_logic ?? 'route',
  })
  const [saving, setSaving] = useState(false)
  const [showMap, setShowMap] = useState(!!(initial?.location_lat))

  const SPORTS = ['', 'Running', 'Swimming', 'Cycling', 'Hiking', 'Strength']

  async function handleSave() {
    setSaving(true)
    const body = {
      ...form,
      sport_filter: form.sport_filter || null,
      location_lat: showMap ? form.location_lat : null,
      location_lng: showMap ? form.location_lng : null,
      location_radius_m: showMap ? form.location_radius_m : null,
    }
    const url = initial ? `/api/admin/competitions/${initial.id}` : '/api/admin/competitions'
    const method = initial ? 'PATCH' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    onSave()
  }

  return (
    <div className="bg-[#E6F1FB] border border-[#185FA5]/20 rounded-xl p-5 mb-4">
      <h3 className="font-medium text-gray-800 mb-4">{initial ? 'Edit' : 'New'} Competition</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sport filter</label>
          <select value={form.sport_filter} onChange={(e) => setForm({ ...form, sport_filter: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
            {SPORTS.map((s) => <option key={s} value={s}>{s || 'All sports'}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Metric</label>
          <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="total_res">Total RES</option>
            <option value="total_distance">Total Distance</option>
            <option value="total_duration">Total Duration</option>
            <option value="activity_count">Activity Count</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mode</label>
          <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="individual">Individual</option>
            <option value="team">Team</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Start date *</label>
          <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">End date *</label>
          <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
        </div>
        <div className="sm:col-span-2 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_main} onChange={(e) => setForm({ ...form, is_main: e.target.checked })} />
            <span>Mark as main competition</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={showMap} onChange={(e) => setShowMap(e.target.checked)} />
            <span>Location competition</span>
          </label>
        </div>

        {showMap && (
          <div className="sm:col-span-2 space-y-3">
            <p className="text-xs text-gray-500">Click on the map to set the target location.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
                <input type="number" step="any" value={form.location_lat ?? ''}
                  onChange={(e) => setForm({ ...form, location_lat: parseFloat(e.target.value) || null })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
                <input type="number" step="any" value={form.location_lng ?? ''}
                  onChange={(e) => setForm({ ...form, location_lng: parseFloat(e.target.value) || null })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Radius (m)</label>
                <input type="number" value={form.location_radius_m ?? 500}
                  onChange={(e) => setForm({ ...form, location_radius_m: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <MapView
              center={[form.location_lat ?? 51.042599, form.location_lng ?? 3.687932]}
              radius={form.location_radius_m ?? 500}
              height={250}
              onMapClick={(lat, lng) => setForm({ ...form, location_lat: lat, location_lng: lng })}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-[#185FA5] text-white rounded-lg text-sm font-medium disabled:opacity-60">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-gray-600 text-sm hover:text-gray-800">Cancel</button>
      </div>
    </div>
  )
}

// ─── Teams ────────────────────────────────────────────────────────────────────
function TeamsTab() {
  const [teams, setTeams] = useState<any[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamColour, setNewTeamColour] = useState('#185FA5')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/admin/teams').then((r) => r.json()),
      fetch('/api/admin/users').then((r) => r.json()),
    ]).then(([t, u]) => { setTeams(t); setUsers(u) })
  }, [])

  useEffect(() => { load() }, [load])

  async function createTeam() {
    if (!newTeamName.trim()) return
    setSaving(true)
    await fetch('/api/admin/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTeamName, colour: newTeamColour }),
    })
    setNewTeamName(''); setSaving(false); load()
  }

  async function assignMember(teamId: string, currentMembers: string[], userId: string, add: boolean) {
    const memberIds = add ? [...currentMembers, userId] : currentMembers.filter((id) => id !== userId)
    await fetch(`/api/admin/teams/${teamId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds }),
    })
    load()
  }

  async function deleteTeam(id: string) {
    if (!confirm('Delete this team?')) return
    await fetch(`/api/admin/teams/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Teams</h2>
      </div>

      {/* Create team */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4 flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Team name</label>
          <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Team Alpha"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-48" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Colour</label>
          <input type="color" value={newTeamColour} onChange={(e) => setNewTeamColour(e.target.value)}
            className="h-9 w-16 border border-gray-200 rounded-lg cursor-pointer" />
        </div>
        <button onClick={createTeam} disabled={saving}
          className="px-4 py-2 bg-[#185FA5] text-white rounded-lg text-sm font-medium">
          Create team
        </button>
      </div>

      <div className="space-y-3">
        {teams.map((team) => {
          const memberIds = (team.members ?? []).map((m: any) => m?.id).filter(Boolean)
          return (
            <div key={team.id} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: team.colour }} />
                  <span className="font-medium text-gray-900">{team.name}</span>
                  <span className="text-xs text-gray-400">{memberIds.length} member{memberIds.length !== 1 ? 's' : ''}</span>
                </div>
                <button onClick={() => deleteTeam(team.id)} className="text-xs text-red-500 hover:underline">Delete</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {users.map((u) => {
                  const isMember = memberIds.includes(u.id)
                  const inOtherTeam = !isMember && teams.some((t) => t.id !== team.id &&
                    (t.members ?? []).some((m: any) => m?.id === u.id))
                  return (
                    <button
                      key={u.id}
                      disabled={inOtherTeam}
                      onClick={() => assignMember(team.id, memberIds, u.id, !isMember)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        isMember
                          ? 'bg-[#185FA5] text-white border-[#185FA5]'
                          : inOtherTeam
                          ? 'text-gray-300 border-gray-200 cursor-not-allowed'
                          : 'text-gray-600 border-gray-200 hover:border-[#185FA5] hover:text-[#185FA5]'
                      }`}
                    >
                      {u.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Users ────────────────────────────────────────────────────────────────────
function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([])

  const load = useCallback(() => {
    fetch('/api/admin/users').then((r) => r.json()).then(setUsers)
  }, [])

  useEffect(() => { load() }, [load])

  async function removeUser(id: string) {
    if (!confirm('Remove this user and all their data?')) return
    await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <h2 className="font-semibold text-gray-800 mb-4">Users ({users.length})</h2>
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Strava</th>
              <th className="px-4 py-3 text-left">Team</th>
              <th className="px-4 py-3 text-left">Last sync</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className={u.id === currentUserId ? 'bg-[#E6F1FB]/50' : ''}>
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-[#185FA5] text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">{u.stravaConnected ? '✅' : '❌'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.team?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {u.lastSynced ? format(new Date(u.lastSynced), 'd MMM HH:mm') : '—'}
                </td>
                <td className="px-4 py-3">
                  {u.id !== currentUserId && (
                    <button onClick={() => removeUser(u.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Invite Links ─────────────────────────────────────────────────────────────
function InvitesTab({ currentUserId }: { currentUserId: string }) {
  const [invites, setInvites] = useState<any[]>([])
  const [expiryHours, setExpiryHours] = useState(72)
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    fetch('/api/admin/invite').then((r) => r.json()).then(setInvites)
  }, [])

  useEffect(() => { load() }, [load])

  async function createInvite() {
    setCreating(true)
    await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresInHours: expiryHours }),
    })
    setCreating(false); load()
  }

  async function revokeInvite(id: string) {
    await fetch(`/api/admin/invite/${id}`, { method: 'DELETE' })
    load()
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Invite Links</h2>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4 flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Expires in (hours)</label>
          <input type="number" value={expiryHours} min={1} max={720}
            onChange={(e) => setExpiryHours(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-24" />
        </div>
        <button onClick={createInvite} disabled={creating}
          className="px-4 py-2 bg-[#185FA5] text-white rounded-lg text-sm font-medium disabled:opacity-60">
          Generate link
        </button>
      </div>

      <div className="space-y-2">
        {invites.map((inv) => {
          const expired = new Date(inv.expires_at) < new Date()
          const used = !!inv.used_by
          const url = `${baseUrl}/signup?code=${inv.code}`
          return (
            <div key={inv.id} className={`bg-white border rounded-xl p-4 ${used || expired ? 'opacity-60' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {used && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Used</span>}
                    {!used && expired && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Expired</span>}
                    {!used && !expired && <span className="text-xs bg-blue-100 text-[#185FA5] px-2 py-0.5 rounded-full">Active</span>}
                    <span className="text-xs text-gray-500">
                      Expires {format(new Date(inv.expires_at), 'd MMM yyyy, HH:mm')}
                    </span>
                  </div>
                  {!used && !expired && (
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded truncate max-w-xs">{url}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(url)}
                        className="text-xs text-[#185FA5] hover:underline shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                  {used && inv.usedBy && (
                    <p className="text-xs text-gray-400 mt-1">Used by {inv.usedBy.name ?? inv.usedBy.email}</p>
                  )}
                </div>
                {!used && (
                  <button onClick={() => revokeInvite(inv.id)} className="text-xs text-red-500 hover:underline shrink-0">Revoke</button>
                )}
              </div>
            </div>
          )
        })}
        {!invites.length && <p className="text-gray-400 text-sm text-center py-8">No invite links yet</p>}
      </div>
    </div>
  )
}

// ─── Multipliers ──────────────────────────────────────────────────────────────
function MultipliersTab() {
  const [multipliers, setMultipliers] = useState<SportMultiplier[]>([])
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/multipliers').then((r) => r.json()).then((data) => {
      setMultipliers(data)
      const d: Record<string, string> = {}
      data.forEach((m: SportMultiplier) => { d[m.sport] = String(m.multiplier) })
      setDraft(d)
    })
  }, [])

  async function save() {
    setSaving(true)
    const updates = Object.entries(draft).map(([sport, multiplier]) => ({
      sport, multiplier: parseFloat(multiplier),
    }))
    await fetch('/api/admin/multipliers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Sport Multipliers</h2>
        <p className="text-xs text-gray-400">Saving triggers retroactive recalculation</p>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-3">
        {multipliers.map((m) => (
          <div key={m.sport} className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 w-24">{m.sport}</label>
            <input
              type="number" step="0.1" min="0" max="10"
              value={draft[m.sport] ?? m.multiplier}
              onChange={(e) => setDraft({ ...draft, [m.sport]: e.target.value })}
              className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        ))}
        <div className="pt-2">
          <button onClick={save} disabled={saving}
            className="px-4 py-2 bg-[#185FA5] text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {saved ? '✓ Saved & recalculated' : saving ? 'Saving…' : 'Save multipliers'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings').then((r) => r.json()).then((data: Setting[]) => {
      const m: Record<string, string> = {}
      data.forEach((s) => { m[s.key] = s.value })
      setSettings(m)
    })
  }, [])

  const FIELDS = [
    { key: 'no_hr_penalty', label: 'No-HR Penalty', hint: 'Multiplier for Tier 2/3 (e.g. 0.7 = 70%)' },
    { key: 'fallback_intensity', label: 'Fallback Intensity', hint: 'Used in Tier 3 (duration × this × multiplier × penalty)' },
    { key: 'social_bonus_points', label: 'Social Bonus Points', hint: 'Bonus added to both users on a joint activity' },
  ]

  async function save() {
    setSaving(true)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Global Settings</h2>
        <p className="text-xs text-gray-400">Saving triggers retroactive recalculation</p>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
            <input
              type="number" step="any"
              value={settings[f.key] ?? ''}
              onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
              className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">{f.hint}</p>
          </div>
        ))}
        <div className="pt-2">
          <button onClick={save} disabled={saving}
            className="px-4 py-2 bg-[#185FA5] text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {saved ? '✓ Saved & recalculated' : saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Feature Flags ────────────────────────────────────────────────────────────
function FeatureFlagsTab() {
  const [flags, setFlags] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetch('/api/admin/settings').then((r) => r.json()).then((data: Setting[]) => {
      const m: Record<string, string> = {}
      data.forEach((s) => { m[s.key] = s.value })
      setFlags(m)
    })
  }

  useEffect(() => { load() }, [])

  async function toggleFlag(key: string, current: string) {
    setSaving(true)
    const newValue = current === 'true' ? 'false' : 'true'
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: newValue }),
    })
    setSaving(false)
    load()
  }

  const FLAG_DEFS = [
    {
      key: 'feature_year_in_review',
      label: 'Year in Review',
      description: 'When enabled, all users can see their personal Year in Review page. When disabled, only admins can access it.',
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Feature Flags</h2>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        {FLAG_DEFS.map((f) => {
          const enabled = flags[f.key] === 'true'
          return (
            <div key={f.key} className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{f.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{f.description}</p>
              </div>
              <button
                onClick={() => toggleFlag(f.key, flags[f.key] ?? 'false')}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 ${
                  enabled ? 'bg-[#185FA5]' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={enabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
