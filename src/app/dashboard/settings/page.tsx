'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, CheckCircle2, Trash2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sidebar } from '@/components/layout/sidebar'

const profileSchema = z.object({
  name: z.string().min(2, 'Ime mora imati najmanje 2 karaktera').max(60),
  language: z.enum(['sr', 'en']),
})

const supportSchema = z.object({
  subject: z.string().min(1, 'Predmet je obavezan'),
  message: z.string().min(10, 'Poruka mora imati najmanje 10 karaktera'),
})

type ProfileFormData = z.infer<typeof profileSchema>
type SupportFormData = z.infer<typeof supportSchema>

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const [profileSuccess, setProfileSuccess] = React.useState(false)
  const [profileError, setProfileError] = React.useState<string | null>(null)
  const [supportSuccess, setSupportSuccess] = React.useState(false)
  const [supportError, setSupportError] = React.useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = React.useState(false)
  const [lang, setLang] = React.useState<'sr' | 'en'>('sr')

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: session?.user?.name ?? '',
      language: 'sr',
    },
  })

  const {
    register: registerSupport,
    handleSubmit: handleSupportSubmit,
    reset: resetSupport,
    formState: { errors: supportErrors, isSubmitting: supportSubmitting },
  } = useForm<SupportFormData>({
    resolver: zodResolver(supportSchema),
  })

  async function onProfileSubmit(data: ProfileFormData) {
    setProfileError(null)
    setProfileSuccess(false)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        setProfileError(body.error ?? 'Ažuriranje nije uspelo.')
        return
      }
      await update({ name: data.name })
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch {
      setProfileError('Došlo je do greške.')
    }
  }

  async function onSupportSubmit(data: SupportFormData) {
    setSupportError(null)
    setSupportSuccess(false)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        setSupportError(body.error ?? 'Slanje nije uspelo.')
        return
      }
      setSupportSuccess(true)
      resetSupport()
      setTimeout(() => setSupportSuccess(false), 5000)
    } catch {
      setSupportError('Došlo je do greške.')
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Podešavanja</h1>
            <p className="text-sm text-[hsl(240_5%_55%)] mt-0.5">
              Upravljajte nalogom i preferencijama
            </p>
          </div>

          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profil</CardTitle>
              <CardDescription>Ažurirajte vaše lične podatke</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
                {profileError && (
                  <div className="flex items-center gap-2 rounded-lg border border-[hsl(0_72%_51%)]/30 bg-[hsl(0_72%_51%)]/10 px-4 py-3 text-sm text-[hsl(0_72%_65%)]">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div className="flex items-center gap-2 rounded-lg border border-[hsl(142_71%_45%)]/30 bg-[hsl(142_71%_45%)]/10 px-4 py-3 text-sm text-[hsl(142_71%_65%)]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Profil uspešno ažuriran!
                  </div>
                )}

                <Input
                  label="Ime i prezime"
                  placeholder="Vaše ime"
                  error={profileErrors.name?.message}
                  {...registerProfile('name')}
                />

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[hsl(0_0%_80%)]">
                    Email adresa
                  </label>
                  <input
                    type="email"
                    value={session?.user?.email ?? ''}
                    disabled
                    className="flex h-10 w-full rounded-lg border border-[hsl(240_5%_18%)] bg-[hsl(240_5%_12%)] px-3 py-2 text-sm text-[hsl(240_5%_45%)] cursor-not-allowed"
                  />
                  <p className="text-xs text-[hsl(240_5%_45%)]">
                    Email adresa se ne može menjati.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[hsl(0_0%_80%)]">
                    Jezik interfejsa
                  </label>
                  <Select value={lang} onValueChange={(v) => setLang(v as 'sr' | 'en')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sr">Srpski</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" loading={profileSubmitting} disabled={profileSubmitting}>
                  Sačuvaj izmene
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Support Section */}
          <Card>
            <CardHeader>
              <CardTitle>Prijavi problem</CardTitle>
              <CardDescription>
                Naišli ste na problem? Kontaktirajte nas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSupportSubmit(onSupportSubmit)} className="space-y-4">
                {supportError && (
                  <div className="flex items-center gap-2 rounded-lg border border-[hsl(0_72%_51%)]/30 bg-[hsl(0_72%_51%)]/10 px-4 py-3 text-sm text-[hsl(0_72%_65%)]">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {supportError}
                  </div>
                )}
                {supportSuccess && (
                  <div className="flex items-center gap-2 rounded-lg border border-[hsl(142_71%_45%)]/30 bg-[hsl(142_71%_45%)]/10 px-4 py-3 text-sm text-[hsl(142_71%_65%)]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Poruka uspešno poslata! Odgovorićemo uskoro.
                  </div>
                )}

                <Input
                  label="Predmet"
                  placeholder="Kratki opis problema"
                  error={supportErrors.subject?.message}
                  {...registerSupport('subject')}
                />

                <Textarea
                  label="Poruka"
                  placeholder="Opišite problem što detaljnije..."
                  rows={4}
                  error={supportErrors.message?.message}
                  {...registerSupport('message')}
                />

                <Button
                  type="submit"
                  loading={supportSubmitting}
                  disabled={supportSubmitting}
                >
                  <Send className="h-4 w-4" />
                  Pošalji poruku
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-[hsl(0_72%_51%)]/20">
            <CardHeader>
              <CardTitle className="text-[hsl(0_72%_65%)]">Opasna zona</CardTitle>
              <CardDescription>
                Ove akcije su nepovratne. Budite oprezni.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!deleteConfirm ? (
                <Button
                  variant="destructive"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Obriši nalog
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[hsl(0_72%_65%)]">
                    Ste sigurni? Ova akcija je nepovratna i obrisaće sve vaše podatke.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        // TODO: implement account deletion
                        setDeleteConfirm(false)
                      }}
                    >
                      Da, obriši nalog
                    </Button>
                    <Button variant="ghost" onClick={() => setDeleteConfirm(false)}>
                      Odustani
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
