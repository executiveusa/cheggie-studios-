import { randomUUID } from 'crypto'
import path from 'path'

// ---------------------------------------------------------------------------
// File name sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitize a file name by:
 * - Stripping path-traversal sequences (`..`, `/`, `\`)
 * - Replacing characters that are unsafe in file names or URLs
 * - Collapsing consecutive dashes/underscores
 * - Limiting total length to 200 characters
 *
 * The returned string is safe to use as a file system path component and
 * inside storage keys.
 */
export function sanitizeFileName(name: string): string {
  // Normalise to NFC (canonical Unicode) and take only the basename
  let safe = path.basename(name).normalize('NFC')

  // Remove null bytes
  safe = safe.replace(/\0/g, '')

  // Strip path traversal characters
  safe = safe.replace(/\.\./g, '')
  safe = safe.replace(/[/\\]/g, '')

  // Keep only alphanumerics, hyphens, underscores, dots
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_')

  // Prevent leading dots (hidden files on Unix)
  safe = safe.replace(/^\.+/, '')

  // Collapse repeated separators
  safe = safe.replace(/[-_.]{2,}/g, (match) => match[0] ?? '_')

  // Trim separators from both ends
  safe = safe.replace(/^[-_.]|[-_.]$/g, '')

  // Enforce maximum length (preserve extension)
  if (safe.length > 200) {
    const ext = path.extname(safe)
    const base = path.basename(safe, ext)
    safe = base.slice(0, 200 - ext.length) + ext
  }

  // Fall back to a safe placeholder if nothing remains
  if (!safe || safe === '.') {
    safe = 'file'
  }

  return safe
}

// ---------------------------------------------------------------------------
// Storage key generation
// ---------------------------------------------------------------------------

/**
 * Generate a safe, scoped storage key for user-uploaded files.
 *
 * Format: `users/{userId}/projects/{projectId}/{uuid}-{safeFileName}`
 *
 * The UUID prefix ensures uniqueness even when the same file name is
 * uploaded multiple times.
 */
export function generateStorageKey(
  userId: string,
  projectId: string,
  fileName: string
): string {
  const safe = sanitizeFileName(fileName)
  const uuid = randomUUID()
  return `users/${userId}/projects/${projectId}/${uuid}-${safe}`
}

// ---------------------------------------------------------------------------
// Text sanitization
// ---------------------------------------------------------------------------

/**
 * Strip all HTML tags from a string.
 * Useful for sanitising user-supplied text before storing or rendering it.
 */
export function sanitizeText(text: string): string {
  return text.replace(/<\/?[^>]+(>|$)/g, '').trim()
}

// ---------------------------------------------------------------------------
// Sensitive field redaction
// ---------------------------------------------------------------------------

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /authorization/i,
  /credential/i,
  /private/i,
  /ssn/i,
  /credit.?card/i,
  /cvv/i,
  /pin\b/i,
] as const

const REDACTED = '[REDACTED]'

/**
 * Recursively redact values for keys whose names match common sensitive patterns.
 * Returns a new object — the original is not mutated.
 *
 * @param obj   The object to redact
 * @param depth Maximum recursion depth (default: 5) to avoid stack overflows
 */
export function redactSensitiveFields(
  obj: Record<string, unknown>,
  depth = 5
): Record<string, unknown> {
  if (depth <= 0) return obj

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) =>
      pattern.test(key)
    )

    if (isSensitive) {
      result[key] = REDACTED
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      result[key] = redactSensitiveFields(
        value as Record<string, unknown>,
        depth - 1
      )
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? redactSensitiveFields(item as Record<string, unknown>, depth - 1)
          : item
      )
    } else {
      result[key] = value
    }
  }

  return result
}
