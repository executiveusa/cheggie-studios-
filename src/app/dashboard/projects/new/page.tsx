'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UploadDropzone } from '@/features/upload/upload-dropzone'
import { Sidebar } from '@/components/layout/sidebar'

const createProjectSchema = z.object({
  title: z.string().min(1, 'Naziv je obavezan').max(200, 'Naziv je predugačak'),
  description: z.string().max(1000, 'Opis je predugačak').optional(),
  language: z.enum(['sr', 'en']),
  tags: z.string().optional(),
})

type CreateProjectFormData = z.infer<typeof createProjectSchema>

export default function NewProjectPage() {
  const router = useRouter()
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [createdProjectId, setCreatedProjectId] = React.useState<string | null>(null)
  const [step, setStep] = React.useState<'form' | 'upload'>('form')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { language: 'sr' },
  })

  const language = watch('language')

  async function onSubmit(data: CreateProjectFormData) {
    setServerError(null)
    try {
      const tagsArray = data.tags
        ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : []

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description ?? '',
          language: data.language,
          tags: tagsArray,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        setServerError(body.error ?? 'Kreiranje projekta nije uspelo.')
        return
      }

      const created = await res.json() as { id?: string; project?: { id: string } }
      const projectId = created.id ?? created.project?.id
      if (!projectId) {
        setServerError('Kreiranje projekta nije uspelo.')
        return
      }

      setCreatedProjectId(projectId)
      setStep('upload')
    } catch {
      setServerError('Došlo je do greške. Pokušajte ponovo.')
    }
  }

  function handleUploadComplete() {
    if (createdProjectId) {
      router.push(`/dashboard/projects/${createdProjectId}`)
    }
  }

  function handleSkipUpload() {
    if (createdProjectId) {
      router.push(`/dashboard/projects/${createdProjectId}`)
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/projects">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Novi projekat</h1>
              <p className="text-sm text-[hsl(240_5%_55%)]">
                {step === 'form' ? 'Korak 1 od 2 — Podaci o projektu' : 'Korak 2 od 2 — Otpremi snimak'}
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex gap-2">
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${step === 'form' ? 'bg-[hsl(38_92%_50%)]' : 'bg-[hsl(38_92%_50%)]'}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${step === 'upload' ? 'bg-[hsl(38_92%_50%)]' : 'bg-[hsl(240_6%_15%)]'}`} />
          </div>

          {step === 'form' ? (
            <Card>
              <CardHeader>
                <CardTitle>Podaci o projektu</CardTitle>
                <CardDescription>
                  Unesite osnovne informacije o vašem projektu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {serverError && (
                    <div className="flex items-center gap-2 rounded-lg border border-[hsl(0_72%_51%)]/30 bg-[hsl(0_72%_51%)]/10 px-4 py-3 text-sm text-[hsl(0_72%_65%)]">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {serverError}
                    </div>
                  )}

                  <Input
                    label="Naziv projekta"
                    placeholder="npr. Analiza tržišta — Januar 2026"
                    error={errors.title?.message}
                    {...register('title')}
                  />

                  <Textarea
                    label="Opis (opciono)"
                    placeholder="Kratki opis projekta..."
                    rows={3}
                    error={errors.description?.message}
                    {...register('description')}
                  />

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[hsl(0_0%_80%)]">
                      Jezik snimka
                    </label>
                    <Select
                      value={language}
                      onValueChange={(val) => setValue('language', val as 'sr' | 'en')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sr">Srpski</SelectItem>
                        <SelectItem value="en">Engleski</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Input
                    label="Tagovi (opciono)"
                    placeholder="trading, analiza, bitcoin (odvojene zarezom)"
                    error={errors.tags?.message}
                    helperText="Odvojite tagove zarezom"
                    {...register('tags')}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    Nastavi
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Otpremi snimak</CardTitle>
                <CardDescription>
                  Otpremi video ili audio fajl koji želite da obradite
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {createdProjectId && (
                  <UploadDropzone
                    projectId={createdProjectId}
                    onUploadComplete={handleUploadComplete}
                  />
                )}
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={handleSkipUpload}
                >
                  Preskoci za sada
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
