import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import type { UserRole } from '@prisma/client'
import type { Session } from 'next-auth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionUser {
  id: string
  email: string
  name: string | null | undefined
  image: string | null | undefined
  role: UserRole
}

// ---------------------------------------------------------------------------
// Server-side helpers (must only be called from Server Components / Route Handlers)
// ---------------------------------------------------------------------------

/**
 * Returns the current authenticated user, or null if there is no session.
 * Safe to call in any server context.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user) return null
  return mapSessionUser(session)
}

/**
 * Returns the current authenticated user.
 * Redirects to /auth/login if no session is present.
 * Use in protected Server Components or Route Handlers.
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/login')
  }
  return mapSessionUser(session)
}

/**
 * Returns the current authenticated user only when they hold the ADMIN role.
 * Redirects to /auth/login if unauthenticated, or to / (home) if authenticated
 * but not an admin.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/login')
  }

  const user = mapSessionUser(session)

  if (user.role !== 'ADMIN') {
    redirect('/')
  }

  return user
}

/**
 * Returns a typed SessionUser from the current session.
 * Returns null when no session exists.
 * Convenience wrapper that avoids repeating the null-check at call sites.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  return getCurrentUser()
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function mapSessionUser(session: Session): SessionUser {
  // After the jwt/session callbacks, these fields are guaranteed.
  const { id, email, name, image, role } = session.user as SessionUser & {
    email: string
  }

  return { id, email: email ?? '', name, image, role }
}
