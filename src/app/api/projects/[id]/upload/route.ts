import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { storage } from '@/lib/storage'
import { dispatchTranscriptJob } from '@/lib/queue/jobs'
import { sanitizeFileName, generateStorageKey } from '@/lib/security/sanitize'
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_SIZE,
  MAX_UPLOAD_SIZE_MB,
} from '@/lib/security/validation'
import { uploadRateLimit } from '@/lib/security/rate-limit'
import { formatApiError, AuthError, NotFoundError, ValidationError, AppError } from '@/lib/errors'
import { logger } from '@/lib/telemetry/logger'
import { trackEvent } from '@/lib/telemetry/events'
import type { AllowedMimeType } from '@/lib/security/validation'

interface RouteContext {
  params: Promise<{ id: string }>
}

function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown'
  }
  return 'unknown'
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

  const identifier = getClientIdentifier(req)
  const rl = await uploadRateLimit(`${userId}:${identifier}`)
  if (!rl.success) {
    return NextResponse.json(
      formatApiError(new AppError('Too many uploads. Please try again later.', 'RATE_LIMITED', 429)),
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': String(rl.remaining),
          'X-RateLimit-Reset': rl.resetAt.toISOString(),
          'Retry-After': String(Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000)),
        },
      }
    )
  }

  try {
    const project = await prisma.project.findFirst({
      where: { id, userId },
      select: { id: true, language: true },
    })

    if (!project) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Project not found.')),
        { status: 404 }
      )
    }

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json(
        formatApiError(new ValidationError('Request must be multipart/form-data.')),
        { status: 400 }
      )
    }

    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        formatApiError(new ValidationError('A file field is required.')),
        { status: 422 }
      )
    }

    const mimeType = file.type
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
      return NextResponse.json(
        formatApiError(
          new ValidationError(
            `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}.`
          )
        ),
        { status: 422 }
      )
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        formatApiError(
          new ValidationError(`File size exceeds the ${MAX_UPLOAD_SIZE_MB} MB limit.`)
        ),
        { status: 422 }
      )
    }

    const safeFileName = sanitizeFileName(file.name)
    const storageKey = generateStorageKey(userId, id, safeFileName)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { url } = await storage.upload(storageKey, buffer, mimeType as AllowedMimeType)

    const transcriptJobId = await dispatchTranscriptJob(id, url, project.language)

    await prisma.project.update({
      where: { id },
      data: {
        sourceFileUrl: url,
        sourceFileName: safeFileName,
        sourceFileMime: mimeType,
        sourceFileSizeBytes: file.size,
        status: 'PROCESSING',
        transcriptStatus: 'PROCESSING',
      },
    })

    void trackEvent(
      'upload.completed',
      { fileName: safeFileName, mimeType, sizeBytes: file.size },
      { userId, projectId: id }
    )

    return NextResponse.json({ url, transcriptJobId }, { status: 200 })
  } catch (err) {
    logger.error('Upload failed', err, { userId, projectId: id })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}
