import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { formatApiError, AuthError, NotFoundError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/telemetry/logger'

interface RouteContext {
  params: Promise<{ id: string; storyId: string; segmentId: string }>
}

const updateSegmentSchema = z.object({
  notes: z
    .string()
    .trim()
    .max(1_000, 'Notes must not exceed 1 000 characters.')
    .nullable()
    .optional(),
  label: z
    .string()
    .trim()
    .max(100, 'Label must not exceed 100 characters.')
    .nullable()
    .optional(),
  inlineText: z
    .string()
    .trim()
    .max(10_000, 'Inline text must not exceed 10 000 characters.')
    .nullable()
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
  const { id, storyId, segmentId } = await params

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json(
      formatApiError(new ValidationError('Request body must be valid JSON.')),
      { status: 400 }
    )
  }

  const parsed = updateSegmentSchema.safeParse(raw)
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
    const owns = await verifyStoryOwnership(id, storyId, userId)
    if (!owns) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Story not found.')),
        { status: 404 }
      )
    }

    const existing = await prisma.storySegment.findFirst({
      where: { id: segmentId, storyId },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Segment not found.')),
        { status: 404 }
      )
    }

    const segment = await prisma.storySegment.update({
      where: { id: segmentId },
      data: parsed.data,
      include: {
        transcriptSegment: {
          select: {
            id: true,
            startMs: true,
            endMs: true,
            speaker: true,
            text: true,
          },
        },
      },
    })

    return NextResponse.json({ segment })
  } catch (err) {
    logger.error('Failed to update story segment', err, { userId, projectId: id })
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
  const { id, storyId, segmentId } = await params

  try {
    const owns = await verifyStoryOwnership(id, storyId, userId)
    if (!owns) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Story not found.')),
        { status: 404 }
      )
    }

    const existing = await prisma.storySegment.findFirst({
      where: { id: segmentId, storyId },
      select: { id: true, position: true },
    })

    if (!existing) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Segment not found.')),
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx: typeof prisma) => {
      await tx.storySegment.delete({ where: { id: segmentId } })

      const remaining = await tx.storySegment.findMany({
        where: { storyId, position: { gt: existing.position } },
        orderBy: { position: 'asc' },
        select: { id: true, position: true },
      })

      for (const seg of remaining) {
        await tx.storySegment.update({
          where: { id: seg.id },
          data: { position: seg.position - 1 },
        })
      }
    })

    return NextResponse.json(null, { status: 204 })
  } catch (err) {
    logger.error('Failed to delete story segment', err, { userId, projectId: id })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}
