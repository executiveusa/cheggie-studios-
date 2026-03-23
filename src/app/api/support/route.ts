import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { createSupportIssueSchema } from '@/lib/security/validation'
import { formatApiError, AuthError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/telemetry/logger'
import { trackEvent } from '@/lib/telemetry/events'
import { env } from '@/lib/env'
import type { SupportCategory } from '@prisma/client'

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

  const parsed = createSupportIssueSchema.safeParse(raw)
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

  const { category, message, projectId, context } = parsed.data

  try {
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId },
        select: { id: true },
      })

      if (!project) {
        return NextResponse.json(
          formatApiError(new ValidationError('Project not found or does not belong to you.')),
          { status: 422 }
        )
      }
    }

    let sentryEventId: string | undefined

    if (env.SENTRY_DSN || env.NEXT_PUBLIC_SENTRY_DSN) {
      sentryEventId = Sentry.captureMessage(
        `[Support] [${category}] ${message.slice(0, 100)}`,
        {
          level: 'info',
          user: { id: userId },
          tags: { category, projectId: projectId ?? 'none' },
          extra: context ?? {},
        }
      )
    }

    const supportIssue = await prisma.supportIssue.create({
      data: {
        userId,
        projectId: projectId ?? null,
        category: category as SupportCategory,
        message,
        context: context as any,
        status: 'OPEN',
        sentryEventId: sentryEventId ?? null,
      },
      select: {
        id: true,
        status: true,
        category: true,
        createdAt: true,
      },
    })

    void trackEvent(
      'support.issue.created',
      { category, issueId: supportIssue.id },
      { userId, projectId: projectId ?? undefined }
    )

    return NextResponse.json(
      { id: supportIssue.id, status: 'open', category: supportIssue.category },
      { status: 201 }
    )
  } catch (err) {
    logger.error('Failed to create support issue', err, { userId })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}
