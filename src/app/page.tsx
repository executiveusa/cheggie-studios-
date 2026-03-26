'use client'

import Link from 'next/link'
import { motion, useInView, type Variants } from 'framer-motion'
import { useRef } from 'react'
import {
  Search,
  FileText,
  Globe,
  ArrowRight,
  CheckCircle2,
  Zap,
  TrendingUp,
  Shield,
  Upload,
  Wand2,
  Download,
  Play,
  Captions,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Navbar } from '@/components/layout/navbar'

// â”€â”€â”€ Animation helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 },
  }),
}

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut', delay: i * 0.07 },
  }),
}

function ScrollReveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      custom={delay}
      variants={fadeUp}
    >
      {children}
    </motion.div>
  )
}

// â”€â”€â”€ Mock product UI preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ProductPreview() {
  const segments = [
    { time: '02:14', text: 'SPX je bio na kljuÄnom support nivou od 5200', highlight: true },
    { time: '04:31', text: 'Volume je bio 3x iznad proseka â€” jasna validacija' },
    { time: '07:08', text: 'RSI divergencija na daily â€” klasiÄan reversal setup', highlight: true },
    { time: '09:55', text: 'Ceo forex market bio je risk-off mode tog jutra' },
    { time: '12:22', text: 'Ovo je taÄno onaj tip setupa koji nam treba za short' },
  ]
  return (
    <div className="relative mx-auto max-w-2xl">
      <div className="rounded-xl border border-[hsl(240_5%_20%)] bg-[hsl(240_10%_6%)] overflow-hidden shadow-2xl shadow-black/60">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(240_5%_14%)] bg-[hsl(240_10%_5%)]">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[hsl(0_72%_51%)]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[hsl(45_93%_47%)]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[hsl(142_71%_45%)]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2 bg-[hsl(240_8%_10%)] rounded-md px-3 py-1 text-xs text-[hsl(240_5%_45%)]">
              <Search className="h-3 w-3" />
              <span>support nivo</span>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 rounded-lg bg-[hsl(240_8%_10%)] border border-[hsl(240_5%_16%)] px-3 py-2 mb-4">
            <Search className="h-4 w-4 text-[hsl(38_92%_50%)]" />
            <span className="text-sm text-white">support nivo</span>
            <span className="ml-auto text-xs text-[hsl(240_5%_45%)]">2 pogotka</span>
          </div>
          {segments.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.35, ease: 'easeOut' }}
              className={`flex gap-3 rounded-lg p-2.5 text-sm transition-colors cursor-pointer ${
                s.highlight
                  ? 'bg-[hsl(38_92%_50%)]/8 border border-[hsl(38_92%_50%)]/20'
                  : 'hover:bg-[hsl(240_8%_10%)]'
              }`}
            >
              <span className={`shrink-0 font-mono text-xs pt-0.5 ${s.highlight ? 'text-[hsl(38_92%_65%)]' : 'text-[hsl(240_5%_40%)]'}`}>
                {s.time}
              </span>
              <span className={s.highlight ? 'text-[hsl(0_0%_88%)]' : 'text-[hsl(240_5%_60%)]'}>
                {s.text}
              </span>
              {s.highlight && (
                <CheckCircle2 className="ml-auto shrink-0 h-4 w-4 text-[hsl(38_92%_50%)]" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-[hsl(38_92%_50%)]/10 blur-2xl rounded-full" />
    </div>
  )
}

