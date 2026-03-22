/**
 * export-worker.ts
 *
 * BullMQ worker that generates export files (TXT, JSON, SRT, VTT, story JSON,
 * metadata JSON) and uploads them to the configured storage adapter, then
 * persists an ExportAsset record.
 */

import { Worker } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import IORedis from 'ioredis'

import { storage } from '../src/lib/storage'
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
  logger.error('[export-worker] Redis connection error', err, { jobId: 'redis' })
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportJobData {
  projectId: string
  type: string
  transcriptId?: string
  storyId?: string
}

// ---------------------------------------------------------------------------
// Time helpers (for subtitle generation within export)
// ---------------------------------------------------------------------------

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

function msToVtt(ms: number): string {
  return msToSrt(ms).replace(',', '.')
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function findJobRecord(projectId: string, bullJobId: string): Promise<string | null> {
  const record = await prisma.jobRecord.findFirst({
    where: {
      projectId,
      type: 'export',
      status: { in: ['PENDING', 'PROCESSING'] },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  return record?.id ?? bullJobId ?? null
}

// ---------------------------------------------------------------------------
// Content generators
// ---------------------------------------------------------------------------

async function generateTranscriptTxt(transcriptId: string): Promise<string> {
  const transcript = await prisma.transcript.findUnique({
    where: { id: transcriptId },
    select: { rawText: true, language: true, createdAt: true },
  })
  if (!transcript) throw new NotFoundError(`Transcript ${transcriptId} not found`)
  return [
    `Language: ${transcript.language}`,
    `Generated: ${transcript.createdAt.toISOString()}`,
    '',
    transcript.rawText ?? '',
  ].join('\n')
}

async function generateTranscriptJson(transcriptId: string): Promise<string> {
  const transcript = await prisma.transcript.findUnique({
    where: { id: transcriptId },
    include: {
      segments: { orderBy: { index: 'asc' } },
    },
  })
  if (!transcript) throw new NotFoundError(`Transcript ${transcriptId} not found`)

  return JSON.stringify(
    {
      id: transcript.id,
      language: transcript.language,
      rawText: transcript.rawText,
      wordCount: transcript.wordCount,
      durationMs: transcript.durationMs,
      engineUsed: transcript.engineUsed,
      confidence: transcript.confidence,
      segments: transcript.segments.map((seg) => ({
        index: seg.index,
        startMs: seg.startMs,
        endMs: seg.endMs,
        text: seg.text,
        speaker: seg.speaker,
        confidence: seg.confidence,
        keywords: seg.keywords,
      })),
    },
    null,
    2,
  )
}

async function generateSubtitleSrt(transcriptId: string): Promise<string> {
  const segments = await prisma.transcriptSegment.findMany({
    where: { transcriptId },
    orderBy: { index: 'asc' },
  })
  return segments
    .map((seg, i) => {
      const num = i + 1
      return `${num}\n${msToSrt(seg.startMs)} --> ${msToSrt(seg.endMs)}\n${seg.text.trim()}\n`
    })
    .join('\n')
}

async function generateSubtitleVtt(transcriptId: string): Promise<string> {
  const segments = await prisma.transcriptSegment.findMany({
    where: { transcriptId },
    orderBy: { index: 'asc' },
  })
  const body = segments
    .map((seg) => `${msToVtt(seg.startMs)} --> ${msToVtt(seg.endMs)}\n${seg.text.trim()}\n`)
    .join('\n')
  return 'WEBVTT\n\n' + body
}

async function generateStoryJson(storyId: string): Promise<string> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: {
      segments: {
        orderBy: { position: 'asc' },
        include: {
          transcriptSegment: true,
        },
      },
    },
  })
  if (!story) throw new NotFoundError(`Story ${storyId} not found`)

  return JSON.stringify(
    {
      id: story.id,
      projectId: story.projectId,
      title: story.title,
      status: story.status,
      notes: story.notes,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
      segments: story.segments.map((seg) => ({
        id: seg.id,
        position: seg.position,
        inlineText: seg.inlineText,
        notes: seg.notes,
        label: seg.label,
        transcriptSegment: seg.transcriptSegment
          ? {
              index: seg.transcriptSegment.index,
              startMs: seg.transcriptSegment.startMs,
              endMs: seg.transcriptSegment.endMs,
              text: seg.transcriptSegment.text,
              speaker: seg.transcriptSegment.speaker,
              keywords: seg.transcriptSegment.keywords,
            }
          : null,
      })),
    },
    null,
    2,
  )
}

async function generateMetadataJson(projectId: string): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      description: true,
      language: true,
      tags: true,
      status: true,
      transcriptStatus: true,
      subtitleStatus: true,
      searchStatus: true,
      exportStatus: true,
      sourceFileName: true,
      sourceFileMime: true,
      sourceFileSizeBytes: true,
      durationMs: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!project) throw new NotFoundError(`Project ${projectId} not found`)
  return JSON.stringify(project, null, 2)
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

