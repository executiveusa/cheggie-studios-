import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

export interface SearchResult {
  segmentId: string
  transcriptId: string
  projectId: string
  text: string
  startMs: number
  endMs: number
  speaker?: string
  score: number
  highlight?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeIlikePattern(query: string): string {
  return query.replace(/[%_\\]/g, '\\$&')
}

function buildHighlight(text: string, query: string): string {
  const words = query
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  if (words.length === 0) return text

  const regex = new RegExp(`(${words.join('|')})`, 'gi')
  return text.replace(regex, '**$1**')
}

// ---------------------------------------------------------------------------
// Full-text search using PostgreSQL tsvector / websearch_to_tsquery
// Falls back to ILIKE if FTS fails (e.g., older Postgres or permission issue)
// ---------------------------------------------------------------------------

interface RawFtsRow {
  id: string
  transcript_id: string
  project_id: string
  text: string
  start_ms: number
  end_ms: number
  speaker: string | null
  rank: number
}

async function ftSearch(
  whereClause: Prisma.Sql,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  const rows = await prisma.$queryRaw<RawFtsRow[]>`
    SELECT
      ts."id",
      ts."transcriptId"  AS transcript_id,
      t."projectId"      AS project_id,
      ts."text",
      ts."startMs"       AS start_ms,
      ts."endMs"         AS end_ms,
      ts."speaker",
      ts_rank_cd(
        to_tsvector('simple', ts."text"),
        websearch_to_tsquery('simple', ${query})
      ) AS rank
    FROM "TranscriptSegment" ts
    JOIN "Transcript" t ON t."id" = ts."transcriptId"
    WHERE ${whereClause}
      AND to_tsvector('simple', ts."text") @@ websearch_to_tsquery('simple', ${query})
    ORDER BY rank DESC
    LIMIT ${limit}
  `

  return rows.map((row) => ({
    segmentId: row.id,
    transcriptId: row.transcript_id,
    projectId: row.project_id,
    text: row.text,
    startMs: row.start_ms,
    endMs: row.end_ms,
    speaker: row.speaker ?? undefined,
    score: Number(row.rank),
    highlight: buildHighlight(row.text, query),
  }))
}

interface RawIlikeRow {
  id: string
  transcript_id: string
  project_id: string
  text: string
  start_ms: number
  end_ms: number
  speaker: string | null
}

async function ilikeSearch(
  whereClause: Prisma.Sql,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  const pattern = `%${escapeIlikePattern(query)}%`

  const rows = await prisma.$queryRaw<RawIlikeRow[]>`
    SELECT
      ts."id",
      ts."transcriptId"  AS transcript_id,
      t."projectId"      AS project_id,
      ts."text",
      ts."startMs"       AS start_ms,
      ts."endMs"         AS end_ms,
      ts."speaker"
    FROM "TranscriptSegment" ts
    JOIN "Transcript" t ON t."id" = ts."transcriptId"
    WHERE ${whereClause}
      AND ts."text" ILIKE ${pattern}
    ORDER BY ts."index" ASC
    LIMIT ${limit}
  `

  return rows.map((row) => ({
    segmentId: row.id,
    transcriptId: row.transcript_id,
    projectId: row.project_id,
    text: row.text,
    startMs: row.start_ms,
    endMs: row.end_ms,
    speaker: row.speaker ?? undefined,
    score: 0.5,
    highlight: buildHighlight(row.text, query),
  }))
}

async function runSearch(
  whereClause: Prisma.Sql,
  query: string,
  limit: number,
  minScore: number,
): Promise<SearchResult[]> {
  if (!query.trim()) return []

  let results: SearchResult[]

  try {
    results = await ftSearch(whereClause, query, limit)
  } catch {
    results = await ilikeSearch(whereClause, query, limit)
  }

  return results.filter((r) => r.score >= minScore)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function searchTranscript(
  projectId: string,
  query: string,
  options: { limit?: number; minScore?: number } = {},
): Promise<SearchResult[]> {
  const limit = options.limit ?? 20
  const minScore = options.minScore ?? 0

  const whereClause = Prisma.sql`t."projectId" = ${projectId}`

  return runSearch(whereClause, query, limit, minScore)
}

export async function searchAllProjects(
  userId: string,
  query: string,
  options: { limit?: number } = {},
): Promise<SearchResult[]> {
  const limit = options.limit ?? 50

  const whereClause = Prisma.sql`
    t."projectId" IN (
      SELECT id FROM "Project" WHERE "userId" = ${userId}
    )
  `

  return runSearch(whereClause, query, limit, 0)
}
