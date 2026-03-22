import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { searchTranscript } from '@/lib/search'
import { formatApiError, AuthError, NotFoundError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/telemetry/logger'
import { trackEvent } from '@/lib/telemetry/events'

interface RouteContext {
  params: Promise<{ id: string }>
}

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Query is required.').max(500, 'Query too long.'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export async function GET(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      formatApiError(new AuthError('Authentication required.')),
      { status: 401 }
    )
  }

  const userId = session.user.id
  const { id } = await params

  const { searchParams } = new URL(req.url)
  const parsed = searchQuerySchema.safeParse({
    q: searchParams.get('q') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })

  if (!parsed.success) {
    const issues: Record<string, string[]> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || '_root'
      if (!issues[key]) issues[key] = []
      issues[key].push(issue.message)
    }
    return NextResponse.json(
      formatApiError(new ValidationError('Invalid query parameters.', issues)),
      { status: 422 }
    )
  }

  const { q, limit } = parsed.data

  try {
    const project = await prisma.project.findFirst({
      where: { id, userId },
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Project not found.')),
        { status: 404 }
      )
    }

    const results = await searchTranscript(id, q, { limit })

    void trackEvent(
      'search.performed',
      { query: q, resultCount: results.length },
      { userId, projectId: id }
    )

    return NextResponse.json({ results, query: q, total: results.length })
  } catch (err) {
    logger.error('Search failed', err, { userId, projectId: id })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}
