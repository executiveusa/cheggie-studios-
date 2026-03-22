import Redis from 'ioredis'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: Date
}

// ---------------------------------------------------------------------------
// Redis client — lazy singleton with in-memory fallback
// ---------------------------------------------------------------------------

let redis: Redis | null = null
let redisAvailable = true

function getRedis(): Redis | null {
  if (!redisAvailable) return null

  if (!redis) {
    try {
      const url = process.env.REDIS_URL ?? 'redis://localhost:6379'
      redis = new Redis(url, {
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        lazyConnect: true,
        enableOfflineQueue: false,
      })

      redis.on('error', () => {
        redisAvailable = false
        redis = null
      })
    } catch {
      redisAvailable = false
      return null
    }
  }

  return redis
}

// ---------------------------------------------------------------------------
// In-memory fallback store
// ---------------------------------------------------------------------------

interface MemoryEntry {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, MemoryEntry>()

// Periodically clean up expired entries to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetAt <= now) {
      memoryStore.delete(key)
    }
  }
}, 60_000)

function rateLimitMemory(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const existing = memoryStore.get(identifier)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs
    memoryStore.set(identifier, { count: 1, resetAt })
    return { success: true, remaining: limit - 1, resetAt: new Date(resetAt) }
  }

  existing.count += 1

  if (existing.count > limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: new Date(existing.resetAt),
    }
  }

  return {
    success: true,
    remaining: limit - existing.count,
    resetAt: new Date(existing.resetAt),
  }
}

// ---------------------------------------------------------------------------
// Redis sliding window counter
// ---------------------------------------------------------------------------

async function rateLimitRedis(
  client: Redis,
  identifier: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - windowMs
  const key = `rl:${identifier}`

  // Lua script for atomic sliding window
  const script = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local windowStart = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local windowMs = tonumber(ARGV[4])

    -- Remove expired entries
    redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

    -- Count current requests
    local count = redis.call('ZCARD', key)

    if count < limit then
      -- Add current request
      redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
      redis.call('PEXPIRE', key, windowMs)
      return { 1, limit - count - 1, now + windowMs }
    else
      -- Get oldest entry to calculate reset time
      local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
      local resetAt = now + windowMs
      if #oldest > 1 then
        resetAt = tonumber(oldest[2]) + windowMs
      end
      return { 0, 0, resetAt }
    end
  `

  const result = (await client.eval(
    script,
    1,
    key,
    String(now),
    String(windowStart),
    String(limit),
    String(windowMs)
  )) as [number, number, number]

  return {
    success: result[0] === 1,
    remaining: result[1] ?? 0,
    resetAt: new Date(result[2] ?? now + windowMs),
  }
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Check rate limit for a given identifier using a sliding window algorithm.
 * Falls back to an in-memory store if Redis is unavailable.
 *
 * @param identifier  Unique key (e.g. IP address, user ID, route)
 * @param limit       Maximum number of requests allowed in the window
 * @param windowMs    Time window in milliseconds (default: 60 000 ms)
 */
export async function rateLimit(
  identifier: string,
  limit = 100,
  windowMs = 60_000
): Promise<RateLimitResult> {
  const client = getRedis()

  if (!client) {
    return rateLimitMemory(identifier, limit, windowMs)
  }

  try {
    // Ensure the connection is live
    if (client.status !== 'ready') {
      await client.connect()
    }
    return await rateLimitRedis(client, identifier, limit, windowMs)
  } catch {
    // Degrade gracefully to in-memory
    return rateLimitMemory(identifier, limit, windowMs)
  }
}

// ---------------------------------------------------------------------------
// Pre-configured limiters
// ---------------------------------------------------------------------------

/**
 * Auth routes: 10 attempts per 15 minutes per identifier.
 */
export async function authRateLimit(identifier: string): Promise<RateLimitResult> {
  return rateLimit(`auth:${identifier}`, 10, 15 * 60 * 1000)
}

/**
 * File uploads: 20 uploads per hour per user.
 */
export async function uploadRateLimit(identifier: string): Promise<RateLimitResult> {
  return rateLimit(`upload:${identifier}`, 20, 60 * 60 * 1000)
}

/**
 * General API: 100 requests per minute per identifier.
 */
export async function apiRateLimit(identifier: string): Promise<RateLimitResult> {
  return rateLimit(`api:${identifier}`, 100, 60 * 1000)
}
