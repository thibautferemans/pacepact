'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

export default function SetupPage() {
  const router = useRouter()
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const [name, setName] = useState('Thibaut')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/setup')
      .then((r) => r.json())
      .then((d) => setNeedsSetup(d.needsSetup))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Setup failed')
      setLoading(false)
      return
    }

    router.push('/login?setup=done')
  }

  if (needsSetup === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  if (!needsSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page px-4">
        <div className="text-center">
          <Logo size="lg" />
          <p className="text-gray-500 mt-4">Setup already completed.</p>
          <a href="/login" className="mt-4 inline-block text-[#185FA5] hover:underline text-sm">
            Go to login →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo size="lg" />
          <p className="text-gray-500 text-sm mt-2">Initial setup — create first admin</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
                placeholder="Min. 8 characters"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#185FA5] text-white rounded-lg text-sm font-medium hover:bg-[#145088] disabled:opacity-60"
            >
              {loading ? 'Setting up…' : 'Create admin account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
