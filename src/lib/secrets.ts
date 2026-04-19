import { getInfisicalClient, isInfisicalConfigured } from './infisical'

const _cache = new Map<string, string>()

/**
 * Fetch a secret by name.
 * Priority order:
 *   1. Infisical SDK (if INFISICAL_CLIENT_ID / CLIENT_SECRET / PROJECT_ID are set)
 *   2. process.env fallback (works for local .env and Vercel injected vars)
 */
export async function getSecret(name: string): Promise<string> {
  if (_cache.has(name)) return _cache.get(name)!

  if (isInfisicalConfigured()) {
    try {
      const client = await getInfisicalClient()
      const { secretValue } = await client.secrets().getSecret({
        projectId: process.env.INFISICAL_PROJECT_ID!,
        environment: process.env.INFISICAL_ENV || 'production',
        secretName: name,
      })
      _cache.set(name, secretValue)
      return secretValue
    } catch (err) {
      // Fall through to process.env if Infisical call fails
      console.warn(`[secrets] Infisical lookup failed for "${name}", falling back to env:`, err)
    }
  }

  const value = process.env[name] ?? ''
  if (value) _cache.set(name, value)
  return value
}
