'use client'

import * as React from 'react'
import { Search, Plus, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SearchResult {
  segmentId: string
  text: string
  startTime: number
  endTime: number
  speaker?: string | null
  score: number
}

interface SearchBoxProps {
  projectId: string
  onAddToStory?: (segmentId: string) => void
  className?: string
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function SearchBox({ projectId, onAddToStory, className }: SearchBoxProps) {
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [searched, setSearched] = React.useState(false)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  function highlightMatch(text: string, q: string): React.ReactNode {
    if (!q.trim()) return text
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="bg-[hsl(38_92%_50%)]/25 text-[hsl(38_92%_65%)] rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  async function performSearch(q: string) {
    if (!q.trim()) {
      setResults([])
      setSearched(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/search?q=${encodeURIComponent(q)}`
      )
      if (!res.ok) throw new Error('Pretraga nije uspela')
      const data = await res.json() as { results?: SearchResult[] }
      setResults(data.results ?? [])
      setSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri pretrazi')
    } finally {
      setLoading(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void performSearch(value)
    }, 350)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      void performSearch(query)
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <h2 className="text-lg font-semibold text-white">Pretraga</h2>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(240_5%_45%)]" />
        <input
          type="search"
          placeholder="Pretraži transkript..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="flex h-11 w-full rounded-lg border border-[hsl(240_5%_18%)] bg-[hsl(240_5%_15%)] pl-10 pr-4 text-sm text-[hsl(0_0%_95%)] placeholder:text-[hsl(240_5%_45%)] focus:outline-none focus:ring-2 focus:ring-[hsl(38_92%_50%)] hover:border-[hsl(240_5%_28%)] transition-colors"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(38_92%_50%)] animate-spin" />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-[hsl(0_72%_51%)]/30 bg-[hsl(0_72%_51%)]/10 px-4 py-3 text-sm text-[hsl(0_72%_65%)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {searched && !loading && (
        <>
          {results.length === 0 ? (
            <div className="py-12 text-center text-[hsl(240_5%_55%)]">
              <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p>Nema rezultata za &quot;{query}&quot;</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-[hsl(240_5%_55%)]">
                {results.length} {results.length === 1 ? 'rezultat' : 'rezultata'}
              </p>
              {results.map((result) => (
                <div
                  key={result.segmentId}
                  className="group rounded-xl border border-[hsl(240_5%_18%)] bg-[hsl(240_8%_8%)] p-4 hover:border-[hsl(240_5%_25%)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-mono text-xs text-[hsl(240_5%_45%)]">
                          [{formatTime(result.startTime)} → {formatTime(result.endTime)}]
                        </span>
                        {result.speaker && (
                          <span className="text-xs font-semibold text-[hsl(38_92%_60%)]">
                            {result.speaker}
                          </span>
                        )}
                        <span className="text-xs text-[hsl(240_5%_40%)]">
                          {Math.round(result.score * 100)}% podudaranje
                        </span>
                      </div>
                      <p className="text-sm text-[hsl(0_0%_85%)] leading-relaxed">
                        {highlightMatch(result.text, query)}
                      </p>
                    </div>
                    {onAddToStory && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onAddToStory(result.segmentId)}
                      >
                        <Plus className="h-4 w-4" />
                        Dodaj u priču
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!searched && !loading && !query && (
        <div className="py-12 text-center text-[hsl(240_5%_45%)]">
          <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Unesite pojam za pretragu transkripta</p>
        </div>
      )}
    </div>
  )
}
