import { generateMockTranscript } from './mock-transcript'

export type { TranscriptResult } from './mock-transcript'
import type { TranscriptResult } from './mock-transcript'

// ---------------------------------------------------------------------------
// Whisper API (self-hosted) adapter
// ---------------------------------------------------------------------------

interface WhisperApiResponse {
  text: string
  language?: string
  segments?: Array<{
    id: number
    start: number
    end: number
    text: string
    speaker?: string
    avg_logprob?: number
  }>
  confidence?: number
}

async function transcribeWithWhisperApi(
  fileUrl: string,
  language?: string,
): Promise<TranscriptResult> {
  const whisperApiUrl = process.env['WHISPER_API_URL']!
  const endpoint = `${whisperApiUrl.replace(/\/$/, '')}/transcribe`

  const body: Record<string, unknown> = { url: fileUrl }
  if (language) body['language'] = language

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '(unreadable)')
    throw new Error(
      `Whisper API returned ${response.status}: ${text}`,
    )
  }

  const data = (await response.json()) as WhisperApiResponse

  const segments = (data.segments ?? []).map((seg, idx) => ({
    id: seg.id ?? idx,
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
    speaker: seg.speaker,
  }))

  const confidence =
    data.confidence ??
    (data.segments && data.segments.length > 0
      ? data.segments.reduce((acc, s) => acc + (s.avg_logprob ?? 0), 0) /
        data.segments.length
      : undefined)

  return {
    text: data.text,
    language: data.language ?? language ?? 'sr',
    segments,
    confidence: confidence !== undefined ? Math.exp(confidence) : undefined,
    engineUsed: 'whisper-api',
  }
}

// ---------------------------------------------------------------------------
// OpenAI Whisper adapter
// ---------------------------------------------------------------------------

async function transcribeWithOpenAI(
  fileUrl: string,
  language?: string,
): Promise<TranscriptResult> {
  const { default: OpenAI } = await import('openai')

  const client = new OpenAI({ apiKey: process.env['OPENAI_API_KEY'] })

  // Download the file to a buffer, then pass as a File object
  const audioResponse = await fetch(fileUrl)
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio file: ${audioResponse.status}`)
  }

  const buffer = await audioResponse.arrayBuffer()
  const fileName = fileUrl.split('/').pop() ?? 'audio.mp4'
  const file = new File([buffer], fileName, { type: 'audio/mpeg' })

  const transcription = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'verbose_json',
    ...(language ? { language } : {}),
  })

  type VerboseSegment = {
    id: number
    start: number
    end: number
    text: string
    avg_logprob?: number
  }

  const verboseData = transcription as unknown as {
    text: string
    language?: string
    segments?: VerboseSegment[]
  }

  const segments = (verboseData.segments ?? []).map((seg) => ({
    id: seg.id,
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
    speaker: undefined,
  }))

  const avgLogProb =
    verboseData.segments && verboseData.segments.length > 0
      ? verboseData.segments.reduce((acc, s) => acc + (s.avg_logprob ?? 0), 0) /
        verboseData.segments.length
      : undefined

  return {
    text: verboseData.text,
    language: verboseData.language ?? language ?? 'sr',
    segments,
    confidence: avgLogProb !== undefined ? Math.exp(avgLogProb) : undefined,
    engineUsed: 'openai-whisper',
  }
}

// ---------------------------------------------------------------------------
// Public entry point — cascade through available engines
// ---------------------------------------------------------------------------

export async function transcribeWithWhisper(
  fileUrl: string,
  language?: string,
): Promise<TranscriptResult> {
  if (process.env['WHISPER_API_URL']) {
    return transcribeWithWhisperApi(fileUrl, language)
  }

  if (process.env['OPENAI_API_KEY']) {
    return transcribeWithOpenAI(fileUrl, language)
  }

  // No real engine configured — return mock data for demo/development
  const projectTitle = fileUrl.split('/').pop() ?? 'demo-project'
  return generateMockTranscript(projectTitle, language ?? 'sr')
}
