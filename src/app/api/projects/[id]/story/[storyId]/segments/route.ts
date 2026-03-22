import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { formatApiError, AuthError, NotFoundError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/telemetry/logger'

interface RouteContext {
  params: Promise<{ id: string; storyId: string }>
}

const addSegmentSchema = z.object({
  transcriptSegmentId: z
    .string()
    .cuid('Invalid transcript segment ID.')
    .optional(),
  inlineText: z
    .string()
    .trim()
    .max(10_000, 'Inline text must not exceed 10 000 characters.')
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1_000, 'Notes must not exceed 1 000 characters.')
    .optional(),
  label: z
    .string()
    .trim()
    .max(100, 'Label must not exceed 100 characters.')
    .optional(),
})

async function verifyStoryOwnership(
  projectId: string,
  storyId: string,
  userId: string
): Promise<boolean> {
  const story = await prisma.story.findFirst({
    where: {
      id: storyId,
      projectId,
      project: { userId },
    },
    select: { id: true },
  })
  return story !== null
}

export async function GET(
  _req: NextRequest,
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
  const { id, storyId } = await params

  try {
    const owns = await verifyStoryOwnership(id, storyId, userId)
    if (!owns) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Story not found.')),
        { status: 404 }
      )
    }

    const segments = await prisma.storySegment.findMany({
      where: { storyId },
      orderBy: { position: 'asc' },
      include: {
        transcriptSegment: {
          select: {
            id: true,
            index: true,
            startMs: true,
            endMs: true,
            speaker: true,
            text: true,
            confidence: true,
            keywords: true,
          },
        },
      },
    })

    return NextResponse.json({ segments })
  } catch (err) {
    logger.error('Failed to list story segments', err, { userId, projectId: id })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}

export async function POST(
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
  const { id, storyId } = await params

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json(
      formatApiError(new ValidationError('Request body must be valid JSON.')),
      { status: 400 }
    )
  }

  const parsed = addSegmentSchema.safeParse(raw)
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

  const { transcriptSegmentId, inlineText, notes, label } = parsed.data

  if (!transcriptSegmentId && !inlineText) {
    return NextResponse.json(
      formatApiError(
        new ValidationError(
          'Either transcriptSegmentId or inlineText must be provided.'
        )
      ),
      { status: 422 }
    )
  }

  try {
    const owns = await verifyStoryOwnership(id, storyId, userId)
    if (!owns) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Story not found.')),
        { status: 404 }
      )
    }

    if (transcriptSegmentId) {
      const tseg = await prisma.transcriptSegment.findFirst({
        where: {
          id: transcriptSegmentId,
          transcript: { projectId: id },
        },
        select: { id: true },
      })
      if (!tseg) {
        return NextResponse.json(
          formatApiError(new NotFoundError('Transcript segment not found.')),
          { status: 404 }
        )
      }
    }

    const maxPositionResult = await prisma.storySegment.aggregate({
      where: { storyId },
      _max: { position: true },
    })

    const nextPosition = (maxPositionResult._max.position ?? -1) + 1

    const segment = await prisma.storySegment.create({
      data: {
        storyId,
        transcriptSegmentId: transcriptSegmentId ?? null,
        inlineText: inlineText ?? null,
        notes: notes ?? null,
        label: label ?? null,
        position: nextPosition,
      },
      include: {
        transcriptSegment: {
          select: {
            id: true,
            index: true,
            startMs: true,
            endMs: true,
            speaker: true,
            text: true,
          },
        },
      },
    })

    return NextResponse.json({ segment }, { status: 201 })
  } catch (err) {
    logger.error('Failed to add story segment', err, { userId, projectId: id })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}
