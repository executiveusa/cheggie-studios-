import { Queue, Worker, type Processor } from 'bullmq'
import IORedis from 'ioredis'

// ---------------------------------------------------------------------------
// Redis connection — shared across all queues and workers
// maxRetriesPerRequest: null is required by BullMQ
// ---------------------------------------------------------------------------

function getRedisUrl(): string {
  const url = process.env['REDIS_URL']
  if (!url) {
    throw new Error('REDIS_URL environment variable is not set')
  }
  return url
}

let _redisConnection: IORedis | null = null

export function getRedisConnection(): IORedis {
  if (!_redisConnection) {
    _redisConnection = new IORedis(getRedisUrl(), {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
    })

    _redisConnection.on('error', (err: Error) => {
      console.error('[redis] connection error', { message: err.message })
    })
  }

  return _redisConnection
}

export const redisConnection: IORedis = new IORedis(
  (() => {
    const url = process.env['REDIS_URL']
    if (!url) {
      // Return a placeholder URL for build-time — actual connection happens at runtime
      return 'redis://localhost:6379'
    }
    return url
  })(),
  {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  },
)

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
