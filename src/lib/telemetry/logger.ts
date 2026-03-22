import * as Sentry from '@sentry/nextjs'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  userId?: string
  projectId?: string
  jobId?: string
  requestId?: string
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Sensitive field redaction
// ---------------------------------------------------------------------------

const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'cookie',
  'sessionToken',
  'session_token',
  'creditCard',
  'credit_card',
  'cvv',
  'ssn',
  'privateKey',
  'private_key',
])

function redactSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase()) || SENSITIVE_KEYS.has(key)) {
      result[key] = '[REDACTED]'
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactSensitiveFields(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const isDevelopment = process.env['NODE_ENV'] === 'development'

function formatDev(level: LogLevel, message: string, context?: LogContext): string {
  const ts = new Date().toISOString()
  const levelUpper = level.toUpperCase().padEnd(5)
  const ctx = context ? ` ${JSON.stringify(redactSensitiveFields(context))}` : ''
  return `[${ts}] ${levelUpper} ${message}${ctx}`
}

function formatProd(level: LogLevel, message: string, context?: LogContext): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? redactSensitiveFields(context) : {}),
  })
}

function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  return isDevelopment
    ? formatDev(level, message, context)
    : formatProd(level, message, context)
}

// ---------------------------------------------------------------------------
// Logger implementation
// ---------------------------------------------------------------------------

function logDebug(message: string, context?: LogContext): void {
  if (process.env['LOG_LEVEL'] === 'debug' || isDevelopment) {
    console.debug(formatLog('debug', message, context))
  }
}

function logInfo(message: string, context?: LogContext): void {
  console.info(formatLog('info', message, context))
}

function logWarn(message: string, context?: LogContext): void {
  console.warn(formatLog('warn', message, context))
}

function logError(message: string, error?: unknown, context?: LogContext): void {
  const err = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'))

  const enrichedContext: LogContext = {
    ...context,
    errorMessage: err.message,
    errorName: err.name,
    ...(isDevelopment && err.stack ? { stack: err.stack } : {}),
  }

  console.error(formatLog('error', message, enrichedContext))

  // Capture to Sentry
  Sentry.withScope((scope) => {
    if (context?.userId) scope.setUser({ id: context.userId })
    if (context?.projectId) scope.setTag('projectId', String(context.projectId))
    if (context?.jobId) scope.setTag('jobId', String(context.jobId))
    if (context?.requestId) scope.setTag('requestId', String(context.requestId))

    const redacted = context ? redactSensitiveFields(context) : {}
    scope.setContext('logContext', redacted)

    Sentry.captureException(err)
  })
}

export const logger = {
  debug: logDebug,
  info: logInfo,
  warn: logWarn,
  error: logError,
}
