// ---------------------------------------------------------------------------
// Base application error
// ---------------------------------------------------------------------------

/**
 * Base class for all application-level errors.
 * Subclass this to create domain-specific error types with consistent
 * `code` and `statusCode` fields that can be serialised into API responses.
 */
export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: unknown

  constructor(
    message: string,
    code: string,
    statusCode = 400,
    details?: unknown
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.details = details

    // Maintain proper prototype chain in transpiled environments
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// ---------------------------------------------------------------------------
// Derived error classes
// ---------------------------------------------------------------------------

/**
 * Authentication / authorisation failures (401 / 403).
 */
export class AuthError extends AppError {
  constructor(
    message = 'Authentication required.',
    code = 'UNAUTHORIZED',
    details?: unknown
  ) {
    super(message, code, 401, details)
  }
}

/**
 * Resource not found (404).
 */
export class NotFoundError extends AppError {
  constructor(
    message = 'The requested resource was not found.',
    code = 'NOT_FOUND',
    details?: unknown
  ) {
    super(message, code, 404, details)
  }
}

/**
 * Forbidden — authenticated but lacking the required permission (403).
 */
export class ForbiddenError extends AppError {
  constructor(
    message = 'You do not have permission to perform this action.',
    code = 'FORBIDDEN',
    details?: unknown
  ) {
    super(message, code, 403, details)
  }
}

/**
 * Request validation failure (422).
 */
export class ValidationError extends AppError {
  constructor(
    message = 'Validation failed.',
    details?: unknown
  ) {
    super(message, 'VALIDATION_ERROR', 422, details)
  }
}

/**
 * Storage / file-system / object-store errors (500 by default).
 */
export class StorageError extends AppError {
  constructor(
    message = 'A storage error occurred.',
    code = 'STORAGE_ERROR',
    details?: unknown
  ) {
    super(message, code, 500, details)
  }
}

/**
 * Background job / queue errors (500 by default).
 */
export class JobError extends AppError {
  constructor(
    message = 'A job processing error occurred.',
    code = 'JOB_ERROR',
    details?: unknown
  ) {
    super(message, code, 500, details)
  }
}

/**
 * Rate-limit exceeded (429).
 */
export class RateLimitError extends AppError {
  constructor(
    message = 'Too many requests. Please try again later.',
    details?: unknown
  ) {
    super(message, 'RATE_LIMITED', 429, details)
  }
}

/**
 * Conflict — e.g. duplicate resource (409).
 */
export class ConflictError extends AppError {
  constructor(
    message = 'A conflict occurred with an existing resource.',
    code = 'CONFLICT',
    details?: unknown
  ) {
    super(message, code, 409, details)
  }
}

// ---------------------------------------------------------------------------
// API error response formatter
// ---------------------------------------------------------------------------

export interface ApiErrorResponse {
  error: string
  code: string
  details?: unknown
}

/**
 * Normalise any thrown value into a structured API error response body.
 *
 * - If the value is an `AppError` subclass, its fields are used directly.
 * - If the value is a plain `Error`, a generic `INTERNAL_ERROR` response is
 *   returned and the original message is preserved (but callers should take
 *   care not to leak internal details to clients in production).
 * - Any other thrown value is treated as an unknown internal error.
 */
export function formatApiError(error: unknown): ApiErrorResponse {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      ...(error.details !== undefined ? { details: error.details } : {}),
    }
  }

  if (error instanceof Error) {
    // Only expose the message in non-production environments to avoid leaking
    // internal implementation details.
    const message =
      process.env.NODE_ENV !== 'production'
        ? error.message
        : 'An unexpected error occurred.'

    return {
      error: message,
      code: 'INTERNAL_ERROR',
    }
  }

  return {
    error: 'An unexpected error occurred.',
    code: 'INTERNAL_ERROR',
  }
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError
}
