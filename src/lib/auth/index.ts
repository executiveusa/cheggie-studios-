import NextAuth, { type DefaultSession, type NextAuthConfig } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GitHubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { signInSchema } from '@/lib/security/validation'
import type { UserRole } from '@prisma/client'

// ---------------------------------------------------------------------------
// Module augmentation — extend session and JWT types
// ---------------------------------------------------------------------------

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole
    } & DefaultSession['user']
  }

  interface User {
    role: UserRole
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string
    role: UserRole
  }
}

// ---------------------------------------------------------------------------
// Build provider list — include OAuth providers only when credentials exist
// ---------------------------------------------------------------------------

function buildProviders(): NextAuthConfig['providers'] {
  const providers: NextAuthConfig['providers'] = [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            // password is stored on Account with provider = 'credentials'
          },
        })

        if (!user) return null

        // Retrieve the hashed password stored in the Account table for credentials provider
        const account = await prisma.account.findFirst({
          where: { userId: user.id, provider: 'credentials' },
          select: { access_token: true },
        })

        if (!account?.access_token) return null

        const isValid = await verifyPassword(password, account.access_token)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
        }
      },
    }),
  ]

  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    providers.push(
      GitHubProvider({
        clientId: process.env.AUTH_GITHUB_ID,
        clientSecret: process.env.AUTH_GITHUB_SECRET,
      })
    )
  }

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      })
    )
  }

  return providers
}

// ---------------------------------------------------------------------------
// NextAuth v5 config
// ---------------------------------------------------------------------------

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,   // refresh token once per day
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  providers: buildProviders(),

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On initial sign in, persist user data into the token
      if (user) {
        token.userId = user.id as string
        token.role = user.role
      }

      // Support session.update() — allow in-band role refresh
      if (trigger === 'update' && session?.role) {
        token.role = session.role as UserRole
      }

      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId
        session.user.role = token.role
      }
      return session
    },
  },

  events: {
    async createUser({ user }) {
      // Newly created OAuth users always start as USER role — enforced by schema default.
      // Nothing extra needed here, but the hook is available for future onboarding logic.
      void user
    },
  },

  debug: process.env.NODE_ENV === 'development',
}

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig)
