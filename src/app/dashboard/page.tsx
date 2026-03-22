import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Plus, FolderOpen, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sidebar } from '@/components/layout/sidebar'
import { formatDistanceToNow } from 'date-fns'
import { sr } from 'date-fns/locale'

interface Project {
  id: string
  title: string
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
    case 'PENDING': return 'secondary'
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

async function getRecentProjects(): Promise<Project[]> {
  try {
    const session = await auth()
    if (!session?.user) return []

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/projects?limit=6`, {
      headers: {
        Cookie: `next-auth.session-token=${session}`,
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) return []
    const data = await res.json() as { projects?: Project[] }
    return data.projects ?? []
  } catch {
    return []
  }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')

  const projects = await getRecentProjects()
  const firstName = session.user.name?.split(' ')[0] ?? 'korisniče'

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Dobro jutro' : hour < 18 ? 'Dobar dan' : 'Dobro veče'

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
          {/* Greeting */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {greeting},{' '}
                <span className="gradient-text">{firstName}</span>!
              </h1>
              <p className="text-[hsl(240_5%_55%)] mt-1">
                Nastavi tamo gde si stao — ili pokreni novi projekat.
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/projects/new">
                <Plus className="h-4 w-4" />
                Novi projekat
              </Link>
            </Button>
          </div>

          {/* Recent Projects */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Nedavni projekti</h2>
              <Link
                href="/dashboard/projects"
                className="text-sm text-[hsl(38_92%_50%)] hover:text-[hsl(38_92%_60%)] transition-colors"
              >
                Vidi sve
              </Link>
            </div>

            {projects.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[hsl(240_6%_12%)] border border-[hsl(240_5%_18%)]">
                    <FolderOpen className="h-7 w-7 text-[hsl(240_5%_55%)]" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-medium text-white">Nema projekata još</p>
                    <p className="text-sm text-[hsl(240_5%_55%)]">
                      Kreiraj prvi projekat i počni sa snimkom.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/dashboard/projects/new">
                      <Plus className="h-4 w-4" />
                      Kreiraj prvi projekat
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                    <Card className="h-full hover:border-[hsl(38_92%_50%)]/30 hover:bg-[hsl(240_8%_10%)] transition-all duration-200 cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base line-clamp-2">
                            {project.title}
                          </CardTitle>
                          <Badge variant={getStatusVariant(project.status)} className="shrink-0">
                            {getStatusLabel(project.status)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-4 text-xs text-[hsl(240_5%_55%)]">
                          {project.transcript && (
                            <div className="flex items-center gap-1">
                              <div className="h-1.5 w-1.5 rounded-full bg-[hsl(38_92%_50%)]" />
                              Transkript
                            </div>
                          )}
                          {project.story && (
                            <div className="flex items-center gap-1">
                              <div className="h-1.5 w-1.5 rounded-full bg-[hsl(217_91%_60%)]" />
                              Priča
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[hsl(240_5%_45%)]">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(project.createdAt), {
                            addSuffix: true,
                            locale: sr,
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Quick stats */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Ukupno projekata', value: projects.length.toString() },
              { label: 'Obrađenih', value: projects.filter(p => p.status === 'READY').length.toString() },
              { label: 'U obradi', value: projects.filter(p => p.status === 'PROCESSING').length.toString() },
              { label: 'Sa greškama', value: projects.filter(p => p.status === 'FAILED').length.toString() },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold gradient-text">{value}</div>
                  <div className="text-xs text-[hsl(240_5%_55%)] mt-0.5">{label}</div>
                </CardContent>
              </Card>
            ))}
          </section>
        </div>
      </main>
    </div>
  )
}
