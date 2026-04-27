'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import Logo from './Logo'

const SPORT_ICONS: Record<string, string> = {
  Running: '🏃',
  Swimming: '🏊',
  Cycling: '🚴',
}

export default function Navbar({ hasMainComp, showYearInReview }: { hasMainComp?: boolean; showYearInReview?: boolean }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  const navLinks = [
    { href: '/about', label: 'How It Works' },
    { href: '/', label: 'Overview' },
    ...(hasMainComp ? [{ href: '/progress', label: 'Progress' }] : []),
    ...(showYearInReview ? [{ href: '/year-in-review', label: 'Year in Review' }] : []),
    ...(session?.user.role === 'admin' ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  async function handleSync() {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/strava/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSyncMsg(data.error ?? 'Sync failed')
        setSyncing(false)
      } else {
        setSyncMsg(`✓ Synced ${data.synced} activities`)
        setSyncing(false)
        setTimeout(() => {
          setSyncMsg('')
          window.location.reload()
        }, 1500)
      }
    } catch {
      setSyncMsg('Network error')
      setSyncing(false)
    }
  }

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <Logo />

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'text-[#185FA5] border-b-2 border-[#185FA5] pb-0.5'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {session && (
              <div className="flex items-center gap-2">
                {syncMsg && (
                  <span className={`text-xs ${syncMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                    {syncMsg}
                  </span>
                )}
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
                >
                  {syncing ? 'Syncing…' : 'Sync now'}
                </button>
              </div>
            )}
            <div className="h-8 w-8 rounded-full bg-[#E6F1FB] flex items-center justify-center text-[#185FA5] text-sm font-semibold">
              {session?.user.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded text-gray-500"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="sr-only">Menu</span>
            <div className="space-y-1">
              <span className="block w-5 h-0.5 bg-gray-600" />
              <span className="block w-5 h-0.5 bg-gray-600" />
              <span className="block w-5 h-0.5 bg-gray-600" />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block py-2 text-sm font-medium ${
                pathname === link.href ? 'text-[#185FA5]' : 'text-gray-600'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
            <span className="text-sm text-gray-500 truncate">
              {syncMsg
                ? <span className={syncMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}>{syncMsg}</span>
                : session?.user.name}
            </span>
            <div className="flex items-center gap-3 shrink-0">
              {session && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50"
                >
                  {syncing ? 'Syncing…' : 'Sync now'}
                </button>
              )}
              <button
                onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
                className="text-sm text-red-500"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
