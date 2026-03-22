export interface TranscriptResult {
  text: string
  language: string
  segments: Array<{
    id: number
    start: number
    end: number
    text: string
    speaker?: string
  }>
  confidence?: number
  engineUsed: string
}

// ---------------------------------------------------------------------------
// Realistic Serbian finance/trading segments for demo purposes
// ---------------------------------------------------------------------------

const MOCK_SEGMENTS: Array<{ text: string; speaker: string; durationSeconds: number }> = [
  {
    text: 'Dobrodošli na našu analizu tržišta kriptovaluta za ovaj mesec.',
    speaker: 'Govornik A',
    durationSeconds: 5,
  },
  {
    text: 'Bitcoin je pokazao snažan rast u poslednjih sedam dana, dostižući nivo od šezdeset hiljada dolara.',
    speaker: 'Govornik A',
    durationSeconds: 7,
  },
  {
    text: 'Tržišni trendovi ukazuju na povećanje institucionalnih investicija u digitalne aktive.',
    speaker: 'Govornik B',
    durationSeconds: 6,
  },
  {
    text: 'Investiciona strategija za naredni kvartal treba da uključi diverzifikaciju portfelja.',
    speaker: 'Govornik B',
    durationSeconds: 7,
  },
  {
    text: 'Ethereum mreža nastavlja da privlači projekte iz oblasti decentralizovanih finansija.',
    speaker: 'Govornik A',
    durationSeconds: 6,
  },
  {
    text: 'Regulatorno okruženje u Srbiji i regionu postaje sve jasnije za kripto kompanije.',
    speaker: 'Govornik B',
    durationSeconds: 7,
  },
  {
    text: 'Preporučujemo praćenje makroekonomskih pokazatelja kao što su inflacija i kamatne stope.',
    speaker: 'Govornik A',
    durationSeconds: 7,
  },
  {
    text: 'Zaključujemo da je tržište u fazi konsolidacije i da su rizici upravljivi za iskusne investitore.',
    speaker: 'Govornik B',
    durationSeconds: 8,
  },
]

// Deterministic segment count based on title hash so the output is stable
function hashTitle(title: string): number {
  let h = 0
  for (let i = 0; i < title.length; i++) {
    h = (Math.imul(31, h) + title.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function generateMockTranscript(
  projectTitle: string,
  language = 'sr',
): TranscriptResult {
  const hash = hashTitle(projectTitle)
  const count = 6 + (hash % 3) // 6, 7, or 8 segments

  const selectedSegments = MOCK_SEGMENTS.slice(0, count)

  let cursor = 0
  const segments = selectedSegments.map((seg, idx) => {
    const start = cursor
    const end = cursor + seg.durationSeconds
    cursor = end + 0.5 // 0.5 s gap between segments

    return {
      id: idx,
      start,
      end,
      text: seg.text,
      speaker: seg.speaker,
    }
  })

  const fullText = segments.map((s) => s.text).join(' ')

  return {
    text: fullText,
    language,
    segments,
    confidence: 0.91,
    engineUsed: 'mock-demo',
  }
}
