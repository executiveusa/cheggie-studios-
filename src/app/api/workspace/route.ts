import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { formatApiError, AuthError, NotFoundError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/telemetry/logger'

const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .max(100, 'Name must not exceed 100 characters.'),
})

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      formatApiError(new AuthError('Authentication required.')),
      { status: 401 }
    )
  }

  const userId = session.user.id

  try {
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        plan: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { members: true, projects: true },
        },
      },
    })

    if (!workspace) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Workspace not found.')),
        { status: 404 }
      )
    }

    return NextResponse.json({ workspace })
  } catch (err) {
    logger.error('Failed to get workspace', err, { userId })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
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

  const parsed = updateWorkspaceSchema.safeParse(raw)
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
    const existing = await prisma.workspace.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Workspace not found.')),
        { status: 404 }
      )
    }

    const workspace = await prisma.workspace.update({
      where: { id: existing.id },
      data: { name: parsed.data.name },
      select: {
        id: true,
        name: true,
        plan: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ workspace })
  } catch (err) {
    logger.error('Failed to update workspace', err, { userId })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}
