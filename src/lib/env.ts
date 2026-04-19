import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const envSchema = z.object({
  // -------------------------------------------------------------------------
  // Core
  // -------------------------------------------------------------------------
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),

  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required.'),

  // -------------------------------------------------------------------------
  // Redis
  // -------------------------------------------------------------------------
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // -------------------------------------------------------------------------
  // Storage
  // -------------------------------------------------------------------------
  STORAGE_ADAPTER: z.enum(['local', 's3']).default('local'),
  LOCAL_STORAGE_PATH: z.string().default('./uploads'),

  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),

  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(500),

  // -------------------------------------------------------------------------
  // AI / Transcription
  // -------------------------------------------------------------------------
  OPENAI_API_KEY: z.string().optional(),
  WHISPER_API_URL: z.string().default('http://localhost:8000'),
  WHISPER_MODEL: z.string().default('large-v3'),
  WHISPER_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),

  // -------------------------------------------------------------------------
  // OAuth
  // -------------------------------------------------------------------------
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  // -------------------------------------------------------------------------
  // Sentry
  // -------------------------------------------------------------------------
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().default('cheggie-studios'),
  SENTRY_PROJECT: z.string().default('cheggie-studios'),
  SENTRY_SILENT: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),

  // -------------------------------------------------------------------------
  // Email / SMTP
  // -------------------------------------------------------------------------
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@cheggiestudios.com'),
  EMAIL_REPLY_TO: z.string().default('support@cheggiestudios.com'),

  // -------------------------------------------------------------------------
  // Rate limiting
  // -------------------------------------------------------------------------
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  // -------------------------------------------------------------------------
  // ComfyUI (future)
  // -------------------------------------------------------------------------
  COMFYUI_URL: z.string().default('http://localhost:8188'),
  COMFYUI_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  COMFYUI_API_KEY: z.string().optional(),

  // -------------------------------------------------------------------------
  // BullMQ / Queue
  // -------------------------------------------------------------------------
  QUEUE_CONCURRENCY_TRANSCRIPT: z.coerce.number().int().positive().default(2),
  QUEUE_CONCURRENCY_SUBTITLE: z.coerce.number().int().positive().default(4),
  QUEUE_CONCURRENCY_EXPORT: z.coerce.number().int().positive().default(2),
  QUEUE_CONCURRENCY_SEARCH: z.coerce.number().int().positive().default(4),
  QUEUE_RETENTION_COMPLETED_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(86_400_000),
  QUEUE_RETENTION_FAILED_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(604_800_000),

  // -------------------------------------------------------------------------
  // Public app config (NEXT_PUBLIC_*)
  // -------------------------------------------------------------------------
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Cheggie Studios'),
  NEXT_PUBLIC_APP_DESCRIPTION: z.string().optional(),

  NEXT_PUBLIC_FEATURE_COMFYUI: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  NEXT_PUBLIC_FEATURE_COLLABORATION: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  NEXT_PUBLIC_FEATURE_ANALYTICS: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),

  // -------------------------------------------------------------------------
  // Docker
  // -------------------------------------------------------------------------
  DOCKER_BUILD: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
})

export type Env = z.infer<typeof envSchema>

// ---------------------------------------------------------------------------
// Parse & export
// ---------------------------------------------------------------------------

function parseEnv(): Env {
  // Allow skipping validation at build time (Vercel build step)
  if (process.env.SKIP_ENV_VALIDATION === '1') {
    return envSchema.parse({
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://build:build@localhost:5432/build',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'build-time-placeholder-secret-32chars!',
    })
  }

  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    throw new Error(
      `Environment variable validation failed:\n${formatted}\n\n` +
        'Please check your .env.local file against .env.example.'
    )
  }

  return result.data
}

/**
 * Typed, validated environment variables.
 * Throws at import time in server contexts if required variables are missing.
 *
 * Note: This module is server-only. Do not import in Client Components.
 */
export const env = parseEnv()
