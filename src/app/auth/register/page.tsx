'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Clapperboard, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const registerSchema = z
  .object({
    name: z.string().min(2, 'Ime mora imati najmanje 2 karaktera').max(60, 'Ime je predugačko'),
    email: z.string().email('Unesite validnu email adresu'),
    password: z
      .string()
      .min(8, 'Lozinka mora imati najmanje 8 karaktera')
      .max(72, 'Lozinka je predugačka'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Lozinke se ne poklapaju',
    path: ['confirmPassword'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [serverError, setServerError] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterFormData) {
    setServerError(null)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const message = (body as { error?: string }).error
        if (response.status === 409) {
          setServerError('Nalog sa ovim email-om već postoji.')
        } else {
          setServerError(message ?? 'Registracija nije uspela. Pokušajte ponovo.')
        }
        return
      }

      // Auto sign in after successful registration
      const signInResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (signInResult?.error) {
        setServerError('Registracija uspešna! Prijavite se da biste nastavili.')
        router.push('/auth/login')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setServerError('Došlo je do greške. Pokušajte ponovo.')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(38_92%_50%)]/10 border border-[hsl(38_92%_50%)]/20">
            <Clapperboard className="h-6 w-6 text-[hsl(38_92%_50%)]" />
          </div>
          <h1 className="text-xl font-bold text-white">
            Cheggie <span className="text-[hsl(38_92%_50%)]">Studios</span>
          </h1>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Registrujte se</CardTitle>
            <CardDescription>
              Kreirajte nalog i počnite sa snimkom besplatno
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
                label="Ime i prezime"
                type="text"
                placeholder="Marko Marković"
                autoComplete="name"
                error={errors.name?.message}
                {...register('name')}
              />

              <Input
                label="Email adresa"
                type="email"
                placeholder="vas@email.com"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                label="Lozinka"
                type="password"
                placeholder="Najmanje 8 karaktera"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                label="Potvrdi lozinku"
                type="password"
                placeholder="Ponovite lozinku"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <Button
                type="submit"
                className="w-full"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Registrujte se
              </Button>

              <p className="text-xs text-center text-[hsl(240_5%_45%)]">
                Registrovanjem prihvatate naše{' '}
                <a href="#" className="text-[hsl(38_92%_50%)] hover:underline">
                  uslove korišćenja
                </a>{' '}
                i{' '}
                <a href="#" className="text-[hsl(38_92%_50%)] hover:underline">
                  politiku privatnosti
                </a>
                .
              </p>
            </form>

            <div className="mt-6 text-center text-sm text-[hsl(240_5%_55%)]">
              Već imate nalog?{' '}
              <Link
                href="/auth/login"
                className="text-[hsl(38_92%_50%)] hover:text-[hsl(38_92%_60%)] font-medium transition-colors"
              >
                Prijavite se
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
