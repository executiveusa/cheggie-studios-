import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { formatApiError, AuthError, NotFoundError, ValidationError, AppError } from '@/lib/errors'
import { logger } from '@/lib/telemetry/logger'
import { trackEvent } from '@/lib/telemetry/events'
import type { ExportType } from '@prisma/client'

interface RouteContext {
  params: Promise<{ id: string }>
}

const EXPORT_TYPES = [
  'TRANSCRIPT_TXT',
  'TRANSCRIPT_JSON',
  'SUBTITLE_SRT',
  'SUBTITLE_VTT',
  'STORY_JSON',
  'METADATA_JSON',
] as const

type SupportedExportType = (typeof EXPORT_TYPES)[number]

const createExportSchema = z.object({
  type: z.enum(EXPORT_TYPES, {
    errorMap: () => ({
      message: `Export type must be one of: ${EXPORT_TYPES.join(', ')}.`,
    }),
  }),
})

interface TranscriptSegmentRow {
  id: string
  index: number
  startMs: number
  endMs: number
  speaker: string | null
  text: string
  confidence: number | null
  keywords: string[]
}

function msToSrtTime(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  const ms2 = ms % 1_000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms2).padStart(3, '0')}`
}

function msToVttTime(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  const ms2 = ms % 1_000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms2).padStart(3, '0')}`
}

function generateTranscriptTxt(segments: TranscriptSegmentRow[]): string {
  return segments
    .map((seg) => {
      const speakerPrefix = seg.speaker ? `[${seg.speaker}] ` : ''
      return `${speakerPrefix}${seg.text}`
    })
    .join('\n\n')
}

function generateSrt(segments: TranscriptSegmentRow[]): string {
  return segments
    .map((seg, i) => {
      const speakerPrefix = seg.speaker ? `${seg.speaker}: ` : ''
      return `${i + 1}\n${msToSrtTime(seg.startMs)} --> ${msToSrtTime(seg.endMs)}\n${speakerPrefix}${seg.text}`
    })
    .join('\n\n')
}

function generateVtt(segments: TranscriptSegmentRow[]): string {
  const cues = segments
    .map((seg) => {
      const speakerPrefix = seg.speaker ? `${seg.speaker}: ` : ''
      return `${msToVttTime(seg.startMs)} --> ${msToVttTime(seg.endMs)}\n${speakerPrefix}${seg.text}`
    })
    .join('\n\n')
  return `WEBVTT\n\n${cues}`
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
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Project not found.')),
        { status: 404 }
      )
    }

    const exportAssets = await prisma.exportAsset.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        url: true,
        sizeBytes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ exportAssets })
  } catch (err) {
    logger.error('Failed to list export assets', err, { userId, projectId: id })
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

  const parsed = createExportSchema.safeParse(raw)
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

  const { type } = parsed.data as { type: SupportedExportType }

  try {
    const project = await prisma.project.findFirst({
      where: { id, userId },
      select: {
        id: true,
        title: true,
        description: true,
        language: true,
        tags: true,
        status: true,
        sourceFileName: true,
        sourceFileMime: true,
        sourceFileSizeBytes: true,
        durationMs: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!project) {
      return NextResponse.json(
        formatApiError(new NotFoundError('Project not found.')),
        { status: 404 }
      )
    }

    let content: string

    switch (type) {
      case 'TRANSCRIPT_TXT':
      case 'TRANSCRIPT_JSON':
      case 'SUBTITLE_SRT':
      case 'SUBTITLE_VTT': {
        const transcript = await prisma.transcript.findUnique({
          where: { projectId: id },
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
        })

        if (!transcript || transcript.status !== 'READY') {
          return NextResponse.json(
            formatApiError(
              new AppError(
                'Transcript is not ready. Cannot generate this export type.',
                'TRANSCRIPT_NOT_READY',
                422
              )
            ),
            { status: 422 }
          )
        }

        if (type === 'TRANSCRIPT_TXT') {
          content = generateTranscriptTxt(transcript.segments)
        } else if (type === 'TRANSCRIPT_JSON') {
          content = JSON.stringify(
            {
              projectId: id,
              language: transcript.language,
              wordCount: transcript.wordCount,
              durationMs: transcript.durationMs,
              segments: transcript.segments,
            },
            null,
            2
          )
        } else if (type === 'SUBTITLE_SRT') {
          content = generateSrt(transcript.segments)
        } else {
          content = generateVtt(transcript.segments)
        }
        break
      }

      case 'STORY_JSON': {
        const stories = await prisma.story.findMany({
          where: { projectId: id },
          include: {
            segments: {
              orderBy: { position: 'asc' },
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
            },
          },
        })

        content = JSON.stringify({ projectId: id, stories }, null, 2)
        break
      }

      case 'METADATA_JSON': {
        content = JSON.stringify(
          {
            id: project.id,
            title: project.title,
            description: project.description,
            language: project.language,
            tags: project.tags,
            status: project.status,
            sourceFileName: project.sourceFileName,
            sourceFileMime: project.sourceFileMime,
            sourceFileSizeBytes: project.sourceFileSizeBytes,
            durationMs: project.durationMs,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          },
          null,
          2
        )
        break
      }

      default:
        return NextResponse.json(
          formatApiError(new ValidationError('Unsupported export type.')),
          { status: 422 }
        )
    }

    const sizeBytes = Buffer.byteLength(content, 'utf8')

    const exportAsset = await prisma.exportAsset.create({
      data: {
        projectId: id,
        type: type as ExportType,
        sizeBytes,
        status: 'READY',
      },
      select: {
        id: true,
        type: true,
        sizeBytes: true,
        status: true,
        createdAt: true,
      },
    })

    void trackEvent(
      'export.created',
      { type, sizeBytes },
      { userId, projectId: id }
    )

    return NextResponse.json(
      { exportAsset, content, type },
      { status: 201 }
    )
  } catch (err) {
    logger.error('Failed to create export', err, { userId, projectId: id })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}
