import { InfisicalSDK } from '@infisical/sdk'

let _client: InfisicalSDK | null = null

/**
 * Returns a singleton Infisical SDK client authenticated via Universal Auth.
 * Requires env vars: INFISICAL_CLIENT_ID, INFISICAL_CLIENT_SECRET
 * Optional: INFISICAL_URL (defaults to https://app.infisical.com)
 */
export async function getInfisicalClient(): Promise<InfisicalSDK> {
  if (_client) return _client

  const sdk = new InfisicalSDK({
    siteUrl: process.env.INFISICAL_URL || 'https://app.infisical.com',
  })

  await sdk.auth().universalAuth.login({
    clientId: process.env.INFISICAL_CLIENT_ID!,
    clientSecret: process.env.INFISICAL_CLIENT_SECRET!,
  })

  _client = sdk
  return _client
}

/**
 * Returns true when all required Infisical env vars are present.
 */
export function isInfisicalConfigured(): boolean {
  return !!(
    process.env.INFISICAL_CLIENT_ID &&
    process.env.INFISICAL_CLIENT_SECRET &&
    process.env.INFISICAL_PROJECT_ID
  )
}
