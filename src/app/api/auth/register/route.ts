import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { signUpSchema } from '@/lib/security/validation'
import { authRateLimit } from '@/lib/security/rate-limit'
import { formatApiError, ConflictError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/telemetry/logger'
import { trackEvent } from '@/lib/telemetry/events'

function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown'
  }
  return 'unknown'
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const identifier = getClientIdentifier(req)

  const rl = await authRateLimit(identifier)
  if (!rl.success) {
    return NextResponse.json(
      formatApiError(new ValidationError('Too many requests. Please try again later.')),
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': String(rl.remaining),
          'X-RateLimit-Reset': rl.resetAt.toISOString(),
          'Retry-After': String(Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000)),
        },
      }
    )
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json(
      formatApiError(new ValidationError('Request body must be valid JSON.')),
      { status: 400 }
    )
  }

  const parsed = signUpSchema.safeParse(raw)
  if (!parsed.success) {
    const issues: Record<string, string[]> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || '_root'
      if (!issues[key]) issues[key] = []
      issues[key].push(issue.message)
    }
    return NextResponse.json(
      formatApiError(new ValidationError('Validation failed.', issues)),
      { status: 422 }
    )
  }

  const { email, name, password } = parsed.data

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json(
        formatApiError(new ConflictError('An account with this email already exists.')),
        { status: 409 }
      )
    }

    const hashedPassword = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email,
        name,
      },
      select: { id: true, email: true, name: true },
    })

    await prisma.account.create({
      data: {
        userId: user.id,
        type: 'credentials',
        provider: 'credentials',
        providerAccountId: user.id,
        access_token: hashedPassword,
      },
    })

    await prisma.workspace.create({
      data: {
        name: `${name}'s Workspace`,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
    })

    void trackEvent('auth.signup', { email: user.email }, { userId: user.id })

    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 }
    )
  } catch (err) {
    logger.error('Registration failed', err, { requestId: identifier })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}
