import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { updateProjectSchema } from '@/lib/security/validation'
import { formatApiError, AuthError, NotFoundError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/telemetry/logger'

interface RouteContext {
  params: Promise<{ id: string }>
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
  const { id } = await params

  try {
    const project = await prisma.project.findFirst({
      where: { id, userId },
      include: {
        transcript: {
          select: {
            id: true,
            status: true,
            language: true,
            wordCount: true,
            durationMs: true,
            engineUsed: true,
            confidence: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            stories: true,
            subtitleAssets: true,
            exportAssets: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Project not found.')),
        { status: 404 }
      )
    }

    return NextResponse.json({ project })
  } catch (err) {
    logger.error('Failed to get project', err, { userId, projectId: id })
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

  const parsed = updateProjectSchema.safeParse(raw)
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
    const existing = await prisma.project.findFirst({
      where: { id, userId },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Project not found.')),
        { status: 404 }
      )
    }

    const project = await prisma.project.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        language: true,
        tags: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ project })
  } catch (err) {
    logger.error('Failed to update project', err, { userId, projectId: id })
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
  const { id } = await params

  try {
    const existing = await prisma.project.findFirst({
      where: { id, userId },
      select: { id: true, status: true },
    })

    if (!existing) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Project not found.')),
        { status: 404 }
      )
    }

    await prisma.project.update({
      where: { id },
      data: { status: 'ERROR' },
    })

    await prisma.project.delete({ where: { id } })

    return NextResponse.json(null, { status: 204 })
  } catch (err) {
    logger.error('Failed to delete project', err, { userId, projectId: id })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}
