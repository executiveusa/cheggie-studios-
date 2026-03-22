'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sidebar } from '@/components/layout/sidebar'
import { useProject } from '@/hooks/use-project'
import { TranscriptViewer } from '@/features/transcript/transcript-viewer'
import { SearchBox } from '@/features/search/search-box'
import { StoryBuilder } from '@/features/story/story-builder'
import { SubtitleEditor } from '@/features/subtitles/subtitle-editor'

type TabId = 'transcript' | 'search' | 'story' | 'subtitles' | 'export'

const TABS: { id: TabId; label: string }[] = [
  { id: 'transcript', label: 'Transkript' },
  { id: 'search', label: 'Pretraga' },
  { id: 'story', label: 'Priča' },
  { id: 'subtitles', label: 'Titlovi' },
  { id: 'export', label: 'Izvoz' },
]

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'READY': return 'success'
    case 'PROCESSING': return 'warning'
    case 'FAILED': return 'destructive'
    default: return 'secondary'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'READY': return 'Spreman'
    case 'PROCESSING': return 'Obrađuje se'
    case 'FAILED': return 'Greška'
    case 'PENDING': return 'Na čekanju'
    case 'UPLOADED': return 'Otpremljen'
    default: return status
  }
}

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params['id'] as string
  const [activeTab, setActiveTab] = React.useState<TabId>('transcript')
  const { project, loading, error, refetch } = useProject(projectId)

  if (loading) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex"><Sidebar /></div>
        <main className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            {TABS.map((t) => <Skeleton key={t.id} className="h-9 w-24 rounded-lg" />)}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex"><Sidebar /></div>
        <main className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="text-center space-y-4">
            <p className="text-[hsl(240_5%_55%)]">
              {error ?? 'Projekat nije pronađen.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={refetch}>
                <RefreshCw className="h-4 w-4" />
                Pokušaj ponovo
              </Button>
              <Button asChild>
                <Link href="/dashboard/projects">Nazad na projekte</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="hidden md:flex"><Sidebar /></div>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard/projects">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-white">{project.title}</h1>
                  <Badge variant={getStatusVariant(project.status)}>
                    {getStatusLabel(project.status)}
                  </Badge>
                </div>
                {project.description && (
                  <p className="text-sm text-[hsl(240_5%_55%)] mt-1 max-w-lg">
                    {project.description}
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4" />
              Osvježi
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto gap-1 border-b border-[hsl(240_5%_18%)] pb-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                  activeTab === tab.id
                    ? 'border-[hsl(38_92%_50%)] text-[hsl(38_92%_50%)]'
                    : 'border-transparent text-[hsl(240_5%_55%)] hover:text-[hsl(0_0%_80%)] hover:border-[hsl(240_5%_35%)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="min-h-[400px]">
            {activeTab === 'transcript' && (
              <TranscriptViewer projectId={projectId} projectStatus={project.status} />
            )}
            {activeTab === 'search' && (
              <SearchBox projectId={projectId} />
            )}
            {activeTab === 'story' && (
              <StoryBuilder projectId={projectId} />
            )}
            {activeTab === 'subtitles' && (
              <SubtitleEditor projectId={projectId} />
            )}
            {activeTab === 'export' && (
              <ExportPanel projectId={projectId} projectTitle={project.title} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function ExportPanel({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [downloading, setDownloading] = React.useState<string | null>(null)

  async function handleDownload(type: string, label: string) {
    setDownloading(type)
    try {
      const res = await fetch(`/api/projects/${projectId}/export?type=${type}`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectTitle}-${label}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silent
    } finally {
      setDownloading(null)
    }
  }

  const exports = [
    { type: 'transcript-txt', label: 'transkript.txt', title: 'Preuzmi transkript (TXT)' },
    { type: 'transcript-json', label: 'transkript.json', title: 'Preuzmi transkript (JSON)' },
    { type: 'subtitles-srt', label: 'titlovi.srt', title: 'Preuzmi titlove (SRT)' },
    { type: 'story-json', label: 'prica.json', title: 'Preuzmi priču (JSON)' },
    { type: 'metadata', label: 'metapodaci.json', title: 'Preuzmi metapodatke' },
  ]

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white">Izvoz</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {exports.map(({ type, label, title }) => (
          <div
            key={type}
            className="flex items-center justify-between rounded-xl border border-[hsl(240_5%_18%)] bg-[hsl(240_8%_8%)] p-4"
          >
            <div>
              <p className="font-medium text-white text-sm">{title}</p>
              <p className="text-xs text-[hsl(240_5%_45%)]">{label}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={downloading === type}
              disabled={!!downloading}
              onClick={() => handleDownload(type, label)}
            >
              Preuzmi
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