const worker = new Worker<ExportJobData>(
  'export',
  async (job) => {
    const { projectId, type, transcriptId, storyId } = job.data

    logger.info('[export-worker] Job started', { jobId: job.id, projectId, type })

    const jobRecordId = await findJobRecord(projectId, job.id ?? '')

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

    try {
      // 2. Generate content based on type
      let content: string
      let mimeType: string
      let extension: string

      switch (type) {
        case 'TRANSCRIPT_TXT': {
          if (!transcriptId) throw new JobError('transcriptId required for TRANSCRIPT_TXT', 'MISSING_PARAM')
          content = await generateTranscriptTxt(transcriptId)
          mimeType = 'text/plain'
          extension = 'txt'
          break
        }
        case 'TRANSCRIPT_JSON': {
          if (!transcriptId) throw new JobError('transcriptId required for TRANSCRIPT_JSON', 'MISSING_PARAM')
          content = await generateTranscriptJson(transcriptId)
          mimeType = 'application/json'
          extension = 'json'
          break
        }
        case 'SUBTITLE_SRT': {
          if (!transcriptId) throw new JobError('transcriptId required for SUBTITLE_SRT', 'MISSING_PARAM')
          content = await generateSubtitleSrt(transcriptId)
          mimeType = 'text/plain'
          extension = 'srt'
          break
        }
        case 'SUBTITLE_VTT': {
          if (!transcriptId) throw new JobError('transcriptId required for SUBTITLE_VTT', 'MISSING_PARAM')
          content = await generateSubtitleVtt(transcriptId)
          mimeType = 'text/vtt'
          extension = 'vtt'
          break
        }
        case 'STORY_JSON': {
          if (!storyId) throw new JobError('storyId required for STORY_JSON', 'MISSING_PARAM')
          content = await generateStoryJson(storyId)
          mimeType = 'application/json'
          extension = 'json'
          break
        }
        case 'METADATA_JSON': {
          content = await generateMetadataJson(projectId)
          mimeType = 'application/json'
          extension = 'json'
          break
        }
        default:
          throw new JobError(`Unknown export type: ${type}`, 'UNKNOWN_EXPORT_TYPE')
      }

      // 3. Upload to storage
      const key = `exports/${projectId}/${type.toLowerCase()}-${Date.now()}.${extension}`
      const buffer = Buffer.from(content, 'utf-8')

      const uploadResult = await storage.upload(key, buffer, mimeType)

      // 4. Create ExportAsset record
      const exportAsset = await prisma.exportAsset.create({
        data: {
          projectId,
          type: type as Parameters<typeof prisma.exportAsset.create>[0]['data']['type'],
          url: uploadResult.url,
          sizeBytes: uploadResult.sizeBytes,
          status: 'READY',
        },
        select: { id: true },
      })

      // 5. Update Project.exportStatus → READY
      await prisma.project.update({
        where: { id: projectId },
        data: { exportStatus: 'READY' },
      })

      // 6. Update JobRecord → COMPLETED
      if (jobRecordId) {
        await prisma.jobRecord.update({
          where: { id: jobRecordId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            result: {
              exportAssetId: exportAsset.id,
              url: uploadResult.url,
              sizeBytes: uploadResult.sizeBytes,
            },
          },
        })
      }

      logger.info('[export-worker] Job completed', {
        jobId: job.id,
        projectId,
        exportAssetId: exportAsset.id,
        type,
        sizeBytes: uploadResult.sizeBytes,
      })

      return { exportAssetId: exportAsset.id, url: uploadResult.url }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      logger.error('[export-worker] Job failed', err, { jobId: job.id, projectId, type })

      await Promise.allSettled([
        prisma.project.update({
          where: { id: projectId },
          data: { exportStatus: 'ERROR' },
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

      throw err instanceof JobError ? err : new JobError(message, 'EXPORT_FAILED')
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env['QUEUE_CONCURRENCY_EXPORT'] ?? '2', 10),
  },
)

worker.on('failed', (job, err) => {
  logger.error('[export-worker] Worker reported failure', err, {
    jobId: job?.id,
    projectId: job?.data?.projectId,
  })
})

worker.on('completed', (job) => {
  logger.info('[export-worker] Worker confirmed completion', {
    jobId: job.id,
    projectId: job.data.projectId,
    type: job.data.type,
  })
})

worker.on('error', (err) => {
  logger.error('[export-worker] Worker error', err)
})

logger.info('[export-worker] Worker started', {
  concurrency: parseInt(process.env['QUEUE_CONCURRENCY_EXPORT'] ?? '2', 10),
})

export { worker as exportWorker }
