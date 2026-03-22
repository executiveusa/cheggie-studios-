import { env } from '@/lib/env'
import type { StorageAdapter } from './adapter'
import { LocalStorageAdapter } from './local'
import { S3StorageAdapter } from './s3'

export type { StorageAdapter } from './adapter'

export function getStorageAdapter(): StorageAdapter {
  if (env.STORAGE_ADAPTER === 's3') {
    return new S3StorageAdapter()
  }

  return new LocalStorageAdapter()
}

export const storage: StorageAdapter = getStorageAdapter()
