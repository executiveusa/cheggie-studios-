export interface StorageAdapter {
  upload(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ url: string; key: string; sizeBytes: number }>
  download(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>
  exists(key: string): Promise<boolean>
}
