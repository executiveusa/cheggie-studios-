import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { formatApiError, AuthError, NotFoundError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/telemetry/logger'
import { trackEvent } from '@/lib/telemetry/events'

interface RouteContext {
  params: Promise<{ id: string }>
}

const createStorySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(200, 'Title must not exceed 200 characters.'),
})

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
  const { id } = await params

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

    const stories = await prisma.story.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { segments: true } },
      },
    })

    return NextResponse.json({ stories })
  } catch (err) {
    logger.error('Failed to list stories', err, { userId, projectId: id })
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
  const { id } = await params

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json(
      formatApiError(new ValidationError('Request body must be valid JSON.')),
      { status: 400 }
    )
  }

  const parsed = createStorySchema.safeParse(raw)
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

    const story = await prisma.story.create({
      data: {
        title: parsed.data.title,
        projectId: id,
        status: 'DRAFT',
      },
      select: {
        id: true,
        title: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    void trackEvent('story.saved', { title: story.title }, { userId, projectId: id })

    return NextResponse.json({ story }, { status: 201 })
  } catch (err) {
    logger.error('Failed to create story', err, { userId, projectId: id })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}
