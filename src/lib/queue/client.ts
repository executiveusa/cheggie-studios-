import { Queue, Worker, type Processor } from 'bullmq'
import IORedis from 'ioredis'
import { env } from '@/lib/env'

// ---------------------------------------------------------------------------
// Redis connection — shared across all queues and workers
// maxRetriesPerRequest: null is required by BullMQ
// ---------------------------------------------------------------------------

export const redisConnection: IORedis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
})

redisConnection.on('error', (err: Error) => {
  console.error('[redis] connection error', { message: err.message })
})

// ---------------------------------------------------------------------------
// Queue factory
// ---------------------------------------------------------------------------

export function createQueue<TData = unknown, TResult = unknown>(
  name: string,
): Queue<TData, TResult> {
  return new Queue<TData, TResult>(name, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  })
}

// ---------------------------------------------------------------------------
// Worker factory
// ---------------------------------------------------------------------------

export function createWorker<TData = unknown, TResult = unknown>(
  name: string,
  processor: Processor<TData, TResult>,
  concurrency = 2,
): Worker<TData, TResult> {
  const worker = new Worker<TData, TResult>(name, processor, {
    connection: redisConnection,
    concurrency,
    autorun: true,
  })

  worker.on('failed', (job, err) => {
    console.error('[worker] job failed', {
      queue: name,
      jobId: job?.id,
      attempt: job?.attemptsMade,
      error: err.message,
    })
  })

  worker.on('error', (err) => {
    console.error('[worker] worker error', { queue: name, error: err.message })
  })

  return worker
}
