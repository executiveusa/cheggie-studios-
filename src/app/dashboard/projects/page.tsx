'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus,
  Search,
  FolderOpen,
  LayoutGrid,
  List,
  Clock,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Sidebar } from '@/components/layout/sidebar'
import { formatDistanceToNow } from 'date-fns'
import { sr } from 'date-fns/locale'

interface Project {
  id: string
  title: string
  description?: string | null
  status: string
  language: string
  createdAt: string
  transcript?: { status: string } | null
  story?: { title: string } | null
}

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

function ProjectsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = React.useState<Project[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState(searchParams.get('q') ?? '')
  const [statusFilter, setStatusFilter] = React.useState(searchParams.get('status') ?? 'all')
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid')
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchProjects = React.useCallback(async (q: string, status: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (status !== 'all') params.set('status', status)
      const res = await fetch(`/api/projects?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json() as { projects?: Project[] }
      setProjects(data.projects ?? [])
    } catch {
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void fetchProjects(search, statusFilter)
  }, [fetchProjects, search, statusFilter])

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set('q', value)
      else params.delete('q')
      router.replace(`/dashboard/projects?${params.toString()}`)
    }, 400)
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Projekti</h1>
              <p className="text-sm text-[hsl(240_5%_55%)] mt-0.5">
                {loading ? '...' : `${projects.length} projekata`}
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/projects/new">
                <Plus className="h-4 w-4" />
                Novi projekat
              </Link>
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(240_5%_45%)]" />
              <input
                type="search"
                placeholder="Pretraži projekte..."
                value={search}
                onChange={handleSearchChange}
                className="flex h-10 w-full rounded-lg border border-[hsl(240_5%_18%)] bg-[hsl(240_5%_15%)] pl-9 pr-3 text-sm text-[hsl(0_0%_95%)] placeholder:text-[hsl(240_5%_45%)] focus:outline-none focus:ring-2 focus:ring-[hsl(38_92%_50%)] focus:ring-offset-0 hover:border-[hsl(240_5%_28%)] transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[hsl(240_5%_45%)] shrink-0" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 h-10">
                  <SelectValue placeholder="Svi statusi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi statusi</SelectItem>
                  <SelectItem value="READY">Spreman</SelectItem>
                  <SelectItem value="PROCESSING">Obrađuje se</SelectItem>
                  <SelectItem value="PENDING">Na čekanju</SelectItem>
                  <SelectItem value="FAILED">Greška</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex rounded-lg border border-[hsl(240_5%_18%)] overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[hsl(240_6%_15%)] text-white' : 'text-[hsl(240_5%_45%)] hover:text-white hover:bg-[hsl(240_6%_12%)]'}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-[hsl(240_6%_15%)] text-white' : 'text-[hsl(240_5%_45%)] hover:text-white hover:bg-[hsl(240_6%_12%)]'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Projects grid/list */}
          {loading ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[hsl(240_6%_12%)] border border-[hsl(240_5%_18%)]">
                  <FolderOpen className="h-7 w-7 text-[hsl(240_5%_55%)]" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-medium text-white">
                    {search || statusFilter !== 'all' ? 'Nema rezultata' : 'Nema projekata još'}
                  </p>
                  <p className="text-sm text-[hsl(240_5%_55%)]">
                    {search || statusFilter !== 'all'
                      ? 'Pokušajte sa drugačijim filterima.'
                      : 'Kreiraj prvi projekat i počni sa snimkom.'}
                  </p>
                </div>
                {!search && statusFilter === 'all' && (
                  <Button asChild>
                    <Link href="/dashboard/projects/new">
                      <Plus className="h-4 w-4" />
                      Kreiraj projekat
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                  <Card className="h-full hover:border-[hsl(38_92%_50%)]/30 hover:bg-[hsl(240_8%_10%)] transition-all duration-200 cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base line-clamp-2">{project.title}</CardTitle>
                        <Badge variant={getStatusVariant(project.status)} className="shrink-0">
                          {getStatusLabel(project.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {project.description && (
                        <p className="text-sm text-[hsl(240_5%_55%)] line-clamp-2">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-[hsl(240_5%_45%)]">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true, locale: sr })}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                  <div className="flex items-center justify-between rounded-xl border border-[hsl(240_5%_18%)] bg-[hsl(240_8%_8%)] px-4 py-3 hover:border-[hsl(38_92%_50%)]/30 hover:bg-[hsl(240_8%_10%)] transition-all cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(240_6%_12%)]">
                        <FolderOpen className="h-4 w-4 text-[hsl(38_92%_50%)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{project.title}</p>
                        <p className="text-xs text-[hsl(240_5%_45%)]">
                          {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true, locale: sr })}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(project.status)}>
                      {getStatusLabel(project.status)}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <React.Suspense>
      <ProjectsContent />
    </React.Suspense>
  )
}
