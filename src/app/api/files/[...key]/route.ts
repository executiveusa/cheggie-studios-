import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { storage } from '@/lib/storage'
import { env } from '@/lib/env'
import { formatApiError, AuthError, NotFoundError, ForbiddenError, AppError } from '@/lib/errors'
import { logger } from '@/lib/telemetry/logger'

interface RouteContext {
  params: Promise<{ key: string[] }>
}

const MIME_MAP: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  json: 'application/json',
  txt: 'text/plain',
  srt: 'text/plain',
  vtt: 'text/vtt',
}

function getMimeType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? ''
  return MIME_MAP[ext] ?? 'application/octet-stream'
}

export async function GET(
  _req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  if (env.STORAGE_ADAPTER !== 'local') {
    return NextResponse.json(
      formatApiError(
        new AppError(
          'File serving is only available with local storage adapter.',
          'NOT_SUPPORTED',
          501
        )
      ),
      { status: 501 }
    )
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      formatApiError(new AuthError('Authentication required.')),
      { status: 401 }
    )
  }

  const userId = session.user.id
  const { key: keyParts } = await params
  const key = keyParts.join('/')

  const expectedPrefix = `users/${userId}/`
  if (!key.startsWith(expectedPrefix)) {
    return NextResponse.json(
      formatApiError(
        new ForbiddenError('You do not have permission to access this file.')
      ),
      { status: 403 }
    )
  }

  if (key.includes('..') || key.includes('\0')) {
    return NextResponse.json(
      formatApiError(new ForbiddenError('Invalid file path.')),
      { status: 403 }
    )
  }

  try {
    const exists = await storage.exists(key)
    if (!exists) {
      return NextResponse.json(
        formatApiError(new NotFoundError('File not found.')),
        { status: 404 }
      )
    }

    const buffer = await storage.download(key)
    const mimeType = getMimeType(key)

    const fileName = key.split('/').pop() ?? 'file'
    const isInline =
      mimeType.startsWith('image/') ||
      mimeType.startsWith('video/') ||
      mimeType.startsWith('audio/') ||
      mimeType === 'text/plain' ||
      mimeType === 'text/vtt'

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(buffer.length),
        'Content-Disposition': isInline
          ? `inline; filename="${fileName}"`
          : `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ForbiddenError) {
      return NextResponse.json(formatApiError(err), {
        status: (err as { statusCode?: number }).statusCode ?? 404,
      })
    }

    logger.error('Failed to serve file', err, { userId, key })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}
