'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useInView, type Variants } from 'framer-motion'
import { useRef } from 'react'
import {
  Search,
  FileText,
  ArrowRight,
  CheckCircle2,
  Upload,
  Wand2,
  Download,
  Captions,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Navbar } from '@/components/layout/navbar'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 },
  }),
}

function ScrollReveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
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

function ProductPreview() {
  const segments = [
    { time: '02:14', text: 'SPX je bio na kljucnom support nivou od 5200', highlight: true },
    { time: '04:31', text: 'Volume je bio 3x iznad proseka - jasna validacija' },
    { time: '07:08', text: 'RSI divergencija na daily - klasican reversal setup', highlight: true },
    { time: '09:55', text: 'Ceo forex market bio je risk-off mode tog jutra' },
    { time: '12:22', text: 'Ovaj setup je tacno ono sto trazimo za short poziciju' },
  ]
  return (
    <div className="relative mx-auto max-w-2xl">
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-2/3 h-12 bg-[hsl(142_71%_45%)]/8 blur-3xl rounded-full pointer-events-none" />
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
            <Search className="h-4 w-4 text-[hsl(142_71%_45%)]" />
            <span className="text-sm text-white">support nivo</span>
            <span className="ml-auto text-xs text-[hsl(240_5%_45%)]">2 pogotka</span>
          </div>
          {segments.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.09, duration: 0.32, ease: 'easeOut' }}
              className={`flex gap-3 rounded-lg p-2.5 text-sm transition-colors cursor-pointer ${
                s.highlight
                  ? 'bg-[hsl(142_71%_45%)]/8 border border-[hsl(142_71%_45%)]/20'
                  : 'hover:bg-[hsl(240_8%_10%)]'
              }`}
            >
              <span className={`shrink-0 font-mono text-xs pt-0.5 ${s.highlight ? 'text-[hsl(142_71%_60%)]' : 'text-[hsl(240_5%_40%)]'}`}>
                {s.time}
              </span>
              <span className={s.highlight ? 'text-[hsl(0_0%_88%)]' : 'text-[hsl(240_5%_60%)]'}>
                {s.text}
              </span>
              {s.highlight && (
                <CheckCircle2 className="ml-auto shrink-0 h-4 w-4 text-[hsl(142_71%_45%)]" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const steps = [
    { icon: Upload,   num: '01', title: 'Uploaduj snimak',  desc: 'Prevuci i pusti video ili audio. Podrzavamo MP4, MOV, MP3 i vise.' },
    { icon: Wand2,    num: '02', title: 'AI transkribuje',  desc: 'Whisper pretvara govor u tekst za sekunde, optimizovan za trading terminologiju.' },
    { icon: Search,   num: '03', title: 'Pronadji i slozi', desc: 'Pretrazi, oznaci momente, slozi storyline — sve iz teksta.' },
    { icon: Download, num: '04', title: 'Eksportuj',        desc: 'SRT, VTT titlovi, PDF transkript, clanci — jednim klikom.' },
  ]

  const features: { icon: React.ElementType; title: string; desc: string }[] = [
    { icon: Search,   title: 'Naadji pravi trenutak', desc: 'Pretrazi ceo snimak po tekstu i odmah nadji tacan momenat koji ti treba — bez premotavanja.' },
    { icon: FileText, title: 'Montiraj iz teksta',    desc: 'Slozi pricu iz transkript segmenata — samo oznaci sta ti treba i napravi storyline za svoju objavu.' },
    { icon: Captions, title: 'Titlovi brze',          desc: 'Automatski generisi SRT i VTT titlove, edituj ih direktno i preuzmi za upload na bilo koju platformu.' },
    { icon: Wand2,    title: 'Radi na srpskom',       desc: 'Transkript i ceo workflow su optimizovani za srpski jezik — nema gubitka u prevodu.' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <Navbar user={null} />

      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-[hsl(240_5%_16%)]" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="text-5xl sm:text-6xl lg:text-[72px] font-bold leading-[1.08] tracking-tight mb-6"
          >
            Pretvori market insight u{' '}
            <span className="text-[hsl(142_71%_55%)]">premium sadrzaj</span>{' '}
            brze.
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="text-lg sm:text-xl text-[hsl(240_5%_58%)] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Cheggie Studios pomaze finance i trading kreatorima da od jednog snimka dobiju transkript,
            pronadju najbolje momente, sloze pricu i pripreme sadrzaj za objavu.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10"
          >
            <Button size="lg" asChild className="w-full sm:w-auto bg-[hsl(142_71%_45%)] hover:bg-[hsl(142_65%_40%)] text-white border-0 text-base px-8 gap-2 rounded-lg">
              <Link href="/auth/register">
                Pocni besplatno
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto text-base px-8 gap-2 border-[hsl(240_5%_22%)] text-[hsl(0_0%_70%)] hover:text-white hover:border-[hsl(240_5%_32%)] rounded-lg">
              <a href="#how-it-works">
                <Play className="h-4 w-4" />
                Pogledaj kako radi
              </a>
            </Button>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="flex flex-wrap items-center justify-center gap-5 text-sm text-[hsl(240_5%_48%)]"
          >
            {['Bez kreditne kartice', 'Srpski jezik', 'Pocni za 2 minuta'].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(142_71%_45%)]" />
                {t}
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-28"
        >
          <ProductPreview />
        </motion.div>
      </section>

      <section className="border-y border-[hsl(240_5%_12%)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 divide-x divide-[hsl(240_5%_12%)]">
            {[
              { value: '10x',     label: 'brze do titlova' },
              { value: 'SRT/VTT', label: 'svi standardni formati' },
              { value: '100%',    label: 'srpski jezik' },
            ].map((s) => (
              <div key={s.label} className="py-10 px-6 text-center">
                <div className="text-3xl sm:text-4xl font-bold text-[hsl(142_71%_55%)] mb-1 tracking-tight">{s.value}</div>
                <div className="text-sm text-[hsl(240_5%_48%)]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Od snimka do objave za 4 koraka</h2>
            <p className="text-[hsl(240_5%_52%)] text-lg">Bez prebacivanja izmedju alata. Sve na jednom mestu.</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((s, i) => (
              <ScrollReveal key={s.num} delay={i * 0.5}>
                <div className="rounded-xl border border-[hsl(240_5%_15%)] bg-[hsl(240_10%_5%)] p-6 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(142_71%_45%)]/10 border border-[hsl(142_71%_45%)]/20">
                      <s.icon className="h-4 w-4 text-[hsl(142_71%_45%)]" />
                    </div>
                    <span className="font-mono text-xs text-[hsl(240_5%_38%)] font-semibold">{s.num}</span>
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-2">{s.title}</h3>
                  <p className="text-xs text-[hsl(240_5%_50%)] leading-relaxed">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-[hsl(240_8%_6%)] border-y border-[hsl(240_5%_12%)] py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Sve sto ti treba, na jednom mestu</h2>
            <p className="text-[hsl(240_5%_52%)] text-lg max-w-xl">Od snimka do objave — bez prebacivanja izmedju alata.</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.4}>
                <div className="rounded-xl border border-[hsl(240_5%_15%)] bg-[hsl(240_8%_7%)] p-6 h-full">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(142_71%_45%)]/10 border border-[hsl(142_71%_45%)]/20">
                      <f.icon className="h-5 w-5 text-[hsl(142_71%_45%)]" />
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
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="shrink-0">
                <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-[hsl(240_8%_8%)] border border-[hsl(240_5%_16%)]">
                  <Image src="/logo.webp" alt="Cheggie Studios" width={80} height={80} className="object-contain" />
                </div>
              </div>
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Sadrzaj koji prodaje poverenje</h2>
                <p className="text-lg text-[hsl(240_5%_58%)] mb-6 leading-relaxed">
                  U finance i trading nisu sadrzaj ne prodaje samo informacije. On prodaje poverenje.
                  Cheggie Studios ti pomaze da objavljujes brze i izgledas ozbiljnije — bez gubljenja sati na manuelno editovanje.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <Button size="lg" asChild className="bg-[hsl(142_71%_45%)] hover:bg-[hsl(142_65%_40%)] text-white border-0 text-base px-8 gap-2 rounded-lg">
                    <Link href="/auth/register">
                      Pocni besplatno
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <p className="text-sm text-[hsl(240_5%_45%)]">Bez kreditne kartice. Pocni za 2 minuta.</p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <footer className="border-t border-[hsl(240_5%_13%)] py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.webp" alt="Cheggie Studios" width={24} height={24} className="rounded-md object-contain" />
            <span className="text-sm font-semibold text-white">Cheggie Studios</span>
          </div>
          <p className="text-xs text-[hsl(240_5%_40%)]">© {new Date().getFullYear()} Cheggie Studios. Sva prava zadrzana.</p>
          <div className="flex gap-5 text-xs text-[hsl(240_5%_42%)]">
            <Link href="/auth/login" className="hover:text-white transition-colors">Prijava</Link>
            <Link href="/auth/register" className="hover:text-white transition-colors">Registracija</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}