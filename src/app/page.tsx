import Link from 'next/link'
import {
  Search,
  FileText,
  Subtitles,
  Globe,
  ArrowRight,
  CheckCircle2,
  Zap,
  TrendingUp,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Navbar } from '@/components/layout/navbar'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar user={null} />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[hsl(38_92%_50%)]/5 rounded-full blur-3xl" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[hsl(217_91%_60%)]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(38_92%_50%)]/20 bg-[hsl(38_92%_50%)]/5 px-4 py-1.5 text-sm text-[hsl(38_92%_65%)] mb-8">
            <Zap className="h-3.5 w-3.5" />
            Finance &amp; trading kreatori sadržaja
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            Pretvori market insight u{' '}
            <span className="gradient-text">premium sadržaj</span> brže.
          </h1>

          <p className="text-xl text-[hsl(240_5%_65%)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Cheggie Studios pomaže finance i trading kreatorima da od jednog snimka dobiju transkript,
            pronađu najbolje momente, slože priču i pripreme sadržaj za objavu — bez gubljenja sati
            na editovanje.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="w-full sm:w-auto text-base px-8">
              <Link href="/auth/register">
                Počni sa snimkom
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto text-base px-8">
              <a href="#features">
                Pogledaj kako radi
              </a>
            </Button>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center justify-center gap-6 text-sm text-[hsl(240_5%_55%)]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[hsl(142_71%_45%)]" />
              Bez kreditne kartice
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[hsl(142_71%_45%)]" />
              Srpski jezik
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[hsl(142_71%_45%)]" />
              Brzo počni
            </div>
          </div>
        </div>
      </section>

      {/* Value Cards Section */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="group hover:border-[hsl(38_92%_50%)]/30 hover:bg-[hsl(240_8%_10%)] transition-all duration-300">
            <CardContent className="p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(38_92%_50%)]/10 border border-[hsl(38_92%_50%)]/20">
                <Zap className="h-5 w-5 text-[hsl(38_92%_50%)]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Uštedi sate svake nedelje
              </h3>
              <p className="text-[hsl(240_5%_55%)] text-sm leading-relaxed">
                Manje ručnog editovanja, manje traženja po snimku, manje gubljenja
                vremena na titlove i pripremu.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:border-[hsl(38_92%_50%)]/30 hover:bg-[hsl(240_8%_10%)] transition-all duration-300">
            <CardContent className="p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(217_91%_60%)]/10 border border-[hsl(217_91%_60%)]/20">
                <Shield className="h-5 w-5 text-[hsl(217_91%_60%)]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Izgradi premium brend
              </h3>
              <p className="text-[hsl(240_5%_55%)] text-sm leading-relaxed">
                Objavljuj sadržaj koji deluje ozbiljnije, jasnije i vrednije —
                što podiže poverenje publike.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:border-[hsl(38_92%_50%)]/30 hover:bg-[hsl(240_8%_10%)] transition-all duration-300">
            <CardContent className="p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(142_71%_45%)]/10 border border-[hsl(142_71%_45%)]/20">
                <TrendingUp className="h-5 w-5 text-[hsl(142_71%_45%)]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Objavljuj više i prodaj više
              </h3>
              <p className="text-[hsl(240_5%_55%)] text-sm leading-relaxed">
                Od jednog snimka brže dolaziš do više sadržaja, više pregleda
                i više prilika za prodaju.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Sve što ti treba, na jednom mestu
          </h2>
          <p className="text-[hsl(240_5%_55%)] text-lg max-w-xl mx-auto">
            Od snimka do objave — bez prebacivanja između alata.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="rounded-xl border border-[hsl(240_5%_18%)] bg-[hsl(240_8%_8%)] p-6 hover:border-[hsl(38_92%_50%)]/20 transition-colors">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(38_92%_50%)]/10 border border-[hsl(38_92%_50%)]/20">
                <Search className="h-5 w-5 text-[hsl(38_92%_50%)]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">
                  Nađi pravi trenutak
                </h3>
                <p className="text-sm text-[hsl(240_5%_55%)] leading-relaxed">
                  Pretraži ceo snimak po tekstu i odmah nađi tačan momenat koji ti treba —
                  bez premotavanja.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[hsl(240_5%_18%)] bg-[hsl(240_8%_8%)] p-6 hover:border-[hsl(217_91%_60%)]/20 transition-colors">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(217_91%_60%)]/10 border border-[hsl(217_91%_60%)]/20">
                <FileText className="h-5 w-5 text-[hsl(217_91%_60%)]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">
                  Montiraj iz teksta
                </h3>
                <p className="text-sm text-[hsl(240_5%_55%)] leading-relaxed">
                  Složi priču iz transkript segmenata — samo označi šta ti treba
                  i napravi storyline za svoju objavu.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[hsl(240_5%_18%)] bg-[hsl(240_8%_8%)] p-6 hover:border-[hsl(142_71%_45%)]/20 transition-colors">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(142_71%_45%)]/10 border border-[hsl(142_71%_45%)]/20">
                <Subtitles className="h-5 w-5 text-[hsl(142_71%_45%)]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">
                  Titlovi brže
                </h3>
                <p className="text-sm text-[hsl(240_5%_55%)] leading-relaxed">
                  Automatski generiši SRT i VTT titlove, edituj ih direktno i
                  preuzmi za upload.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[hsl(240_5%_18%)] bg-[hsl(240_8%_8%)] p-6 hover:border-[hsl(38_92%_50%)]/20 transition-colors">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(38_92%_50%)]/10 border border-[hsl(38_92%_50%)]/20">
                <Globe className="h-5 w-5 text-[hsl(38_92%_50%)]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">
                  Radi na srpskom
                </h3>
                <p className="text-sm text-[hsl(240_5%_55%)] leading-relaxed">
                  Transkript i ceo workflow su optimizovani za srpski jezik —
                  nema gubitka u prevodu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-[hsl(240_8%_8%)] border-y border-[hsl(240_5%_18%)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(38_92%_50%)]/10 border border-[hsl(38_92%_50%)]/20">
              <Shield className="h-6 w-6 text-[hsl(38_92%_50%)]" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Sadržaj koji prodaje poverenje
          </h2>
          <p className="text-xl text-[hsl(240_5%_65%)] mb-6 leading-relaxed">
            U finance i trading niši sadržaj ne prodaje samo informacije. On prodaje poverenje.
          </p>
          <p className="text-lg text-[hsl(240_5%_55%)] max-w-2xl mx-auto leading-relaxed">
            Cheggie Studios ti pomaže da objavljuješ brže i izgledaš ozbiljnije,
            bez toga da svaki video traži sate ručnog rada.
          </p>
        </div>
      </section>

      {/* Outcome Section */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Manje editovanja.{' '}
          <span className="gradient-text">Više objava. Jači utisak.</span>
        </h2>

        <p className="text-lg text-[hsl(240_5%_60%)] max-w-2xl mx-auto mb-12 leading-relaxed">
          Kada trošiš manje vremena na montažu, možeš da objaviš više. Kada objaviš više
          kvalitetnog sadržaja, raste pažnja. Kada sadržaj izgleda ozbiljnije, raste poverenje.
          A kada rastu pažnja i poverenje, raste i prodaja.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-14">
          {[
            { number: '10×', label: 'brže do titlova' },
            { number: 'SRT / VTT', label: 'formati za sve platforme' },
            { number: '100%', label: 'srpski jezik' },
          ].map(({ number, label }) => (
            <div
              key={label}
              className="rounded-xl border border-[hsl(240_5%_18%)] bg-[hsl(240_8%_8%)] p-6"
            >
              <div className="text-4xl font-bold gradient-text mb-2">{number}</div>
              <div className="text-sm text-[hsl(240_5%_55%)]">{label}</div>
            </div>
          ))}
        </div>

        <Button size="lg" asChild className="text-base px-10">
          <Link href="/auth/register">
            Počni besplatno
            <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-[hsl(240_5%_18%)] bg-[hsl(240_8%_8%)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-[hsl(240_5%_45%)]">
              © 2026 Cheggie Studios. Sva prava zadržana.
            </div>
            <div className="flex items-center gap-6 text-sm text-[hsl(240_5%_45%)]">
              <a href="#" className="hover:text-[hsl(0_0%_70%)] transition-colors">
                Politika privatnosti
              </a>
              <a href="#" className="hover:text-[hsl(0_0%_70%)] transition-colors">
                Uslovi korišćenja
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
