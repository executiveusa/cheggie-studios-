import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { StorageAdapter } from './adapter'

const MULTIPART_THRESHOLD_BYTES = 100 * 1024 * 1024 // 100 MB
const MULTIPART_PART_SIZE_BYTES = 10 * 1024 * 1024  // 10 MB per part
const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 3600       // 1 hour

function createS3Client(): S3Client {
  const region = process.env['AWS_REGION'] ?? 'us-east-1'
  const endpoint = process.env['S3_ENDPOINT']

  return new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials:
      process.env['AWS_ACCESS_KEY_ID'] && process.env['AWS_SECRET_ACCESS_KEY']
        ? {
            accessKeyId: process.env['AWS_ACCESS_KEY_ID'],
            secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'],
          }
        : undefined,
  })
}

function getBucket(): string {
  const bucket = process.env['S3_BUCKET']
  if (!bucket) {
    throw new Error('S3_BUCKET environment variable is not set')
  }
  return bucket
}

async function streamToBuffer(
  stream: import('stream').Readable | ReadableStream<Uint8Array>,
): Promise<Buffer> {
  if (typeof (stream as NodeJS.ReadableStream).pipe === 'function') {
    const readable = stream as NodeJS.ReadableStream
    const chunks: Buffer[] = []
    for await (const chunk of readable) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array))
    }
    return Buffer.concat(chunks)
  }

  const webStream = stream as ReadableStream<Uint8Array>
  const reader = webStream.getReader()
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return Buffer.from(result)
}

export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client

  constructor() {
    this.client = createS3Client()
  }

  async upload(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ url: string; key: string; sizeBytes: number }> {
    const bucket = getBucket()

    if (buffer.byteLength >= MULTIPART_THRESHOLD_BYTES) {
      await this.uploadMultipart(key, buffer, mimeType, bucket)
    } else {
      await this.client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ContentLength: buffer.byteLength,
        }),
      )
    }

    const endpoint = process.env['S3_ENDPOINT']
    const url = endpoint
      ? `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`
      : `https://${bucket}.s3.${process.env['AWS_REGION'] ?? 'us-east-1'}.amazonaws.com/${key}`

    return { url, key, sizeBytes: buffer.byteLength }
  }

  private async uploadMultipart(
    key: string,
    buffer: Buffer,
    mimeType: string,
    bucket: string,
  ): Promise<void> {
    const createResp = await this.client.send(
      new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        ContentType: mimeType,
      }),
    )

    const uploadId = createResp.UploadId
    if (!uploadId) throw new Error('S3 did not return an UploadId for multipart upload')

    const parts: { PartNumber: number; ETag: string }[] = []
    const totalParts = Math.ceil(buffer.byteLength / MULTIPART_PART_SIZE_BYTES)

    try {
      for (let i = 0; i < totalParts; i++) {
        const start = i * MULTIPART_PART_SIZE_BYTES
        const end = Math.min(start + MULTIPART_PART_SIZE_BYTES, buffer.byteLength)
        const partBuffer = buffer.subarray(start, end)

        const partResp = await this.client.send(
          new UploadPartCommand({
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            PartNumber: i + 1,
            Body: partBuffer,
            ContentLength: partBuffer.byteLength,
          }),
        )

        const etag = partResp.ETag
        if (!etag) throw new Error(`S3 returned no ETag for part ${i + 1}`)

        parts.push({ PartNumber: i + 1, ETag: etag })
      }

      await this.client.send(
        new CompleteMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: { Parts: parts },
        }),
      )
    } catch (err) {
      await this.client.send(
        new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId }),
      )
      throw err
    }
  }

  async download(key: string): Promise<Buffer> {
    const bucket = getBucket()

    const resp = await this.client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    )

    if (!resp.Body) {
      throw new Error(`S3 returned empty body for key: ${key}`)
    }

    return streamToBuffer(
      resp.Body as import('stream').Readable | ReadableStream<Uint8Array>,
    )
  }

  async delete(key: string): Promise<void> {
    const bucket = getBucket()

    await this.client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    )
  }

  async getSignedUrl(
    key: string,
    expiresInSeconds: number = DEFAULT_SIGNED_URL_EXPIRY_SECONDS,
  ): Promise<string> {
    const bucket = getBucket()

    const command = new GetObjectCommand({ Bucket: bucket, Key: key })
    return awsGetSignedUrl(this.client, command, { expiresIn: expiresInSeconds })
  }

  async exists(key: string): Promise<boolean> {
    const bucket = getBucket()

    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      )
      return true
    } catch (err: unknown) {
      const code = (err as { name?: string; $metadata?: { httpStatusCode?: number } })
      if (
        code.name === 'NotFound' ||
        code.$metadata?.httpStatusCode === 404
      ) {
        return false
      }
      throw err
    }
  }
}
