'use client'

import * as React from 'react'

export interface StorySegment {
  segmentId: string
  text: string
  startTime: number
  speaker?: string | null
  label?: string | null
  notes?: string | null
  position: number
  title?: string
}

export interface Story {
  id: string
  title: string
  content?: string | null
  status: string
  createdAt: string
  updatedAt: string
}

interface UseStoryReturn {
  story: Story | null
  segments: StorySegment[]
  loading: boolean
  error: string | null
  saving: boolean
  saveError: string | null
  saveSuccess: boolean
  updateStory: (segments: StorySegment[]) => void
  saveStory: (title?: string) => Promise<void>
}

export function useStory(projectId: string): UseStoryReturn {
  const [story, setStory] = React.useState<Story | null>(null)
  const [segments, setSegments] = React.useState<StorySegment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = React.useState(false)
  const mountedRef = React.useRef(true)

  async function fetchStory() {
    try {
      const res = await fetch(`/api/projects/${projectId}/story`)
      if (!res.ok) {
        if (res.status === 404) throw new Error('Story not found')
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json() as { story: Story; segments: StorySegment[] }
      if (!mountedRef.current) return
      setStory(data.story)
      setSegments(data.segments)
      setError(null)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : 'Error loading story')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  function updateStory(newSegments: StorySegment[]) {
    setSegments(newSegments)
  }

  async function saveStory(title?: string) {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch(`/api/projects/${projectId}/story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: {
            title: title || story?.title || 'Untitled Story',
          },
          segments: segments,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save story')
      }

      if (mountedRef.current) {
        setSaveSuccess(true)
        setTimeout(() => {
          if (mountedRef.current) setSaveSuccess(false)
        }, 3000)
      }
    } catch (err) {
      if (mountedRef.current) {
        setSaveError(err instanceof Error ? err.message : 'Error saving story')
      }
    } finally {
      if (mountedRef.current) setSaving(false)
    }
  }

  React.useEffect(() => {
    mountedRef.current = true
    setLoading(true)
    void fetchStory()

    return () => {
      mountedRef.current = false
    }
  }, [projectId])

  return {
    story,
    segments,
    loading,
    error,
    saving,
    saveError,
    saveSuccess,
    updateStory,
    saveStory,
  }
}
