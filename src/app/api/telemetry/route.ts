import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { formatApiError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/telemetry/logger'

const ALLOWED_EVENT_TYPES = new Set([
  'project.created',
  'upload.started',
  'upload.completed',
  'transcript.requested',
  'search.performed',
  'story.saved',
  'subtitle.generated',
  'export.created',
  'auth.signup',
  'auth.login',
  'support.issue.created',
  'page.viewed',
  'feature.used',
  'error.client',
])

const telemetryBodySchema = z.object({
  type: z
    .string()
    .trim()
    .min(1, 'Event type is required.')
    .max(100, 'Event type must not exceed 100 characters.'),
  payload: z.record(z.unknown()).optional(),
  projectId: z.string().cuid('Invalid project ID.').optional(),
  sessionId: z.string().trim().max(255).optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json(
      formatApiError(new ValidationError('Request body must be valid JSON.')),
      { status: 400 }
    )
  }

  const parsed = telemetryBodySchema.safeParse(raw)
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

  const { type, payload, projectId, sessionId } = parsed.data

  if (!ALLOWED_EVENT_TYPES.has(type)) {
    return NextResponse.json(
      formatApiError(
        new ValidationError(`Event type '${type}' is not allowed.`)
      ),
      { status: 422 }
    )
  }

  const session = await auth()
  const userId = session?.user?.id ?? null

  const userAgent = req.headers.get('user-agent') ?? null
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0]?.trim() ?? null : null

  if (projectId && userId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    })

    if (!project) {
      return new NextResponse(null, { status: 204 })
    }
  }

  try {
    await prisma.telemetryEvent.create({
      data: {
        type,
        payload: (payload ?? {}) as any,
        userId,
        projectId: projectId ?? null,
        sessionId: sessionId ?? null,
        userAgent,
        ip,
      },
    })
  } catch (err) {
    logger.error('Failed to persist telemetry event', err, {
      ...(userId ? { userId } : {}),
      ...(projectId ? { projectId } : {}),
    })
  }

  return new NextResponse(null, { status: 204 })
}
