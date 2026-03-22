import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { formatApiError, AuthError, NotFoundError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/telemetry/logger'

interface RouteContext {
  params: Promise<{ id: string; storyId: string }>
}

const reorderSchema = z.object({
  segmentIds: z
    .array(z.string().cuid('Each segment ID must be a valid CUID.'))
    .min(1, 'At least one segment ID is required.'),
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

  const parsed = reorderSchema.safeParse(raw)
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

  const { segmentIds } = parsed.data

  try {
    const owns = await verifyStoryOwnership(id, storyId, userId)
    if (!owns) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Story not found.')),
        { status: 404 }
      )
    }

    const existingSegments = await prisma.storySegment.findMany({
      where: { storyId, id: { in: segmentIds } },
      select: { id: true },
    })

    if (existingSegments.length !== segmentIds.length) {
      const foundIds = new Set(existingSegments.map((s) => s.id))
      const missing = segmentIds.filter((sid) => !foundIds.has(sid))
      return NextResponse.json(
        formatApiError(
          new NotFoundError(`Segments not found: ${missing.join(', ')}.`)
        ),
        { status: 404 }
      )
    }

    await prisma.$transaction(
      segmentIds.map((segId, index) =>
        prisma.storySegment.update({
          where: { id: segId },
          data: { position: index },
        })
      )
    )

    const segments = await prisma.storySegment.findMany({
      where: { storyId },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        position: true,
        label: true,
        notes: true,
        inlineText: true,
      },
    })

    return NextResponse.json({ segments })
  } catch (err) {
    logger.error('Failed to reorder story segments', err, { userId, projectId: id })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}
