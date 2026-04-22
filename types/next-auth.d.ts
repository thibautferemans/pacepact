import NextAuth, { DefaultSession } from 'next-auth'
import { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'admin' | 'member'
      stravaConnected: boolean
      onboardingComplete: boolean
    } & DefaultSession['user']
  }

  interface User {
    id: string
    role: 'admin' | 'member'
    stravaConnected: boolean
    onboardingComplete: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'admin' | 'member'
    stravaConnected: boolean
    onboardingComplete: boolean
  }
}
