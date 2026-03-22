import { prisma } from '@/lib/db'
import {
  transcriptQueue,
  searchQueue,
  subtitleQueue,
  exportQueue,
} from './queues'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createJobRecord(
  type: string,
  projectId: string | null,
  payload: Record<string, unknown>,
): Promise<string> {
  const record = await prisma.jobRecord.create({
    data: {
      type,
      status: 'PENDING',
      projectId: projectId ?? undefined,
      payload: payload as any,
    },
    select: { id: true },
  })
  return record.id
}

async function updateJobRecordWithBullId(
  recordId: string,
  bullJobId: string,
): Promise<void> {
  await prisma.jobRecord.update({
    where: { id: recordId },
    data: { jobId: bullJobId },
  })
}

// ---------------------------------------------------------------------------
// Dispatch helpers
// ---------------------------------------------------------------------------

export async function dispatchTranscriptJob(
  projectId: string,
  fileUrl: string,
  language: string,
): Promise<string> {
  const payload = { projectId, fileUrl, language }
  const recordId = await createJobRecord('transcript', projectId, payload)

  const bullJob = await transcriptQueue.add('transcribe', payload, {
    jobId: `transcript:${projectId}:${Date.now()}`,
  })

  const bullId = bullJob.id ?? recordId
  await updateJobRecordWithBullId(recordId, bullId)

  return recordId
}

export async function dispatchSearchJob(
  projectId: string,
  transcriptId: string,
): Promise<string> {
  const payload = { projectId, transcriptId }
  const recordId = await createJobRecord('search', projectId, payload)

  const bullJob = await searchQueue.add('index', payload, {
    jobId: `search:${transcriptId}:${Date.now()}`,
  })

  const bullId = bullJob.id ?? recordId
  await updateJobRecordWithBullId(recordId, bullId)

  return recordId
}

export async function dispatchSubtitleJob(
  projectId: string,
  transcriptId: string,
  format: string,
): Promise<string> {
  const payload = { projectId, transcriptId, format: format as 'SRT' | 'VTT' | 'ASS' }
  const recordId = await createJobRecord('subtitle', projectId, payload)

  const bullJob = await subtitleQueue.add('generate', payload, {
    jobId: `subtitle:${transcriptId}:${format}:${Date.now()}`,
  })

  const bullId = bullJob.id ?? recordId
  await updateJobRecordWithBullId(recordId, bullId)

  return recordId
}

export async function dispatchExportJob(
  projectId: string,
  type: string,
  options: Record<string, unknown> = {},
): Promise<string> {
  const payload = { projectId, type, ...options }
  const recordId = await createJobRecord('export', projectId, payload)

  const bullJob = await exportQueue.add('export', payload, {
    jobId: `export:${projectId}:${type}:${Date.now()}`,
  })

  const bullId = bullJob.id ?? recordId
  await updateJobRecordWithBullId(recordId, bullId)

  return recordId
}
