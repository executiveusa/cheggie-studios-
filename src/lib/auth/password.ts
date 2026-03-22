import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

/**
 * Hash a plain-text password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Compare a plain-text password against a bcrypt hash.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ---------------------------------------------------------------------------
// Password strength validation
// ---------------------------------------------------------------------------

export interface PasswordStrengthResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate password strength.
 * Rules:
 *  - Minimum 8 characters
 *  - At least one uppercase letter
 *  - At least one lowercase letter
 *  - At least one digit
 *  - At least one special character
 *  - No leading or trailing whitespace
 */
export function validatePasswordStrength(
  password: string
): PasswordStrengthResult {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long.')
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters.')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit.')
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character.')
  }

  if (password !== password.trim()) {
    errors.push('Password must not have leading or trailing whitespace.')
  }

  return { valid: errors.length === 0, errors }
}
