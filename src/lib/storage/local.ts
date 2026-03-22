import fs from 'fs/promises'
import path from 'path'
import type { StorageAdapter } from './adapter'

function getStorageRoot(): string {
  return process.env['LOCAL_STORAGE_PATH'] ?? './uploads'
}

function resolveSafePath(storageRoot: string, key: string): string {
  const absoluteRoot = path.resolve(storageRoot)
  const candidate = path.resolve(absoluteRoot, key)

  if (!candidate.startsWith(absoluteRoot + path.sep) && candidate !== absoluteRoot) {
    throw new Error(`Path traversal detected: key "${key}" escapes storage root`)
  }

  return candidate
}

function getBaseUrl(): string {
  if (process.env['NEXT_PUBLIC_APP_URL']) {
    return process.env['NEXT_PUBLIC_APP_URL'].replace(/\/$/, '')
  }
  const port = process.env['PORT'] ?? '3000'
  return `http://localhost:${port}`
}

export class LocalStorageAdapter implements StorageAdapter {
  async upload(
    key: string,
    buffer: Buffer,
    _mimeType: string,
  ): Promise<{ url: string; key: string; sizeBytes: number }> {
    const storageRoot = getStorageRoot()
    const fullPath = resolveSafePath(storageRoot, key)

    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, buffer)

    const url = `${getBaseUrl()}/api/files/${key}`

    return {
      url,
      key,
      sizeBytes: buffer.byteLength,
    }
  }

  async download(key: string): Promise<Buffer> {
    const storageRoot = getStorageRoot()
    const fullPath = resolveSafePath(storageRoot, key)

    const data = await fs.readFile(fullPath)
    return Buffer.from(data)
  }

  async delete(key: string): Promise<void> {
    const storageRoot = getStorageRoot()
    const fullPath = resolveSafePath(storageRoot, key)

    try {
      await fs.unlink(fullPath)
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err
      }
    }
  }

  async getSignedUrl(key: string, _expiresInSeconds?: number): Promise<string> {
    return `${getBaseUrl()}/api/files/${key}`
  }

  async exists(key: string): Promise<boolean> {
    const storageRoot = getStorageRoot()
    const fullPath = resolveSafePath(storageRoot, key)

    try {
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }
}
