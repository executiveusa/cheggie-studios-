import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { formatApiError, AuthError, NotFoundError, ValidationError, AppError } from '@/lib/errors'
import { logger } from '@/lib/telemetry/logger'
import { trackEvent } from '@/lib/telemetry/events'
import type { SubtitleFormat } from '@prisma/client'

interface RouteContext {
  params: Promise<{ id: string }>
}

const generateSubtitleSchema = z.object({
  format: z.enum(['SRT', 'VTT', 'ASS'] as const, {
    errorMap: () => ({ message: 'Format must be one of: SRT, VTT, ASS.' }),
  }),
  language: z.string().trim().min(2).max(10).optional(),
})

interface TranscriptSegmentRow {
  id: string
  index: number
  startMs: number
  endMs: number
  speaker: string | null
  text: string
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

function generateAss(segments: TranscriptSegmentRow[], language: string): string {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
Language: ${language}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,2,2,10,10,30,0

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`

  function msToAssTime(ms: number): string {
    const h = Math.floor(ms / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    const s = Math.floor((ms % 60_000) / 1_000)
    const cs = Math.floor((ms % 1_000) / 10)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
  }

  const dialogues = segments
    .map((seg) => {
      const speakerPrefix = seg.speaker ? `${seg.speaker}: ` : ''
      return `Dialogue: 0,${msToAssTime(seg.startMs)},${msToAssTime(seg.endMs)},Default,,0,0,0,,${speakerPrefix}${seg.text}`
    })
    .join('\n')

  return `${header}\n${dialogues}`
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

    const subtitleAssets = await prisma.subtitleAsset.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        format: true,
        language: true,
        status: true,
        url: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ subtitleAssets })
  } catch (err) {
    logger.error('Failed to list subtitle assets', err, { userId, projectId: id })
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

  const parsed = generateSubtitleSchema.safeParse(raw)
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

  const { format, language } = parsed.data

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

    const transcript = await prisma.transcript.findUnique({
      where: { projectId: id },
      select: { id: true, status: true, language: true },
    })

    if (!transcript || transcript.status !== 'READY') {
      return NextResponse.json(
        formatApiError(
          new AppError(
            'Transcript is not ready. Cannot generate subtitles.',
            'TRANSCRIPT_NOT_READY',
            422
          )
        ),
        { status: 422 }
      )
    }

    const segments = await prisma.transcriptSegment.findMany({
      where: { transcriptId: transcript.id },
      orderBy: { index: 'asc' },
      select: {
        id: true,
        index: true,
        startMs: true,
        endMs: true,
        speaker: true,
        text: true,
      },
    })

    const lang = language ?? project.language ?? transcript.language ?? 'sr'

    let content: string
    switch (format) {
      case 'SRT':
        content = generateSrt(segments)
        break
      case 'VTT':
        content = generateVtt(segments)
        break
      case 'ASS':
        content = generateAss(segments, lang)
        break
      default:
        return NextResponse.json(
          formatApiError(new ValidationError('Unsupported format.')),
          { status: 422 }
        )
    }

    const subtitleAsset = await prisma.subtitleAsset.create({
      data: {
        projectId: id,
        format: format as SubtitleFormat,
        language: lang,
        content,
        status: 'READY',
      },
      select: {
        id: true,
        format: true,
        language: true,
        status: true,
        createdAt: true,
      },
    })

    void trackEvent(
      'subtitle.generated',
      { format, language: lang },
      { userId, projectId: id }
    )

    return NextResponse.json(
      { subtitleAsset, content },
      { status: 201 }
    )
  } catch (err) {
    logger.error('Failed to generate subtitles', err, { userId, projectId: id })
    return NextResponse.json(formatApiError(err), {
      status: (err as { statusCode?: number }).statusCode ?? 500,
    })
  }
}
