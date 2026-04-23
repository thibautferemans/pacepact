import type { Metadata } from 'next'
import './globals.css'
import SessionProvider from '@/components/SessionProvider'

export const metadata: Metadata = {
  title: 'pacepact',
  description: 'Track, score, and compete with your crew.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 110 100'><text y='.9em' font-size='90'>🩷</text></svg>",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
