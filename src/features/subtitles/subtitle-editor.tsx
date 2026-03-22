'use client'

import * as React from 'react'
import { Download, Loader2, AlertCircle, RefreshCw, Edit2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type SubtitleFormat = 'srt' | 'vtt'

interface SubtitleEntry {
  id: string
  index: number
  startTime: number
  endTime: number
  text: string
}

interface SubtitleEditorProps {
  projectId: string
  className?: string
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
}

function formatVttTime(seconds: number): string {
  return formatSrtTime(seconds).replace(',', '.')
}

export function SubtitleEditor({ projectId, className }: SubtitleEditorProps) {
  const [subtitles, setSubtitles] = React.useState<SubtitleEntry[]>([])
  const [loading, setLoading] = React.useState(false)
  const [generating, setGenerating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [format, setFormat] = React.useState<SubtitleFormat>('srt')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editText, setEditText] = React.useState('')
  const [downloading, setDownloading] = React.useState(false)

  async function fetchSubtitles() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/subtitles?format=${format}`)
      if (!res.ok) {
        if (res.status === 404) {
          setSubtitles([])
          return
        }
        throw new Error('Učitavanje titlova nije uspelo')
      }
      const data = await res.json() as { subtitles?: SubtitleEntry[] }
      setSubtitles(data.subtitles ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri učitavanju')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/subtitles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      })
      if (!res.ok) throw new Error('Generisanje nije uspelo')
      await fetchSubtitles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri generisanju')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/subtitles/download?format=${format}`)
      if (!res.ok) throw new Error('Preuzimanje nije uspelo')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `subtitles.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri preuzimanju')
    } finally {
      setDownloading(false)
    }
  }

  function startEdit(entry: SubtitleEntry) {
    setEditingId(entry.id)
    setEditText(entry.text)
  }

  function confirmEdit(id: string) {
    setSubtitles((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text: editText } : s))
    )
    setEditingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
  }

  React.useEffect(() => {
    void fetchSubtitles()
  }, [format]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Generiši titlove</h2>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Format toggle */}
          <div className="flex rounded-lg border border-[hsl(240_5%_18%)] overflow-hidden">
            {(['srt', 'vtt'] as SubtitleFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium uppercase transition-colors',
                  format === f
                    ? 'bg-[hsl(38_92%_50%)]/15 text-[hsl(38_92%_60%)]'
                    : 'text-[hsl(240_5%_55%)] hover:text-white hover:bg-[hsl(240_6%_12%)]'
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerate}
            loading={generating}
            disabled={generating || loading}
          >
            <RefreshCw className="h-4 w-4" />
            Generiši
          </Button>

          {subtitles.length > 0 && (
            <Button
              size="sm"
              onClick={handleDownload}
              loading={downloading}
              disabled={downloading}
            >
              <Download className="h-4 w-4" />
              Preuzmi .{format}
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-[hsl(0_72%_51%)]/30 bg-[hsl(0_72%_51%)]/10 px-4 py-3 text-sm text-[hsl(0_72%_65%)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : subtitles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-xl border border-dashed border-[hsl(240_5%_22%)] text-center">
          <p className="font-medium text-white">Nema titlova</p>
          <p className="text-sm text-[hsl(240_5%_55%)]">
            Kliknite &quot;Generiši&quot; da kreirate {format.toUpperCase()} titlove.
          </p>
          <Button onClick={handleGenerate} loading={generating} disabled={generating}>
            Generiši titlove
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-[hsl(240_5%_55%)]">
            {subtitles.length} titlova — format:{' '}
            <span className="font-mono text-[hsl(38_92%_60%)]">.{format}</span>
          </p>
          {subtitles.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-[hsl(240_5%_18%)] bg-[hsl(240_8%_8%)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="flex items-center justify-center h-5 w-5 rounded text-xs font-bold bg-[hsl(240_6%_15%)] text-[hsl(240_5%_55%)]">
                      {entry.index}
                    </span>
                    <span className="font-mono text-xs text-[hsl(240_5%_45%)]">
                      {format === 'srt'
                        ? `${formatSrtTime(entry.startTime)} → ${formatSrtTime(entry.endTime)}`
                        : `${formatVttTime(entry.startTime)} → ${formatVttTime(entry.endTime)}`}
                    </span>
                  </div>
                  {editingId === entry.id ? (
                    <div className="flex items-start gap-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={2}
                        autoFocus
                        className="flex-1 rounded-md border border-[hsl(38_92%_50%)] bg-[hsl(240_5%_12%)] px-2.5 py-1.5 text-sm text-[hsl(0_0%_95%)] focus:outline-none focus:ring-1 focus:ring-[hsl(38_92%_50%)] resize-none"
                      />
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => confirmEdit(entry.id)}
                          className="p-1 rounded text-[hsl(142_71%_55%)] hover:bg-[hsl(142_71%_45%)]/10 transition-colors"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1 rounded text-[hsl(240_5%_55%)] hover:text-white hover:bg-[hsl(240_6%_15%)] transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[hsl(0_0%_85%)] leading-relaxed">{entry.text}</p>
                  )}
                </div>
                {editingId !== entry.id && (
                  <button
                    onClick={() => startEdit(entry)}
                    className="shrink-0 p-1.5 rounded text-[hsl(240_5%_45%)] hover:text-white hover:bg-[hsl(240_6%_15%)] transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
