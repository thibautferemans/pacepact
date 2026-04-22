'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function SignupPage() {
  const router = useRouter()
  const params = useSearchParams()
  const code = params.get('code') ?? ''

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [codeValid, setCodeValid] = useState<boolean | null>(null)

  useEffect(() => {
    if (!code) { setCodeValid(false); return }

    fetch(`/api/invite/validate?code=${code}`)
      .then((r) => r.json())
      .then((d) => setCodeValid(d.valid))
      .catch(() => setCodeValid(false))
  }, [code])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, code }),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Signup failed')
      setLoading(false)
      return
    }

    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) {
      setError('Account created but sign-in failed. Please log in.')
      router.push('/login')
    } else {
      router.push('/onboarding')
    }
  }

  if (codeValid === false) {
    return (
      <div className="w-full max-w-sm text-center">
        <Logo size="lg" />
        <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-8">
          <p className="text-red-600 font-medium">Invalid or expired invite link.</p>
          <p className="text-sm text-gray-500 mt-2">
            Ask an admin to generate a new invite link.
          </p>
          <Link href="/login" className="mt-4 inline-block text-[#185FA5] text-sm hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <Logo size="lg" />
        <p className="text-gray-500 text-sm mt-2">Create your pacepact account</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {codeValid === null && (
          <p className="text-sm text-gray-400 text-center mb-4">Validating invite…</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
              placeholder="Your name"
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
              placeholder="you@example.com"
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
            disabled={loading || codeValid !== true}
            className="w-full py-2.5 bg-[#185FA5] text-white rounded-lg text-sm font-medium hover:bg-[#145088] transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-[#185FA5] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
