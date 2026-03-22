import { NextRequest, NextResponse } from 'next/server'
import type { ZodSchema, ZodError } from 'zod'
import { auth } from '@/lib/auth'
import type { RateLimitResult } from '@/lib/security/rate-limit'
import { formatApiError, AuthError, ValidationError } from '@/lib/errors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApiHandler<TBody = unknown> = (
  req: NextRequest,
  context: ApiContext<TBody>
) => Promise<NextResponse> | NextResponse

export interface ApiContext<TBody = unknown> {
  userId: string
  body: TBody
}

export type AuthenticatedHandler = (
  req: NextRequest,
  userId: string
) => Promise<NextResponse> | NextResponse

export type ValidatedHandler<TBody> = (
  req: NextRequest,
  body: TBody
) => Promise<NextResponse> | NextResponse

export type RateLimitedHandler = (
  req: NextRequest
) => Promise<NextResponse> | NextResponse

export interface CreateApiHandlerOptions<TBody> {
  /** Zod schema used to validate the request body. */
  schema?: ZodSchema<TBody>
  /** Rate-limit function: receives an identifier string, returns a RateLimitResult. */
  rateLimiter?: (identifier: string) => Promise<RateLimitResult>
  /** When true, the handler requires a valid session. Defaults to true. */
  requireAuth?: boolean
}

// ---------------------------------------------------------------------------
// withAuth
// ---------------------------------------------------------------------------

/**
 * Wrap a handler so it only executes when the caller has an active session.
 * Injects the authenticated user's ID as the second argument.
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        formatApiError(new AuthError('Authentication required.')),
        { status: 401 }
      )
    }

    try {
      return await handler(req, session.user.id)
    } catch (err) {
      return handleError(err)
    }
  }
}

// ---------------------------------------------------------------------------
// withValidation
// ---------------------------------------------------------------------------

/**
 * Wrap a handler with Zod request-body validation.
 * Parses the JSON body, validates it against the schema, and injects the
 * typed result as the second argument.
 */
export function withValidation<TBody>(
  schema: ZodSchema<TBody>,
  handler: ValidatedHandler<TBody>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    let raw: unknown

    try {
      raw = await req.json()
    } catch {
      return NextResponse.json(
        formatApiError(new ValidationError('Request body must be valid JSON.')),
        { status: 400 }
      )
    }

    const parsed = schema.safeParse(raw)

    if (!parsed.success) {
      return NextResponse.json(
        formatApiError(
          new ValidationError('Validation failed.', zodIssues(parsed.error))
        ),
        { status: 422 }
      )
    }

    try {
      return await handler(req, parsed.data)
    } catch (err) {
      return handleError(err)
    }
  }
}

// ---------------------------------------------------------------------------
// withRateLimit
// ---------------------------------------------------------------------------

/**
 * Wrap a handler with a rate-limit check.
 * The identifier is derived from the X-Forwarded-For header or the remote IP.
 */
export function withRateLimit(
  limiter: (identifier: string) => Promise<RateLimitResult>,
  handler: RateLimitedHandler
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const identifier = getClientIdentifier(req)

    let result: RateLimitResult

    try {
      result = await limiter(identifier)
    } catch {
      // If rate limiter itself fails, allow the request through (fail open)
      return handler(req)
    }

    if (!result.success) {
      return NextResponse.json(
        formatApiError(
          new AuthError(
            'Too many requests. Please try again later.',
            'RATE_LIMITED'
          )
        ),
        {
          status: 429,
          headers: rateLimitHeaders(result),
        }
      )
    }

    const response = await handler(req)

    // Attach informational rate-limit headers to successful responses
    for (const [header, value] of Object.entries(rateLimitHeaders(result))) {
      response.headers.set(header, value)
    }

    return response
  }
}

// ---------------------------------------------------------------------------
// createApiHandler — compose all three
// ---------------------------------------------------------------------------

/**
 * Compose authentication, rate-limiting and validation into a single handler.
 *
 * The execution order is:
 *   rate-limit → authenticate → validate body → handler
 */
export function createApiHandler<TBody = unknown>(
  options: CreateApiHandlerOptions<TBody>,
  handler: ApiHandler<TBody>
): (req: NextRequest) => Promise<NextResponse> {
  const { schema, rateLimiter, requireAuth: needsAuth = true } = options

  return async (req: NextRequest): Promise<NextResponse> => {
    // 1. Rate limiting
    if (rateLimiter) {
      const identifier = getClientIdentifier(req)

      let rlResult: RateLimitResult

      try {
        rlResult = await rateLimiter(identifier)
      } catch {
        rlResult = { success: true, remaining: 99, resetAt: new Date() }
      }

      if (!rlResult.success) {
        return NextResponse.json(
          formatApiError(
            new AuthError(
              'Too many requests. Please try again later.',
              'RATE_LIMITED'
            )
          ),
          {
            status: 429,
            headers: rateLimitHeaders(rlResult),
          }
        )
      }
    }

    // 2. Authentication
    let userId = ''

    if (needsAuth) {
      const session = await auth()

      if (!session?.user?.id) {
        return NextResponse.json(
          formatApiError(new AuthError('Authentication required.')),
          { status: 401 }
        )
      }

      userId = session.user.id
    }

    // 3. Body validation
    let body: TBody = undefined as TBody

    if (schema) {
      let raw: unknown

      try {
        raw = await req.json()
      } catch {
        return NextResponse.json(
          formatApiError(
            new ValidationError('Request body must be valid JSON.')
          ),
          { status: 400 }
        )
      }

      const parsed = schema.safeParse(raw)

      if (!parsed.success) {
        return NextResponse.json(
          formatApiError(
            new ValidationError('Validation failed.', zodIssues(parsed.error))
          ),
          { status: 422 }
        )
      }

      body = parsed.data
    }

    // 4. Execute handler
    try {
      return await handler(req, { userId, body })
    } catch (err) {
      return handleError(err)
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown'
  }
  return 'unknown'
}

function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
    'Retry-After': String(
      Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
    ),
  }
}

function zodIssues(error: ZodError): Record<string, string[]> {
  const issues: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_root'
    if (!issues[key]) issues[key] = []
    issues[key].push(issue.message)
  }
  return issues
}

function handleError(err: unknown): NextResponse {
  const body = formatApiError(err)
  const status =
    err instanceof Error && 'statusCode' in err
      ? (err as { statusCode: number }).statusCode
      : 500
  return NextResponse.json(body, { status })
}
