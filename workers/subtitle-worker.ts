/**
 * subtitle-worker.ts
 *
 * BullMQ worker that generates subtitle files (SRT / VTT / ASS) from an
 * existing Transcript + its TranscriptSegments, then stores the result as a
 * SubtitleAsset record.
 */

import { Worker } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import IORedis from 'ioredis'

import { logger } from '../src/lib/telemetry/logger'
import { JobError, NotFoundError } from '../src/lib/errors'

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const prisma = new PrismaClient({
  log: process.env['NODE_ENV'] === 'development' ? ['error', 'warn'] : ['error'],
})

const redisConnection = new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
})

redisConnection.on('error', (err: Error) => {
  logger.error('[subtitle-worker] Redis connection error', err, { jobId: 'redis' })
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubtitleJobData {
  projectId: string
  transcriptId: string
  format: 'SRT' | 'VTT' | 'ASS'
}

interface SegmentLike {
  index: number
  startMs: number
  endMs: number
  text: string
}

// ---------------------------------------------------------------------------
// Time formatting helpers
// ---------------------------------------------------------------------------

/** Format milliseconds as  HH:MM:SS,mmm  (SRT style) */
function msToSrt(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const milliseconds = ms % 1000
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return (
    String(hours).padStart(2, '0') +
    ':' +
    String(minutes).padStart(2, '0') +
    ':' +
    String(seconds).padStart(2, '0') +
    ',' +
    String(milliseconds).padStart(3, '0')
  )
}

/** Format milliseconds as  HH:MM:SS.mmm  (VTT style) */
function msToVtt(ms: number): string {
  return msToSrt(ms).replace(',', '.')
}

/** Format milliseconds as  H:MM:SS.cc  (ASS centiseconds style) */
function msToAss(ms: number): string {
  const totalCs = Math.floor(ms / 10)
  const cs = totalCs % 100
  const totalSeconds = Math.floor(totalCs / 100)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return (
    String(hours) +
    ':' +
    String(minutes).padStart(2, '0') +
    ':' +
    String(seconds).padStart(2, '0') +
    '.' +
    String(cs).padStart(2, '0')
  )
}

// ---------------------------------------------------------------------------
// Subtitle generators
// ---------------------------------------------------------------------------

function generateSrt(segments: SegmentLike[]): string {
  return segments
    .map((seg, i) => {
      const num = i + 1
      return `${num}\n${msToSrt(seg.startMs)} --> ${msToSrt(seg.endMs)}\n${seg.text.trim()}\n`
    })
    .join('\n')
}

function generateVtt(segments: SegmentLike[]): string {
  const header = 'WEBVTT\n\n'
  const body = segments
    .map((seg) => {
      return `${msToVtt(seg.startMs)} --> ${msToVtt(seg.endMs)}\n${seg.text.trim()}\n`
    })
    .join('\n')
  return header + body
}

function generateAss(segments: SegmentLike[]): string {
  const header = `[Script Info]
Title: Cheggie Studios Subtitle
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`

  const dialogues = segments
    .map((seg) => {
      const text = seg.text.trim().replace(/\n/g, '\\N')
      return `Dialogue: 0,${msToAss(seg.startMs)},${msToAss(seg.endMs)},Default,,0,0,0,,${text}`
    })
    .join('\n')

  return header + dialogues + '\n'
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function findJobRecord(projectId: string, bullJobId: string): Promise<string | null> {
  const record = await prisma.jobRecord.findFirst({
    where: {
      projectId,
      type: 'subtitle',
      status: { in: ['PENDING', 'PROCESSING'] },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  return record?.id ?? bullJobId ?? null
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

const worker = new Worker<SubtitleJobData>(
  'subtitle',
  async (job) => {
    const { projectId, transcriptId, format } = job.data

    logger.info('[subtitle-worker] Job started', {
      jobId: job.id,
      projectId,
      transcriptId,
      format,
    })

    const jobRecordId = await findJobRecord(projectId, job.id ?? '')

    // Mark JobRecord → PROCESSING
    if (jobRecordId) {
      await prisma.jobRecord.update({
        where: { id: jobRecordId },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
          attempt: { increment: 1 },
        },
      })
    }

    // 2. Update Project.subtitleStatus → PROCESSING
    await prisma.project.update({
      where: { id: projectId },
      data: { subtitleStatus: 'PROCESSING' },
    })

    try {
      // 3. Fetch Transcript + ordered segments
      const transcript = await prisma.transcript.findUnique({
        where: { id: transcriptId },
        include: {
          segments: {
            orderBy: { index: 'asc' },
          },
        },
      })

      if (!transcript) {
        throw new NotFoundError(`Transcript ${transcriptId} not found`, 'TRANSCRIPT_NOT_FOUND')
      }

      // 4. Generate subtitle content
      let content: string
      switch (format) {
        case 'SRT':
          content = generateSrt(transcript.segments)
          break
        case 'VTT':
          content = generateVtt(transcript.segments)
          break
        case 'ASS':
          content = generateAss(transcript.segments)
          break
        default: {
          const exhaustive: never = format
          throw new JobError(`Unknown subtitle format: ${String(exhaustive)}`, 'UNKNOWN_FORMAT')
        }
      }

      // 5. Create SubtitleAsset record
      const subtitleAsset = await prisma.subtitleAsset.create({
        data: {
          projectId,
          format: format as 'SRT' | 'VTT' | 'ASS',
          content,
          language: transcript.language,
          status: 'READY',
        },
        select: { id: true },
      })

      // 6. Update Project.subtitleStatus → READY
      await prisma.project.update({
        where: { id: projectId },
        data: { subtitleStatus: 'READY' },
      })

      // 7. Update JobRecord → COMPLETED
      if (jobRecordId) {
        await prisma.jobRecord.update({
          where: { id: jobRecordId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            result: { subtitleAssetId: subtitleAsset.id, format },
          },
        })
      }

      logger.info('[subtitle-worker] Job completed', {
        jobId: job.id,
        projectId,
        subtitleAssetId: subtitleAsset.id,
        format,
      })

      return { subtitleAssetId: subtitleAsset.id }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      logger.error('[subtitle-worker] Job failed', err, { jobId: job.id, projectId })

      // 8. Error — update statuses
      await Promise.allSettled([
        prisma.project.update({
          where: { id: projectId },
          data: { subtitleStatus: 'ERROR' },
        }),
        jobRecordId
          ? prisma.jobRecord.update({
              where: { id: jobRecordId },
              data: {
                status: 'FAILED',
                error: message,
                completedAt: new Date(),
              },
            })
          : Promise.resolve(),
      ])

      throw err instanceof JobError ? err : new JobError(message, 'SUBTITLE_FAILED')
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env['QUEUE_CONCURRENCY_SUBTITLE'] ?? '4', 10),
  },
)

worker.on('failed', (job, err) => {
  logger.error('[subtitle-worker] Worker reported failure', err, {
    jobId: job?.id,
    projectId: job?.data?.projectId,
  })
})

worker.on('completed', (job) => {
  logger.info('[subtitle-worker] Worker confirmed completion', {
    jobId: job.id,
    projectId: job.data.projectId,
    format: job.data.format,
  })
})

worker.on('error', (err) => {
  logger.error('[subtitle-worker] Worker error', err)
})

logger.info('[subtitle-worker] Worker started', {
  concurrency: parseInt(process.env['QUEUE_CONCURRENCY_SUBTITLE'] ?? '4', 10),
})

export { worker as subtitleWorker }
