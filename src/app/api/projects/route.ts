import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { createProjectSchema } from '@/lib/security/validation'
import { formatApiError, AuthError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/telemetry/logger'
import { trackEvent } from '@/lib/telemetry/events'
import type { ProjectStatus } from '@prisma/client'

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['DRAFT', 'PROCESSING', 'READY', 'ERROR']).optional(),
  q: z.string().trim().optional(),
})

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      formatApiError(new AuthError('Authentication required.')),
      { status: 401 }
    )
  }

  const userId = session.user.id
  const { searchParams } = new URL(req.url)

  const parsed = listQuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    q: searchParams.get('q') ?? undefined,
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

  const { page, limit, status, q } = parsed.data
  const skip = (page - 1) * limit

  try {
    const where = {
      userId,
      ...(status ? { status: status as ProjectStatus } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' as const } },
              { description: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          transcriptStatus: true,
          language: true,
          tags: true,
          thumbnailUrl: true,
          durationMs: true,
          sourceFileName: true,
          sourceFileMime: true,
          sourceFileSizeBytes: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { stories: true },
          },
        },
      }),
      prisma.project.count({ where }),
    ])

    return NextResponse.json({
      projects,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    logger.error('Failed to list projects', err, { userId })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      formatApiError(new AuthError('Authentication required.')),
      { status: 401 }
    )
  }

  const userId = session.user.id

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json(
      formatApiError(new ValidationError('Request body must be valid JSON.')),
      { status: 400 }
    )
  }

  const parsed = createProjectSchema.safeParse(raw)
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

  const { title, description, language, tags } = parsed.data

  try {
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    })

    const project = await prisma.project.create({
      data: {
        title,
        description,
        language: language ?? 'sr',
        tags: tags ?? [],
        userId,
        workspaceId: workspace?.id ?? null,
        status: 'DRAFT',
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        language: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    void trackEvent('project.created', { title }, { userId, projectId: project.id })

    return NextResponse.json({ project }, { status: 201 })
  } catch (err) {
    logger.error('Failed to create project', err, { userId })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}
