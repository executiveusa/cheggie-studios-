'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Clapperboard, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const loginSchema = z.object({
  email: z.string().email('Unesite validnu email adresu'),
  password: z.string().min(1, 'Lozinka je obavezna'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'
  const [serverError, setServerError] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setServerError(null)
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setServerError('Pogrešan email ili lozinka. Pokušajte ponovo.')
        return
      }

      router.push(callbackUrl)
      router.refresh()
    } catch {
      setServerError('Došlo je do greške. Pokušajte ponovo.')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4">
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
            <CardTitle className="text-xl">Prijavite se</CardTitle>
            <CardDescription>
              Unesite vaše podatke da biste pristupili nalogu
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
                placeholder="••••••••"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password')}
              />

              <div className="flex items-center justify-end">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-[hsl(38_92%_50%)] hover:text-[hsl(38_92%_60%)] transition-colors"
                >
                  Zaboravili ste lozinku?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Prijavite se
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-[hsl(240_5%_55%)]">
              Nemate nalog?{' '}
              <Link
                href="/auth/register"
                className="text-[hsl(38_92%_50%)] hover:text-[hsl(38_92%_60%)] font-medium transition-colors"
              >
                Registrujte se
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
