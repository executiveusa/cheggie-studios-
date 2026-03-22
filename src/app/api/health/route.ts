import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/telemetry/logger'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error'
  timestamp: string
  version: string
  environment: string
  checks: {
    database: 'ok' | 'error'
    redis: 'ok' | 'error' | 'unavailable'
  }
}

async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

async function checkRedis(): Promise<'ok' | 'error' | 'unavailable'> {
  const redisUrl = env.REDIS_URL
  if (!redisUrl) return 'unavailable'

  try {
    const { default: Redis } = await import('ioredis')
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
      enableOfflineQueue: false,
    })

    try {
      await client.connect()
      await client.ping()
      await client.quit()
      return 'ok'
    } catch {
      try { await client.quit() } catch { /* ignore */ }
      return 'error'
    }
  } catch {
    return 'unavailable'
  }
}

export async function GET(): Promise<NextResponse> {
  const [dbOk, redisStatus] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ])

  const checks: HealthStatus['checks'] = {
    database: dbOk ? 'ok' : 'error',
    redis: redisStatus,
  }

  const allCriticalOk = dbOk

  const status: HealthStatus['status'] = allCriticalOk
    ? (redisStatus === 'error' ? 'degraded' : 'ok')
    : 'error'

  const body: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.0.0',
    environment: env.NODE_ENV,
    checks,
  }

  if (!allCriticalOk) {
    logger.error('Health check failed: database unavailable', undefined, {})
    return NextResponse.json(body, { status: 503 })
  }

  return NextResponse.json(body, { status: 200 })
}
