import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { supabase } from './supabase'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('email', credentials.email.toLowerCase())
          .single()

        if (!user) return null

        const isValid = await bcrypt.compare(credentials.password, user.password_hash)
        if (!isValid) return null

        const { data: stravaToken } = await supabase
          .from('strava_tokens')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle()

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          stravaConnected: !!stravaToken,
          onboardingComplete: !!stravaToken && !!user.threshold_hr,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.stravaConnected = user.stravaConnected
        token.onboardingComplete = user.onboardingComplete
      }
      // Allow session refresh to pick up DB changes
      if (trigger === 'update') {
        const { data: dbUser } = await supabase
          .from('users')
          .select('role, threshold_hr')
          .eq('id', token.id)
          .single()
        const { data: stravaToken } = await supabase
          .from('strava_tokens')
          .select('user_id')
          .eq('user_id', token.id)
          .maybeSingle()
        if (dbUser) {
          token.role = dbUser.role
          token.stravaConnected = !!stravaToken
          token.onboardingComplete = !!stravaToken && !!dbUser.threshold_hr
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'admin' | 'member'
        session.user.stravaConnected = token.stravaConnected as boolean
        session.user.onboardingComplete = token.onboardingComplete as boolean
      }
      return session
    },
  },
}
