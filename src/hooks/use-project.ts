'use client'

import * as React from 'react'

export interface Project {
  id: string
  title: string
  description?: string | null
  status: string
  language: string
  createdAt: string
  updatedAt: string
  transcript?: { id: string; status: string } | null
  story?: { id: string; title: string } | null
  tags?: string[]
}

const POLL_INTERVAL_MS = 5000
const PROCESSING_STATUSES = new Set(['PENDING', 'UPLOADED', 'PROCESSING'])

interface UseProjectReturn {
  project: Project | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useProject(projectId: string): UseProjectReturn {
  const [project, setProject] = React.useState<Project | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = React.useRef(true)

  async function fetchProject() {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) {
        if (res.status === 404) throw new Error('Projekat nije pronađen')
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json() as Project
      if (!mountedRef.current) return
      setProject(data)
      setError(null)

      // Stop polling once project reaches a terminal state
      if (!PROCESSING_STATUSES.has(data.status)) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : 'Greška pri učitavanju projekta')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  function startPolling() {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => {
      void fetchProject()
    }, POLL_INTERVAL_MS)
  }

  function refetch() {
    setLoading(true)
    void fetchProject()
  }

  React.useEffect(() => {
    mountedRef.current = true
    setLoading(true)
    void fetchProject().then(() => {
      if (project && PROCESSING_STATUSES.has(project.status)) {
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

  // Start/stop polling based on project status
  React.useEffect(() => {
    if (project && PROCESSING_STATUSES.has(project.status)) {
      startPolling()
    } else if (project && !PROCESSING_STATUSES.has(project.status)) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [project?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  return { project, loading, error, refetch }
}
