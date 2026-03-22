'use client'

import * as React from 'react'
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Save,
  Loader2,
  Plus,
  AlertCircle,
  CheckCircle2,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useStory } from '@/hooks/use-story'
import { cn } from '@/lib/utils'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

interface StoryBuilderProps {
  projectId: string
}

export function StoryBuilder({ projectId }: StoryBuilderProps) {
  const { story, segments, loading, error, saving, saveError, saveSuccess, updateStory, saveStory } =
    useStory(projectId)

  const [storyTitle, setStoryTitle] = React.useState('')

  React.useEffect(() => {
    if (story?.title) {
      setStoryTitle(story.title)
    }
  }, [story?.title])

  function moveUp(index: number) {
    if (index === 0) return
    const newSegments = [...segments]
    const [seg] = newSegments.splice(index, 1)
    if (seg) newSegments.splice(index - 1, 0, seg)
    updateStory(newSegments)
  }

  function moveDown(index: number) {
    if (index === segments.length - 1) return
    const newSegments = [...segments]
    const [seg] = newSegments.splice(index, 1)
    if (seg) newSegments.splice(index + 1, 0, seg)
    updateStory(newSegments)
  }

  function removeSegment(index: number) {
    const newSegments = segments.filter((_, i) => i !== index)
    updateStory(newSegments)
  }

  function updateSegmentField(
    index: number,
    field: 'notes' | 'label',
    value: string
  ) {
    const newSegments = segments.map((seg, i) =>
      i === index ? { ...seg, [field]: value } : seg
    )
    updateStory(newSegments)
  }

  async function handleSave() {
    await saveStory(storyTitle || 'Untitled Story')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <AlertCircle className="h-8 w-8 text-[hsl(0_72%_65%)]" />
        <p className="text-[hsl(240_5%_55%)]">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={storyTitle}
            onChange={(e) => setStoryTitle(e.target.value)}
            placeholder="Naziv priče..."
            className="text-lg font-semibold bg-transparent border-0 text-white placeholder:text-[hsl(240_5%_40%)] focus:outline-none focus:ring-0 w-full"
          />
        </div>
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={saving || segments.length === 0}
        >
          <Save className="h-4 w-4" />
          Sačuvaj priču
        </Button>
      </div>

      {/* Save feedback */}
      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-[hsl(142_71%_45%)]/30 bg-[hsl(142_71%_45%)]/10 px-4 py-3 text-sm text-[hsl(142_71%_65%)]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Priča uspešno sačuvana!
        </div>
      )}
      {saveError && (
        <div className="flex items-center gap-2 rounded-lg border border-[hsl(0_72%_51%)]/30 bg-[hsl(0_72%_51%)]/10 px-4 py-3 text-sm text-[hsl(0_72%_65%)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {saveError}
        </div>
      )}

      {/* Segments */}
      {segments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center rounded-xl border border-dashed border-[hsl(240_5%_22%)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[hsl(240_6%_12%)] border border-[hsl(240_5%_18%)]">
            <BookOpen className="h-7 w-7 text-[hsl(240_5%_55%)]" />
          </div>
          <div>
            <p className="font-medium text-white">Priča je prazna</p>
            <p className="text-sm text-[hsl(240_5%_55%)] mt-1">
              Dodaj segmente iz transkripta koristeći &quot;Dodaj u priču&quot; dugme.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {segments.map((segment, index) => (
            <div
              key={`${segment.segmentId}-${index}`}
              className="rounded-xl border border-[hsl(240_5%_18%)] bg-[hsl(240_8%_8%)] p-4 space-y-3"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="flex items-center justify-center h-5 w-5 rounded text-xs font-bold bg-[hsl(38_92%_50%)]/15 text-[hsl(38_92%_60%)]">
                      {index + 1}
                    </span>
                    <span className="font-mono text-xs text-[hsl(240_5%_45%)]">
                      [{formatTime(segment.startTime)}]
                    </span>
                    {segment.speaker && (
                      <span className="text-xs font-semibold text-[hsl(38_92%_60%)]">
                        {segment.speaker}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[hsl(0_0%_80%)] leading-relaxed">{segment.text}</p>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className={cn(
                      'p-1 rounded text-[hsl(240_5%_55%)] hover:text-white hover:bg-[hsl(240_6%_15%)] transition-colors',
                      index === 0 && 'opacity-30 cursor-not-allowed'
                    )}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === segments.length - 1}
                    className={cn(
                      'p-1 rounded text-[hsl(240_5%_55%)] hover:text-white hover:bg-[hsl(240_6%_15%)] transition-colors',
                      index === segments.length - 1 && 'opacity-30 cursor-not-allowed'
                    )}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeSegment(index)}
                    className="p-1 rounded text-[hsl(240_5%_55%)] hover:text-[hsl(0_72%_65%)] hover:bg-[hsl(0_72%_51%)]/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Notes & label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[hsl(240_5%_55%)]">Labela</label>
                  <input
                    type="text"
                    placeholder="npr. Uvod, Kulminacija..."
                    value={segment.label ?? ''}
                    onChange={(e) => updateSegmentField(index, 'label', e.target.value)}
                    className="flex h-8 w-full rounded-md border border-[hsl(240_5%_18%)] bg-[hsl(240_5%_12%)] px-2.5 text-xs text-[hsl(0_0%_80%)] placeholder:text-[hsl(240_5%_40%)] focus:outline-none focus:ring-1 focus:ring-[hsl(38_92%_50%)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[hsl(240_5%_55%)]">Beleška</label>
                  <input
                    type="text"
                    placeholder="Vaša napomena..."
                    value={segment.notes ?? ''}
                    onChange={(e) => updateSegmentField(index, 'notes', e.target.value)}
                    className="flex h-8 w-full rounded-md border border-[hsl(240_5%_18%)] bg-[hsl(240_5%_12%)] px-2.5 text-xs text-[hsl(0_0%_80%)] placeholder:text-[hsl(240_5%_40%)] focus:outline-none focus:ring-1 focus:ring-[hsl(38_92%_50%)]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
