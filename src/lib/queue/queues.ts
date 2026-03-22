import { createQueue } from './client'

// ---------------------------------------------------------------------------
// Job data type definitions
// ---------------------------------------------------------------------------

export interface TranscriptJobData {
  projectId: string
  fileUrl: string
  language: string
}

export interface SearchJobData {
  projectId: string
  transcriptId: string
}

export interface SubtitleJobData {
  projectId: string
  transcriptId: string
  format: 'SRT' | 'VTT' | 'ASS'
}

export interface ExportJobData {
  projectId: string
  type: string
  transcriptId?: string
  storyId?: string
}

export interface ComfyUIJobData {
  projectId: string
  prompt: string
  workflow: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Queue instances
// ---------------------------------------------------------------------------

export const transcriptQueue = createQueue<TranscriptJobData>('transcript')
export const searchQueue = createQueue<SearchJobData>('search')
export const subtitleQueue = createQueue<SubtitleJobData>('subtitle')
export const exportQueue = createQueue<ExportJobData>('export')
export const comfyuiQueue = createQueue<ComfyUIJobData>('comfyui')
