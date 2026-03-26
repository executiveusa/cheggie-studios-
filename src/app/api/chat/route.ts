import { openai } from '@ai-sdk/openai'
import { streamText, tool } from 'ai'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM_PROMPT = `Ti si Cheggie AI asistent — pametan partner finansijskim i trading kreatorima koji koriste Cheggie Studios platformu.

Pomažeš korisnicima da:
- Pronađu specifične momente u video transkriptima (semantička pretraga)
- Analiziraju tržišne koncepte i ideje za sadržaj
- Izgraduju storyline i narativnu strukturu za video sadržaj
- Razumeju tehničke termine iz tradinga i finansija
- Optimizuju workflow za kreiranje sadržaja

Uvek odgovaraj na srpskom jeziku osim ako te korisnik pita na engleskom.
Budi koncizan, profesionalan i koristan. Fokusiraj se na finance, trading i kreiranje sadržaja.`

export async function POST(req: Request) {
  const { messages, projectId } = await req.json()

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: SYSTEM_PROMPT,
    messages,
    tools: {
      searchTranscript: tool({
        description: 'Pretraži transkript projekta po ključnim rečima ili semantičkom upitu.',
        parameters: z.object({
          query: z.string().describe('Pojam ili fraza za pretragu u transkriptu'),
          projectId: z.string().optional().describe('ID projekta za pretragu'),
        }),
        execute: async ({ query, projectId: pid }) => {
          const targetProject = pid || projectId
          if (!targetProject) {
            return { results: [], message: 'Nema aktivnog projekta. Otvori projekat pa pokušaj ponovo.' }
          }
          try {
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
            const res = await fetch(`${baseUrl}/api/projects/${targetProject}/search?q=${encodeURIComponent(query)}`, {
              headers: { 'Content-Type': 'application/json' },
            })
            if (!res.ok) return { results: [], message: 'Pretraga nije uspela.' }
            const data = await res.json() as { results?: unknown[] }
            return { results: data.results || [], query }
          } catch {
            return { results: [], message: 'Greška pri pretrazi.' }
          }
        },
      }),
      getMarketContext: tool({
        description: 'Dobavi kontekst i objašnjenje za finansijski ili trading termin',
        parameters: z.object({
          term: z.string().describe('Finansijski termin za objašnjenje'),
        }),
        execute: async ({ term }) => {
          const glossary: Record<string, string> = {
            'support': 'Support nivo — cena na kojoj postoji dovoljno potražnje da zaustavi pad.',
            'resistance': 'Resistance nivo — cena na kojoj postoji dovoljno ponude da zaustavi rast.',
            'rsi': 'RSI (Relative Strength Index) — oscilator koji meri brzinu i promenu cenovnih kretanja (0-100). Iznad 70 = preprodato, ispod 30 = prekupljeno.',
            'divergencija': 'Divergencija — kada se cena i indikator kreću u suprotnim smerovima. Klasičan sign potencijalnog reversal-a.',
            'volume': 'Volume — broj akcija/ugovora kojima se trguje u periodu. Visok volume potvrđuje trend.',
            'candlestick': 'Candlestick (sveća) — grafički prikaz cenovnog kretanja: open, high, low, close u jednom periodu.',
            'reversal': 'Reversal — preokret trenda.',
            'breakout': 'Breakout — proboj ključnog nivoa sa povećanim volume-om.',
          }
          const key = term.toLowerCase()
          const found = Object.entries(glossary).find(([k]) => key.includes(k))
          return found
            ? { term, explanation: found[1] }
            : { term, explanation: `${term} — finansijski termin. Preporučujem da konsultuješ trading rečnik za detalje.` }
        },
      }),
      browseWeb: tool({
        description: 'Preuzmi sadržaj sa web stranice',
        parameters: z.object({
          url: z.string().describe('URL stranice za učitavanje'),
        }),
        execute: async ({ url }) => {
          try {
            const res = await fetch(url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CheggiBot/1.0)' },
              signal: AbortSignal.timeout(8000),
            })
            const text = await res.text()
            const stripped = text
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 2000)
            return { url, content: stripped, success: true }
          } catch {
            return { url, content: null as string | null, success: false, error: 'Nije moguće učitati stranicu.' }
          }
        },
      }),
    },
  })

  return result.toDataStreamResponse({ headers: { 'Content-Type': 'text/event-stream' } })
}
