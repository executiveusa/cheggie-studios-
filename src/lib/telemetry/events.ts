import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { logger } from './logger'

// ---------------------------------------------------------------------------
// Supported event types
// ---------------------------------------------------------------------------

export type EventType =
  | 'project.created'
  | 'upload.started'
  | 'upload.completed'
  | 'transcript.requested'
  | 'search.performed'
  | 'story.saved'
  | 'subtitle.generated'
  | 'export.created'
  | 'auth.signup'
  | 'auth.login'
  | 'support.issue.created'

// ---------------------------------------------------------------------------
// trackEvent — fire-and-forget write to TelemetryEvent table
// ---------------------------------------------------------------------------

export async function trackEvent(
  type: string,
  payload?: Record<string, unknown>,
  context?: {
    userId?: string
    projectId?: string
    sessionId?: string
  },
): Promise<void> {
  try {
    await prisma.telemetryEvent.create({
      data: {
        type,
        payload: (payload ?? {}) as unknown as Prisma.InputJsonValue,
        userId: context?.userId ?? null,
        projectId: context?.projectId ?? null,
        sessionId: context?.sessionId ?? null,
      },
    })
  } catch (err) {
    // Telemetry must never crash the calling code — log and continue
    logger.error('Failed to persist telemetry event', err, {
      ...(context?.userId ? { userId: context.userId } : {}),
      ...(context?.projectId ? { projectId: context.projectId } : {}),
      eventType: type,
    })
  }
}
