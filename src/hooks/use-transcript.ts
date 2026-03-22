'use client'

import * as React from 'react'

export interface TranscriptSegment {
  id: string
  speaker?: string | null
  text: string
  startTime: number
}

export interface Transcript {
  id: string
  projectId: string
  status: string
  language: string
  createdAt: string
  updatedAt: string
}

const POLL_INTERVAL_MS = 5000
const PROCESSING_STATUSES = new Set(['PENDING', 'PROCESSING', 'UPLOADED'])

interface UseTranscriptReturn {
  transcript: Transcript | null
  segments: TranscriptSegment[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useTranscript(projectId: string): UseTranscriptReturn {
  const [transcript, setTranscript] = React.useState<Transcript | null>(null)
  const [segments, setSegments] = React.useState<TranscriptSegment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = React.useRef(true)

  async function fetchTranscript() {
    try {
      const res = await fetch(`/api/projects/${projectId}/transcript`)
      if (!res.ok) {
        if (res.status === 404) throw new Error('Transcript not found')
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json() as { transcript: Transcript; segments: TranscriptSegment[] }
      if (!mountedRef.current) return
      setTranscript(data.transcript)
      setSegments(data.segments)
      setError(null)

      if (!PROCESSING_STATUSES.has(data.transcript.status)) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : 'Error loading transcript')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  function startPolling() {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => {
      void fetchTranscript()
    }, POLL_INTERVAL_MS)
  }

  function refetch() {
    setLoading(true)
    void fetchTranscript()
  }

  React.useEffect(() => {
    mountedRef.current = true
    setLoading(true)
    void fetchTranscript().then(() => {
      if (transcript && PROCESSING_STATUSES.has(transcript.status)) {
        startPolling()
      }
    })

    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (transcript && PROCESSING_STATUSES.has(transcript.status)) {
      startPolling()
    } else if (transcript && !PROCESSING_STATUSES.has(transcript.status)) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [transcript?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  return { transcript, segments, loading, error, refetch }
}
