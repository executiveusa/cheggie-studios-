import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { formatApiError, AuthError, NotFoundError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/telemetry/logger'

interface RouteContext {
  params: Promise<{ id: string; storyId: string }>
}

const updateStorySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(200, 'Title must not exceed 200 characters.')
    .optional(),
  notes: z
    .string()
    .trim()
    .max(5000, 'Notes must not exceed 5000 characters.')
    .nullable()
    .optional(),
  status: z.enum(['DRAFT', 'READY']).optional(),
})

async function verifyProjectOwnership(
  projectId: string,
  userId: string
): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  })
  return project !== null
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
    const owns = await verifyProjectOwnership(id, userId)
    if (!owns) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Project not found.')),
        { status: 404 }
      )
    }

    const story = await prisma.story.findFirst({
      where: { id: storyId, projectId: id },
      include: {
        segments: {
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
        },
      },
    })

    if (!story) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Story not found.')),
        { status: 404 }
      )
    }

    return NextResponse.json({ story })
  } catch (err) {
    logger.error('Failed to get story', err, { userId, projectId: id })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}

export async function PATCH(
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

  const parsed = updateStorySchema.safeParse(raw)
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

  try {
    const owns = await verifyProjectOwnership(id, userId)
    if (!owns) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Project not found.')),
        { status: 404 }
      )
    }

    const existing = await prisma.story.findFirst({
      where: { id: storyId, projectId: id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Story not found.')),
        { status: 404 }
      )
    }

    const story = await prisma.story.update({
      where: { id: storyId },
      data: parsed.data,
      select: {
        id: true,
        title: true,
        status: true,
        notes: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ story })
  } catch (err) {
    logger.error('Failed to update story', err, { userId, projectId: id })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}

export async function DELETE(
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
    const owns = await verifyProjectOwnership(id, userId)
    if (!owns) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Project not found.')),
        { status: 404 }
      )
    }

    const existing = await prisma.story.findFirst({
      where: { id: storyId, projectId: id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Story not found.')),
        { status: 404 }
      )
    }

    await prisma.story.delete({ where: { id: storyId } })

    return NextResponse.json(null, { status: 204 })
  } catch (err) {
    logger.error('Failed to delete story', err, { userId, projectId: id })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}
