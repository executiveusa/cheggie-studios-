'use client'

export const dynamic = 'force-dynamic'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const errorMessages: Record<string, string> = {
  Configuration: 'Greška u konfiguraciji servera. Kontaktirajte podršku.',
  AccessDenied: 'Pristup odbijen. Nemate dozvolu za ovu akciju.',
  Verification: 'Link za verifikaciju je istekao ili je već iskorišćen.',
  OAuthSignin: 'Greška pri OAuth prijavi. Pokušajte ponovo.',
  OAuthCallback: 'Greška pri OAuth povratnom pozivu. Pokušajte ponovo.',
  OAuthCreateAccount: 'Nije moguće kreirati OAuth nalog.',
  EmailCreateAccount: 'Nije moguće kreirati nalog sa ovim email-om.',
  Callback: 'Greška pri povratnom pozivu.',
  OAuthAccountNotLinked:
    'Email adresa je već povezana sa drugim nalogom. Prijavite se sa originalnim provajderom.',
  EmailSignin: 'Greška pri slanju email linka za prijavu.',
  CredentialsSignin: 'Pogrešan email ili lozinka. Pokušajte ponovo.',
  SessionRequired: 'Morate biti prijavljeni da biste pristupili ovoj stranici.',
  Default: 'Došlo je do greške pri prijavi. Pokušajte ponovo.',
}

function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') ?? 'Default'
  const message = errorMessages[error] ?? errorMessages['Default']

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(0_72%_51%)]/10 border border-[hsl(0_72%_51%)]/20 mb-3">
              <AlertTriangle className="h-6 w-6 text-[hsl(0_72%_65%)]" />
            </div>
            <CardTitle className="text-xl text-white">Greška pri prijavi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[hsl(240_5%_65%)]">{message}</p>

            <div className="flex flex-col gap-3">
              <Button asChild className="w-full">
                <Link href="/auth/login">
                  <ArrowLeft className="h-4 w-4" />
                  Pokušaj ponovo
                </Link>
              </Button>
              <Button variant="ghost" asChild className="w-full">
                <Link href="/">Nazad na početnu</Link>
              </Button>
            </div>

            {error !== 'Default' && (
              <p className="text-xs text-center text-[hsl(240_5%_45%)]">
                Kod greške: <code className="font-mono">{error}</code>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AuthErrorPage
