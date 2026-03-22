/**
 * transcript-worker.ts
 *
 * BullMQ worker that processes audio/video transcription jobs.
 * Picks jobs off the 'transcript' queue, calls Whisper (or mock),
 * persists Transcript + TranscriptSegment records, then dispatches
 * a downstream search-indexing job.
 */

import { Worker } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import IORedis from 'ioredis'

import { transcribeWithWhisper } from '../src/lib/ai/whisper'
import { logger } from '../src/lib/telemetry/logger'
import { JobError } from '../src/lib/errors'

// ---------------------------------------------------------------------------
// Bootstrap — standalone process, instantiate own clients
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
  logger.error('[transcript-worker] Redis connection error', err, { jobId: 'redis' })
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TranscriptJobData {
  projectId: string
  fileUrl: string
  language: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the most recent PENDING/PROCESSING JobRecord for a project and type,
 * falling back to the Bull job id if no DB record is found.
 */
async function findJobRecord(projectId: string, bullJobId: string): Promise<string | null> {
  const record = await prisma.jobRecord.findFirst({
    where: {
      projectId,
      type: 'transcript',
      status: { in: ['PENDING', 'PROCESSING'] },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  return record?.id ?? bullJobId ?? null
}

async function dispatchSearchJob(projectId: string, transcriptId: string): Promise<void> {
  // Inline dispatch so this worker has no circular dep on src/lib/queue/jobs
  const { searchQueue } = await import('../src/lib/queue/queues')

  const record = await prisma.jobRecord.create({
    data: {
      type: 'search',
      status: 'PENDING',
      projectId,
      payload: { projectId, transcriptId },
    },
    select: { id: true },
  })

  const bullJob = await searchQueue.add(
    'index',
    { projectId, transcriptId },
    { jobId: `search:${transcriptId}:${Date.now()}` },
  )

  await prisma.jobRecord.update({
    where: { id: record.id },
    data: { jobId: bullJob.id ?? record.id },
  })

  logger.info('[transcript-worker] Search job dispatched', { projectId, transcriptId })
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

const worker = new Worker<TranscriptJobData>(
  'transcript',
  async (job) => {
    const { projectId, fileUrl, language } = job.data

    logger.info('[transcript-worker] Job started', {
      jobId: job.id,
      projectId,
    })

    // Locate the matching JobRecord (created by the dispatcher before enqueue)
    const jobRecordId = await findJobRecord(projectId, job.id ?? '')

    // 2. Mark JobRecord → PROCESSING
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

    // 3. Mark Project.transcriptStatus → PROCESSING
    await prisma.project.update({
      where: { id: projectId },
      data: { transcriptStatus: 'PROCESSING' },
    })

    try {
      // 4. Call Whisper (real API, OpenAI, or mock)
      const result = await transcribeWithWhisper(fileUrl, language)

      const wordCount = result.text
        .split(/\s+/)
        .filter((w) => w.length > 0).length

      const lastSeg = result.segments[result.segments.length - 1]
      const durationMs = lastSeg ? Math.round(lastSeg.end * 1000) : undefined

      // 5. Create Transcript record
      const transcript = await prisma.transcript.create({
        data: {
          projectId,
          language: result.language,
          rawText: result.text,
          structuredJson: result.segments as unknown as Parameters<typeof prisma.transcript.create>[0]['data']['structuredJson'],
          wordCount,
          durationMs,
          engineUsed: result.engineUsed,
          confidence: result.confidence ?? null,
          status: 'PROCESSING',
        },
        select: { id: true },
      })

      // 6. Create TranscriptSegment records
      if (result.segments.length > 0) {
        await prisma.transcriptSegment.createMany({
          data: result.segments.map((seg, idx) => ({
            transcriptId: transcript.id,
            index: idx,
            startMs: Math.round(seg.start * 1000),
            endMs: Math.round(seg.end * 1000),
            text: seg.text,
            speaker: seg.speaker ?? null,
            confidence: result.confidence ?? null,
            keywords: [],
          })),
        })
      }

      // 7. Update Transcript.status → READY
      await prisma.transcript.update({
        where: { id: transcript.id },
        data: { status: 'READY' },
      })

      // 8. Update Project.transcriptStatus → READY
      await prisma.project.update({
        where: { id: projectId },
        data: { transcriptStatus: 'READY' },
      })

      // 9. Dispatch search indexing job
      await dispatchSearchJob(projectId, transcript.id)

      // 10. Update JobRecord → COMPLETED
      if (jobRecordId) {
        await prisma.jobRecord.update({
          where: { id: jobRecordId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            result: { transcriptId: transcript.id, wordCount, durationMs },
          },
        })
      }

      logger.info('[transcript-worker] Job completed', {
        jobId: job.id,
        projectId,
        transcriptId: transcript.id,
        wordCount,
        engineUsed: result.engineUsed,
      })

      return { transcriptId: transcript.id }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      logger.error('[transcript-worker] Job failed', err, { jobId: job.id, projectId })

      // 11. Error — update statuses
      await Promise.allSettled([
        prisma.transcript.updateMany({
          where: { projectId },
          data: { status: 'ERROR' },
        }),
        prisma.project.update({
          where: { id: projectId },
          data: { transcriptStatus: 'ERROR' },
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

      throw new JobError(message, 'TRANSCRIPT_FAILED')
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env['QUEUE_CONCURRENCY_TRANSCRIPT'] ?? '2', 10),
  },
)

worker.on('failed', (job, err) => {
  logger.error('[transcript-worker] Worker reported failure', err, {
    jobId: job?.id,
    projectId: job?.data?.projectId,
  })
})

worker.on('completed', (job) => {
  logger.info('[transcript-worker] Worker confirmed completion', {
    jobId: job.id,
    projectId: job.data.projectId,
  })
})

worker.on('error', (err) => {
  logger.error('[transcript-worker] Worker error', err)
})

logger.info('[transcript-worker] Worker started', {
  concurrency: parseInt(process.env['QUEUE_CONCURRENCY_TRANSCRIPT'] ?? '2', 10),
})

export { worker as transcriptWorker }