export default function LandingPage() {
  const steps = [
    { icon: Upload,   step: '01', title: 'Uploaduj snimak',  desc: 'Prevuci i pusti video ili audio fajl. PodrÅ¾avamo MP4, MOV, MP3 i viÅ¡e.' },
    { icon: Wand2,    step: '02', title: 'AI transkribuje',  desc: 'Whisper AI pretvara govor u tekst za sekunde, optimizovan za finance i trading terminologiju.' },
    { icon: Search,   step: '03', title: 'PronaÄ‘i i sloÅ¾i',  desc: 'PretraÅ¾i, oznaÄi momente, sloÅ¾i storyline â€” sve iz teksta, bez premotavanja videa.' },
    { icon: Download, step: '04', title: 'Eksportuj sve',    desc: 'SRT, VTT titlovi, tekstualni artikli, transkript PDF â€” jednim klikom, odmah.' },
  ]

  const features = [
    { icon: Search,    accent: 'hsl(38 92% 50%)',  title: 'NaÄ‘i pravi trenutak',  desc: 'PretraÅ¾i ceo snimak po tekstu i odmah naÄ‘i taÄan momenat koji ti treba â€” bez premotavanja.' },
    { icon: FileText,  accent: 'hsl(217 91% 60%)', title: 'Montiraj iz teksta',   desc: 'SloÅ¾i priÄu iz transkript segmenata â€” samo oznaÄi Å¡ta ti treba i napravi storyline za svoju objavu.' },
    { icon: Captions,  accent: 'hsl(142 71% 45%)', title: 'Titlovi brÅ¾e',         desc: 'Automatski generiÅ¡i SRT i VTT titlove, edituj ih direktno i preuzmi za upload na bilo koju platformu.' },
    { icon: Globe,     accent: 'hsl(38 92% 50%)',  title: 'Radi na srpskom',      desc: 'Transkript i ceo workflow su optimizovani za srpski jezik â€” nema gubitka u prevodu.' },
  ]

  const stats = [
    { value: '10Ã—',     label: 'brÅ¾e do titlova' },
    { value: 'SRT/VTT', label: 'svi standardni formati' },
    { value: '100%',    label: 'srpski jezik' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <Navbar user={null} />

      {/* â”€â”€ Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[hsl(38_92%_50%)]/6 rounded-full blur-[100px]" />
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[hsl(217_91%_60%)]/6 rounded-full blur-[100px]" />
          <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-[hsl(38_92%_50%)]/20 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-20 pb-28 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}
            className="inline-flex items-center gap-2 rounded-full border border-[hsl(38_92%_50%)]/25 bg-[hsl(38_92%_50%)]/8 px-4 py-1.5 text-sm text-[hsl(38_92%_65%)] mb-8">
            <Zap className="h-3.5 w-3.5" />
            Finance &amp; trading kreatori sadrÅ¾aja
          </motion.div>

          <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
            Pretvori market insight u{' '}
            <span className="gradient-text">premium sadrÅ¾aj</span>{' '}
            brÅ¾e.
          </motion.h1>

          <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="text-xl text-[hsl(240_5%_62%)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Cheggie Studios pomaÅ¾e finance i trading kreatorima da od jednog snimka dobiju transkript,
            pronaÄ‘u najbolje momente, sloÅ¾e priÄu i pripreme sadrÅ¾aj za objavu â€” bez gubljenja sati na editovanje.
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button size="lg" asChild className="w-full sm:w-auto text-base px-8 gap-2">
              <Link href="/auth/register">
                PoÄni sa snimkom
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild
              className="w-full sm:w-auto text-base px-8 gap-2 border-[hsl(240_5%_22%)] hover:border-[hsl(240_5%_32%)]">
              <a href="#how-it-works">
                <Play className="h-4 w-4" />
                Pogledaj kako radi
              </a>
            </Button>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={4}
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-[hsl(240_5%_50%)]">
            {['Bez kreditne kartice', 'Srpski jezik', 'Brzo poÄni'].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[hsl(142_71%_45%)]" />
                {t}
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-24">
          <ProductPreview />
        </motion.div>
      </section>

      {/* â”€â”€ Value Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: Zap,       accent: 'hsl(38 92% 50%)',  title: 'UÅ¡tedi sate svake nedelje', desc: 'Manje ruÄnog editovanja, manje traÅ¾enja po snimku, manje gubljenja vremena na titlove i pripremu.' },
            { icon: Shield,    accent: 'hsl(217 91% 60%)', title: 'Izgradi premium brend',      desc: 'Objavljuj sadrÅ¾aj koji deluje ozbiljnije, jasnije i vrednije â€” Å¡to podiÅ¾e poverenje publike.' },
            { icon: TrendingUp,accent: 'hsl(142 71% 45%)', title: 'Objavljuj viÅ¡e i prodaj viÅ¡e',desc: 'Od jednog snimka brÅ¾e dolaziÅ¡ do viÅ¡e sadrÅ¾aja, viÅ¡e pregleda i viÅ¡e prilika za prodaju.' },
          ].map((c, i) => (
            <ScrollReveal key={c.title} delay={i}>
              <Card className="group h-full hover:border-[hsl(38_92%_50%)]/25 hover:bg-[hsl(240_8%_9%)] transition-all duration-300 hover:-translate-y-0.5">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `color-mix(in srgb, ${c.accent} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${c.accent} 22%, transparent)` }}>
                    <c.icon className="h-5 w-5" style={{ color: c.accent }} />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{c.title}</h3>
                  <p className="text-[hsl(240_5%_55%)] text-sm leading-relaxed">{c.desc}</p>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* â”€â”€ How it works â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section id="how-it-works" className="bg-[hsl(240_8%_6%)] border-y border-[hsl(240_5%_12%)] py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(38_92%_55%)] mb-3">Kako radi</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Od snimka do objave za <span className="gradient-text">4 koraka</span>
            </h2>
            <p className="text-[hsl(240_5%_55%)] text-lg max-w-xl mx-auto">Bez prebacivanja izmeÄ‘u alata. Sve na jednom mestu.</p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-[hsl(240_5%_20%)] to-transparent" />
            {steps.map((s, i) => (
              <ScrollReveal key={s.step} delay={i}>
                <div className="group rounded-xl border border-[hsl(240_5%_15%)] bg-[hsl(240_10%_5%)] p-6 hover:border-[hsl(38_92%_50%)]/25 hover:bg-[hsl(240_8%_8%)] transition-all duration-300 text-center">
                  <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[hsl(240_5%_15%)] bg-[hsl(240_10%_4%)] group-hover:border-[hsl(38_92%_50%)]/20 transition-colors relative">
                    <s.icon className="h-6 w-6 text-[hsl(240_5%_45%)] group-hover:text-[hsl(38_92%_55%)] transition-colors" />
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(38_92%_50%)]/15 border border-[hsl(38_92%_50%)]/25 text-[9px] font-bold text-[hsl(38_92%_60%)]">
                      {s.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-2">{s.title}</h3>
                  <p className="text-xs text-[hsl(240_5%_50%)] leading-relaxed">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Features â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section id="features" className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-24">
        <ScrollReveal className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(217_91%_60%)] mb-3">MoguÄ‡nosti</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Sve Å¡to ti treba, na jednom mestu</h2>
          <p className="text-[hsl(240_5%_55%)] text-lg max-w-xl mx-auto">Od snimka do objave â€” bez prebacivanja izmeÄ‘u alata.</p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((f, i) => (
            <ScrollReveal key={f.title} delay={i % 2}>
              <div className="group rounded-xl border border-[hsl(240_5%_15%)] bg-[hsl(240_8%_7%)] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[hsl(38_92%_50%)]/20">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `color-mix(in srgb, ${f.accent} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${f.accent} 18%, transparent)` }}>
                    <f.icon className="h-5 w-5" style={{ color: f.accent }} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-1.5">{f.title}</h3>
                    <p className="text-sm text-[hsl(240_5%_55%)] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* â”€â”€ Trust band â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="bg-[hsl(240_8%_7%)] border-y border-[hsl(240_5%_12%)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <ScrollReveal>
            <div className="mb-5 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(38_92%_50%)]/10 border border-[hsl(38_92%_50%)]/20">
                <Shield className="h-7 w-7 text-[hsl(38_92%_50%)]" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">SadrÅ¾aj koji prodaje poverenje</h2>
            <p className="text-xl text-[hsl(240_5%_63%)] mb-5 leading-relaxed max-w-2xl mx-auto">
              U finance i trading niÅ¡i sadrÅ¾aj ne prodaje samo informacije. On prodaje poverenje.
            </p>
            <p className="text-lg text-[hsl(240_5%_52%)] max-w-2xl mx-auto leading-relaxed">
              Cheggie Studios ti pomaÅ¾e da objavljujeÅ¡ brÅ¾e i izgledaÅ¡ ozbiljnije,
              bez toga da svaki video traÅ¾i sate ruÄnog rada.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* â”€â”€ Outcome stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-24 text-center">
        <ScrollReveal>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Manje editovanja.{' '}
            <span className="gradient-text">ViÅ¡e objava. JaÄi utisak.</span>
          </h2>
          <p className="text-lg text-[hsl(240_5%_58%)] max-w-2xl mx-auto mb-14 leading-relaxed">
            Kada troÅ¡iÅ¡ manje vremena na montaÅ¾u, moÅ¾eÅ¡ da objaviÅ¡ viÅ¡e. Kada objaviÅ¡ viÅ¡e
            kvalitetnog sadrÅ¾aja, raste paÅ¾nja. Kada sadrÅ¾aj izgleda ozbiljnije, raste poverenje.
            A kada rastu paÅ¾nja i poverenje, raste i prodaja.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-16">
          {stats.map((s, i) => (
            <ScrollReveal key={s.label} delay={i}>
              <div className="group rounded-2xl border border-[hsl(240_5%_15%)] bg-[hsl(240_8%_7%)] p-8 hover:border-[hsl(38_92%_50%)]/25 hover:bg-[hsl(240_8%_9%)] transition-all duration-300 hover:-translate-y-1">
                <div className="text-5xl font-bold gradient-text mb-3 tracking-tight">{s.value}</div>
                <div className="text-sm text-[hsl(240_5%_52%)] font-medium">{s.label}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="text-base px-10 gap-2">
              <Link href="/auth/register">
                PoÄni besplatno
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <p className="text-sm text-[hsl(240_5%_45%)]">Bez kreditne kartice. PoÄni za 2 minuta.</p>
          </div>
        </ScrollReveal>
      </section>

      {/* â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <footer className="border-t border-[hsl(240_5%_14%)] bg-[hsl(240_10%_5%)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-[hsl(0_0%_80%)]">Cheggie Studios</span>
              <span className="text-xs text-[hsl(240_5%_42%)]">Â© 2026 Sva prava zadrÅ¾ana.</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-[hsl(240_5%_42%)]">
              <a href="#" className="hover:text-[hsl(0_0%_68%)] transition-colors">Politika privatnosti</a>
              <a href="#" className="hover:text-[hsl(0_0%_68%)] transition-colors">Uslovi koriÅ¡Ä‡enja</a>
              <a href="#" className="hover:text-[hsl(0_0%_68%)] transition-colors">Kontakt</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
