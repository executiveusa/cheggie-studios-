/**
 * comfyui-worker.ts
 *
 * Stub BullMQ worker for future ComfyUI avatar / image generation integration.
 * When COMFYUI_ENABLED=false (default) every job is immediately marked FAILED
 * with an informative message.  When enabled, the worker makes a best-effort
 * HTTP call to the ComfyUI server and logs the outcome.
 */

import { Worker } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import IORedis from 'ioredis'

import { logger } from '../src/lib/telemetry/logger'

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
  logger.error('[comfyui-worker] Redis connection error', err, { jobId: 'redis' })
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComfyUIJobData {
  projectId: string
  prompt: string
  workflow: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// DB helper
// ---------------------------------------------------------------------------

async function findJobRecord(projectId: string, bullJobId: string): Promise<string | null> {
  const record = await prisma.jobRecord.findFirst({
    where: {
      projectId,
      type: 'comfyui',
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

const COMFYUI_ENABLED = process.env['COMFYUI_ENABLED'] === 'true'
const COMFYUI_URL = (process.env['COMFYUI_URL'] ?? 'http://localhost:8188').replace(/\/$/, '')

const worker = new Worker<ComfyUIJobData>(
  'comfyui',
  async (job) => {
    const { projectId, prompt, workflow } = job.data

    logger.info('[comfyui-worker] Job received', {
      jobId: job.id,
      projectId,
      enabled: COMFYUI_ENABLED,
    })

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

    // 2. Check if integration is enabled
    if (!COMFYUI_ENABLED) {
      const disabledMsg = 'ComfyUI integration not yet enabled'

      logger.warn('[comfyui-worker] Integration disabled — marking job as FAILED', {
        jobId: job.id,
        projectId,
      })

      // 3. Mark as FAILED with informative message
      if (jobRecordId) {
        await prisma.jobRecord.update({
          where: { id: jobRecordId },
          data: {
            status: 'FAILED',
            error: disabledMsg,
            completedAt: new Date(),
          },
        })
      }

      // Throw so BullMQ also marks the job as failed
      throw new Error(disabledMsg)
    }

    // 4. Integration is enabled — stub HTTP call to ComfyUI
    logger.info('[comfyui-worker] Submitting workflow to ComfyUI', {
      jobId: job.id,
      projectId,
      comfyuiUrl: COMFYUI_URL,
      prompt: prompt.slice(0, 80),
    })

    let comfyResponse: unknown = null
    let comfyError: string | null = null

    try {
      const response = await fetch(`${COMFYUI_URL}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env['COMFYUI_API_KEY']
            ? { Authorization: `Bearer ${process.env['COMFYUI_API_KEY']}` }
            : {}),
        },
        body: JSON.stringify({
          prompt: workflow,
          client_id: `cheggie-${projectId}`,
        }),
        signal: AbortSignal.timeout(60_000),
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '(unreadable)')
        comfyError = `ComfyUI returned ${response.status}: ${body}`
      } else {
        comfyResponse = await response.json()
      }
    } catch (fetchErr) {
      comfyError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
    }

    // 5. Log the attempt regardless of outcome
    logger.info('[comfyui-worker] ComfyUI call completed', {
      jobId: job.id,
      projectId,
      success: comfyError === null,
      error: comfyError,
    })

    if (comfyError) {
      if (jobRecordId) {
        await prisma.jobRecord.update({
          where: { id: jobRecordId },
          data: {
            status: 'FAILED',
            error: comfyError,
            completedAt: new Date(),
          },
        })
      }
      throw new Error(`ComfyUI job failed: ${comfyError}`)
    }

    // Success path
    if (jobRecordId) {
      await prisma.jobRecord.update({
        where: { id: jobRecordId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          result: comfyResponse as Record<string, unknown>,
        },
      })
    }

    logger.info('[comfyui-worker] Job completed', { jobId: job.id, projectId })

    return { projectId, comfyResponse }
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
)

worker.on('failed', (job, err) => {
  logger.error('[comfyui-worker] Worker reported failure', err, {
    jobId: job?.id,
    projectId: job?.data?.projectId,
  })
})

worker.on('completed', (job) => {
  logger.info('[comfyui-worker] Worker confirmed completion', {
    jobId: job.id,
    projectId: job.data.projectId,
  })
})

worker.on('error', (err) => {
  logger.error('[comfyui-worker] Worker error', err)
})

logger.info('[comfyui-worker] Worker started', { enabled: COMFYUI_ENABLED, comfyuiUrl: COMFYUI_URL })

export { worker as comfyuiWorker }
