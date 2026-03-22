/**
 * search-worker.ts
 *
 * BullMQ worker that indexes transcript segments for search by extracting
 * keywords from each segment's text (stop-word filtered, frequency-ranked)
 * and persisting them back to TranscriptSegment.keywords.
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
  logger.error('[search-worker] Redis connection error', err, { jobId: 'redis' })
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchJobData {
  projectId: string
  transcriptId: string
}

// ---------------------------------------------------------------------------
// Serbian stop words
// ---------------------------------------------------------------------------

const SERBIAN_STOP_WORDS = new Set([
  'i', 'u', 'na', 'je', 'se', 'da', 'za', 'sa', 'od', 'do',
  'po', 'su', 'bi', 'ga', 'mu', 'ni', 'ne', 'to', 'što',
  'koji', 'koja', 'koje', 'ali', 'ili', 'kao', 'već',
  'ovo', 'ova', 'ove', 'taj', 'ta', 'te', 'ti',
  // Additional common Serbian function words
  'sam', 'smo', 'ste', 'su', 'bih', 'bi', 'bismo', 'biste',
  'li', 'pa', 'no', 'a', 'e', 'o', 've', 'ove', 'ovi',
  'iz', 'pri', 'nad', 'pod', 'pre', 'bez', 'kroz', 'pored',
  'jedan', 'jedna', 'jedno', 'neki', 'neka', 'neko',
  'sve', 'svi', 'svaki', 'svaka', 'svako',
  'ovaj', 'ova', 'ovo', 'taj', 'ta', 'to',
  'the', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'with', 'of',
])

// Minimum length for a token to be considered a keyword
const MIN_KEYWORD_LENGTH = 3

// Maximum keywords per segment
const MAX_KEYWORDS_PER_SEGMENT = 10

// ---------------------------------------------------------------------------
// Keyword extraction
// ---------------------------------------------------------------------------

/**
 * Extract keywords from a text string using:
 * 1. Tokenisation (split on whitespace and punctuation)
 * 2. Lowercase normalisation
 * 3. Stop-word filtering (Serbian + common English)
 * 4. Word-frequency ranking
 * 5. Top-N selection
 */
function extractKeywords(text: string, topN = MAX_KEYWORDS_PER_SEGMENT): string[] {
  // Tokenise: strip punctuation, lowercase, split on whitespace
  const tokens = text
    .toLowerCase()
    .replace(/[.,!?;:"""''()\[\]{}<>\/\\@#$%^&*+=|`~]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= MIN_KEYWORD_LENGTH)
    .filter((token) => !SERBIAN_STOP_WORDS.has(token))
    // Strip leading/trailing hyphens and numbers-only tokens
    .map((token) => token.replace(/^[-]+|[-]+$/g, ''))
    .filter((token) => token.length >= MIN_KEYWORD_LENGTH)
    .filter((token) => !/^\d+$/.test(token))

  if (tokens.length === 0) return []

  // Count frequency
  const freq = new Map<string, number>()
  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1)
  }

  // Sort by frequency descending, then alphabetically for stability
  const sorted = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([word]) => word)

  return sorted.slice(0, topN)
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function findJobRecord(projectId: string, bullJobId: string): Promise<string | null> {
  const record = await prisma.jobRecord.findFirst({
    where: {
      projectId,
      type: 'search',
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

const worker = new Worker<SearchJobData>(
  'search',
  async (job) => {
    const { projectId, transcriptId } = job.data

    logger.info('[search-worker] Job started', { jobId: job.id, projectId, transcriptId })

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
      // 2. Fetch all TranscriptSegments for the transcript
      const segments = await prisma.transcriptSegment.findMany({
        where: { transcriptId },
        orderBy: { index: 'asc' },
        select: { id: true, text: true, index: true },
      })

      if (segments.length === 0) {
        // Not necessarily an error — empty transcript is valid
        logger.warn('[search-worker] No segments found for transcript', {
          transcriptId,
          projectId,
        })
        // Verify the transcript actually exists so we can distinguish
        const exists = await prisma.transcript.findUnique({
          where: { id: transcriptId },
          select: { id: true },
        })
        if (!exists) {
          throw new NotFoundError(`Transcript ${transcriptId} not found`, 'TRANSCRIPT_NOT_FOUND')
        }
      }

      // 3. Extract keywords and 4. Update each segment
      let totalKeywords = 0

      for (const segment of segments) {
        const keywords = extractKeywords(segment.text)
        totalKeywords += keywords.length

        await prisma.transcriptSegment.update({
          where: { id: segment.id },
          data: { keywords },
        })
      }

      logger.info('[search-worker] Keywords extracted', {
        transcriptId,
        segmentCount: segments.length,
        totalKeywords,
      })

      // 5. Update Project.searchStatus → READY
      await prisma.project.update({
        where: { id: projectId },
        data: { searchStatus: 'READY' },
      })

      // 6. Update JobRecord → COMPLETED
      if (jobRecordId) {
        await prisma.jobRecord.update({
          where: { id: jobRecordId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            result: {
              transcriptId,
              segmentCount: segments.length,
              totalKeywords,
            },
          },
        })
      }

      logger.info('[search-worker] Job completed', {
        jobId: job.id,
        projectId,
        transcriptId,
        segmentCount: segments.length,
      })

      return { segmentCount: segments.length, totalKeywords }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      logger.error('[search-worker] Job failed', err, {
        jobId: job.id,
        projectId,
        transcriptId,
      })

      await Promise.allSettled([
        prisma.project.update({
          where: { id: projectId },
          data: { searchStatus: 'ERROR' },
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

      throw err instanceof JobError ? err : new JobError(message, 'SEARCH_INDEX_FAILED')
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env['QUEUE_CONCURRENCY_SEARCH'] ?? '4', 10),
  },
)

worker.on('failed', (job, err) => {
  logger.error('[search-worker] Worker reported failure', err, {
    jobId: job?.id,
    projectId: job?.data?.projectId,
  })
})

worker.on('completed', (job) => {
  logger.info('[search-worker] Worker confirmed completion', {
    jobId: job.id,
    projectId: job.data.projectId,
    transcriptId: job.data.transcriptId,
  })
})

worker.on('error', (err) => {
  logger.error('[search-worker] Worker error', err)
})

logger.info('[search-worker] Worker started', {
  concurrency: parseInt(process.env['QUEUE_CONCURRENCY_SEARCH'] ?? '4', 10),
})

export { worker as searchWorker }
