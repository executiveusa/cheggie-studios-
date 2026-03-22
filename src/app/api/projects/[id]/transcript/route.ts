import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { dispatchTranscriptJob } from '@/lib/queue/jobs'
import { formatApiError, AuthError, NotFoundError, AppError } from '@/lib/errors'
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
      select: {
        id: true,
        transcriptStatus: true,
        transcript: {
          include: {
            segments: {
              orderBy: { index: 'asc' },
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

    if (!project) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Project not found.')),
        { status: 404 }
      )
    }

    if (!project.transcript) {
      return NextResponse.json({
        status: 'pending',
        transcriptStatus: project.transcriptStatus,
      })
    }

    return NextResponse.json({ transcript: project.transcript })
  } catch (err) {
    logger.error('Failed to get transcript', err, { userId, projectId: id })
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

  const url = new URL(req.url)
  const isRetry = url.pathname.endsWith('/retry')

  if (!isRetry) {
    return NextResponse.json(
      formatApiError(new NotFoundError('Route not found.')),
      { status: 404 }
    )
  }

  try {
    const project = await prisma.project.findFirst({
      where: { id, userId },
      select: {
        id: true,
        transcriptStatus: true,
        sourceFileUrl: true,
        language: true,
        transcript: { select: { id: true, status: true } },
      },
    })

    if (!project) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Project not found.')),
        { status: 404 }
      )
    }

    const canRetry =
      project.transcriptStatus === 'ERROR' ||
      project.transcript?.status === 'ERROR'

    if (!canRetry) {
      return NextResponse.json(
        formatApiError(
          new AppError(
            'Transcript retry is only allowed when status is ERROR.',
            'INVALID_STATE',
            409
          )
        ),
        { status: 409 }
      )
    }

    if (!project.sourceFileUrl) {
      return NextResponse.json(
        formatApiError(
          new AppError('No source file found for this project.', 'NO_SOURCE_FILE', 422)
        ),
        { status: 422 }
      )
    }

    const transcriptJobId = await dispatchTranscriptJob(
      id,
      project.sourceFileUrl,
      project.language
    )

    await prisma.project.update({
      where: { id },
      data: {
        status: 'PROCESSING',
        transcriptStatus: 'PROCESSING',
      },
    })

    if (project.transcript) {
      await prisma.transcript.update({
        where: { projectId: id },
        data: { status: 'PROCESSING' },
      })
    }

    return NextResponse.json({ transcriptJobId, status: 'PROCESSING' })
  } catch (err) {
    logger.error('Failed to retry transcript', err, { userId, projectId: id })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}
