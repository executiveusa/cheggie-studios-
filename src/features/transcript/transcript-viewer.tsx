'use client'

import * as React from 'react'
import { RefreshCw, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranscript } from '@/hooks/use-transcript'
import { cn } from '@/lib/utils'

const SPEAKER_COLORS = [
  'text-[hsl(38_92%_60%)]',
  'text-[hsl(217_91%_65%)]',
  'text-[hsl(142_71%_55%)]',
  'text-[hsl(280_60%_65%)]',
  'text-[hsl(0_72%_65%)]',
]

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

interface TranscriptViewerProps {
  projectId: string
  projectStatus: string
  onAddToStory?: (segmentId: string) => void
  searchQuery?: string
}

export function TranscriptViewer({
  projectId,
  projectStatus,
  onAddToStory,
  searchQuery = '',
}: TranscriptViewerProps) {
  const { transcript, segments, loading, error, refetch } = useTranscript(projectId)
  const [localSearch, setLocalSearch] = React.useState('')
  const effectiveSearch = searchQuery || localSearch

  const speakerColorMap = React.useMemo(() => {
    const map = new Map<string, string>()
    let index = 0
    for (const seg of segments) {
      if (seg.speaker && !map.has(seg.speaker)) {
        map.set(seg.speaker, SPEAKER_COLORS[index % SPEAKER_COLORS.length] ?? SPEAKER_COLORS[0]!)
        index++
      }
    }
    return map
  }, [segments])

  const filteredSegments = React.useMemo(() => {
    if (!effectiveSearch.trim()) return segments
    const q = effectiveSearch.toLowerCase()
    return segments.filter((s) => s.text.toLowerCase().includes(q))
  }, [segments, effectiveSearch])

  function highlightText(text: string, query: string): React.ReactNode {
    if (!query.trim()) return text
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-[hsl(38_92%_50%)]/25 text-[hsl(38_92%_65%)] rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <p className="text-[hsl(240_5%_55%)]">Greška pri učitavanju transkripta: {error}</p>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="h-4 w-4" />
          Pokušaj ponovo
        </Button>
      </div>
    )
  }

  if (projectStatus === 'PROCESSING' || projectStatus === 'PENDING' || projectStatus === 'UPLOADED') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[hsl(38_92%_50%)]/10 border border-[hsl(38_92%_50%)]/20">
          <Loader2 className="h-7 w-7 text-[hsl(38_92%_50%)] animate-spin" />
        </div>
        <div>
          <p className="font-medium text-white">Transkript se obrađuje...</p>
          <p className="text-sm text-[hsl(240_5%_55%)] mt-1">
            Ovo može potrajati nekoliko minuta.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4" />
          Osvježi
        </Button>
      </div>
    )
  }

  if (!transcript || segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <p className="text-[hsl(240_5%_55%)]">
          Transkript još nije dostupan za ovaj projekat.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header + search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">
          Transkript
          <span className="ml-2 text-sm text-[hsl(240_5%_55%)] font-normal">
            ({segments.length} segmenata)
          </span>
        </h2>
        <div className="relative sm:w-64">
          <input
            type="search"
            placeholder="Pretraži transkript..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-[hsl(240_5%_18%)] bg-[hsl(240_5%_15%)] px-3 text-sm text-[hsl(0_0%_95%)] placeholder:text-[hsl(240_5%_45%)] focus:outline-none focus:ring-2 focus:ring-[hsl(38_92%_50%)]"
          />
        </div>
      </div>

      {filteredSegments.length === 0 ? (
        <div className="py-10 text-center text-[hsl(240_5%_55%)]">
          Nema rezultata za &quot;{effectiveSearch}&quot;
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSegments.map((segment) => {
            const speakerColor = segment.speaker
              ? speakerColorMap.get(segment.speaker) ?? SPEAKER_COLORS[0]
              : 'text-[hsl(240_5%_55%)]'

            return (
              <div
                key={segment.id}
                className="group rounded-xl border border-[hsl(240_5%_18%)] bg-[hsl(240_8%_8%)] p-4 hover:border-[hsl(240_5%_25%)] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-mono text-xs text-[hsl(240_5%_45%)] shrink-0">
                        [{formatTime(segment.startTime)}]
                      </span>
                      {segment.speaker && (
                        <span className={cn('text-xs font-semibold', speakerColor)}>
                          {segment.speaker}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[hsl(0_0%_85%)] leading-relaxed">
                      {highlightText(segment.text, effectiveSearch)}
                    </p>
                  </div>
                  {onAddToStory && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onAddToStory(segment.id)}
                    >
                      <Plus className="h-4 w-4" />
                      Dodaj
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
