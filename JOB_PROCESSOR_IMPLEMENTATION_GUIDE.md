# CHEGGIE STUDIOS — JOB PROCESSOR IMPLEMENTATION GUIDE

**Status:** Phase 2.1 - Critical Path  
**Target:** Implement all 5 job processors with real business logic  
**Design Law:** REUSE BEFORE CREATE, NON-DUPLICATION  

---

## EXISTING INFRASTRUCTURE (Already Built ✅)

The following infrastructure is already in place and should be REUSED:

### Queue System
- **Location:** `src/lib/queue/client.ts`
- **Capabilities:**
  - `redisConnection` — Shared Redis client (BullMQ compatible)
  - `createQueue<TData, TResult>(name)` — Queue factory
  - `createWorker<TData, TResult>(name, processor)` — Worker factory
  - Auto-retry with exponential backoff (3 attempts, 2s base delay)
  - Job removal on complete/fail for history cleanup

### Job Dispatch
- **Location:** `src/lib/queue/jobs.ts`
- **Functions:**
  - `dispatchTranscriptJob(projectId, fileUrl, language)` ✅
  - `dispatchSearchJob(projectId, transcriptId)` ✅
  - `dispatchSubtitleJob(projectId, transcriptId, format)` ✅
  - `dispatchExportJob(projectId, type, options)` ✅
- **Pattern:** Each function:
  1. Creates a JobRecord in DB (for audit trail)
  2. Dispatches to BullMQ queue
  3. Links JobRecord to BullMQ job ID
  4. Returns JobRecord ID to caller

### AI Integration
- **Location:** `src/lib/ai/`
- **Mock transcript engine** (`mock-transcript.ts`) — Fake data for dev/demo
- **Whisper integration** (`whisper.ts`) — Real OpenAI Whisper API calls
- **Engine selector:** Via env var `TRANSCRIPT_ENGINE` (mock|openai|local)

### Error Handling
- **Location:** `src/lib/errors.ts`
- **Base class:** `AppError extends Error`
- **Subclasses:** `AuthError`, `ValidationError`, service-specific errors
- **Pattern:** Each service error extends `AppError` with domain-specific code + statusCode

### Database
- **Location:** `src/lib/db/` (Prisma singleton)
- **Models ready:**
  - `JobRecord` — Audit trail + BullMQ linkage
  - `Transcript` + `TranscriptSegment` — For transcript data
  - `SearchIndex` — For full-text search
  - `AssetFile` — For exported subtitle files
  - `Project` — Project/workspace scoping

---

## WHAT NEEDS TO BE IMPLEMENTED

### Job Processor #1: Transcript Processing

**File to create:** `src/workers/processors/transcript.processor.ts`

```typescript
import { Job } from 'bullmq'
import { prisma } from '@/lib/db'
import { getTranscript } from '@/lib/ai/transcript'  // abstracts mock vs openai
import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'

interface TranscriptJobPayload {
  projectId: string
  mediaFileId: string
  fileUrl: string
  language: string  // 'sr' for Serbian, 'en' for English
}

/**
 * Process a transcript job: fetch media, transcribe via Whisper, segment, store.
 *
 * REUSE BEFORE CREATE:
 * - Reuse getTranscript() from lib/ai which already handles mock vs openai
 * - Reuse AppError for consistent error handling
 * - Reuse Prisma singleton for all DB access
 */
export async function processTranscriptJob(
  job: Job<TranscriptJobPayload>,
): Promise<{ segmentCount: number; duration: number }> {
  const { projectId, mediaFileId, fileUrl, language } = job.data

  try {
    // Step 1: Verify MediaFile exists and is in PENDING/PROCESSING state
    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id: mediaFileId },
      include: { project: { include: { workspace: true } } },
    })

    if (!mediaFile) {
      throw new AppError(
        `MediaFile not found: ${mediaFileId}`,
        'MEDIA_FILE_NOT_FOUND',
        404,
      )
    }

    // Step 2: Create/update Transcript record
    const transcript = await prisma.transcript.upsert({
      where: { mediaFileId },
      create: {
        mediaFileId,
        language,
        status: 'PROCESSING',
        payload: { jobId: job.id },
      },
      update: {
        status: 'PROCESSING',
        payload: { jobId: job.id },
      },
    })

    // Step 3: Call Whisper API (or mock engine) — already abstracted in lib/ai
    const transcriptResponse = await getTranscript(fileUrl, language, env.TRANSCRIPT_ENGINE)

    // transcriptResponse = {
    //   text: string,
    //   segments: Array<{ id: number; start: number; end: number; text: string }>
    // }

    // Step 4: Bulk insert TranscriptSegment records
    const segments = transcriptResponse.segments.map((seg: any, idx: number) => ({
      transcriptId: transcript.id,
      segmentIndex: idx,
      startTime: seg.start,
      endTime: seg.end,
      text: seg.text,
      language,
    }))

    await prisma.transcriptSegment.createMany({ data: segments })

    // Step 5: Update Transcript status to READY
    await prisma.transcript.update({
      where: { id: transcript.id },
      data: {
        status: 'READY',
        segmentCount: segments.length,
        totalDuration: transcriptResponse.segments[segments.length - 1]?.end ?? 0,
        payload: { jobId: job.id, completedAt: new Date().toISOString() },
      },
    })

    // Step 6: Update MediaFile status to READY (indicates transcript is done)
    await prisma.mediaFile.update({
      where: { id: mediaFileId },
      data: { status: 'READY' },
    })

    // Step 7: Emit completion event (for real-time UI updates, future webhook)
    console.log(`[transcript:processor] completed: ${mediaFileId}, segments: ${segments.length}`)

    return {
      segmentCount: segments.length,
      duration: transcriptResponse.segments[segments.length - 1]?.end ?? 0,
    }
  } catch (err) {
    // On error, update Transcript and MediaFile to ERROR status
    await prisma.transcript.update({
      where: { mediaFileId },
      data: {
        status: 'ERROR',
        payload: { error: (err as Error).message, failedAt: new Date().toISOString() },
      },
    })

    await prisma.mediaFile.update({
      where: { id: mediaFileId },
      data: { status: 'ERROR' },
    })

    // Re-throw to trigger BullMQ retry mechanism
    throw err
  }
}
```

**Acceptance Criteria:**
- [ ] Receives TranscriptJobPayload
- [ ] Verifies MediaFile exists
- [ ] Calls Whisper API (or mock) via getTranscript()
- [ ] Creates TranscriptSegment records for each segment
- [ ] Updates Transcript status to READY
- [ ] Updates MediaFile status to READY
- [ ] Errors update status to ERROR and include error message
- [ ] Returns segmentCount and duration
- [ ] Properly retries on failure (3 attempts)
- [ ] Unit test passes: mock Whisper with 5 test cases

---

### Job Processor #2: Search Indexing

**File to create:** `src/workers/processors/search.processor.ts`

```typescript
import { Job } from 'bullmq'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'
import { AppError } from '@/lib/errors'

interface SearchIndexJobPayload {
  projectId: string
  transcriptId: string
  mediaFileId: string
}

/**
 * Process a search index job: fetch transcript segments, build tsvector, insert into SearchIndex.
 * 
 * REUSE BEFORE CREATE:
 * - Reuse PostgreSQL tsvector functionality (already in Prisma schema)
 * - Reuse Redis client for cache invalidation
 * - Reuse AppError for consistent error handling
 */
export async function processSearchIndexJob(
  job: Job<SearchIndexJobPayload>,
): Promise<{ indexedSegmentCount: number }> {
  const { projectId, transcriptId, mediaFileId } = job.data

  try {
    // Step 1: Fetch all TranscriptSegments for this transcript
    const segments = await prisma.transcriptSegment.findMany({
      where: { transcriptId },
      orderBy: { segmentIndex: 'asc' },
    })

    if (segments.length === 0) {
      throw new AppError(
        `No segments found for transcript: ${transcriptId}`,
        'NO_SEGMENTS',
        400,
      )
    }

    // Step 2: Build searchable text (all segments concatenated)
    const searchableText = segments.map((s) => s.text).join(' ')

    // Step 3: Insert into SearchIndex (Prisma will handle tsvector generation)
    const searchIndex = await prisma.searchIndex.upsert({
      where: { transcriptId },
      create: {
        project: { connect: { id: projectId } },
        mediaFile: { connect: { id: mediaFileId } },
        transcript: { connect: { id: transcriptId } },
        searchText: searchableText,
        status: 'READY',
        segmentCount: segments.length,
      },
      update: {
        searchText: searchableText,
        status: 'READY',
        segmentCount: segments.length,
      },
    })

    // Step 4: Invalidate search cache for this project
    const cacheKey = `search:project:${projectId}:*`
    await redis.del(cacheKey)  // Redis pattern matching delete

    console.log(`[search:processor] indexed: ${transcriptId}, segments: ${segments.length}`)

    return { indexedSegmentCount: segments.length }
  } catch (err) {
    // On error, update SearchIndex to ERROR
    await prisma.searchIndex.update({
      where: { transcriptId },
      data: {
        status: 'ERROR',
        payload: { error: (err as Error).message },
      },
    })

    throw err
  }
}
```

**Acceptance Criteria:**
- [ ] Receives SearchIndexJobPayload
- [ ] Fetches all TranscriptSegments ordered by segmentIndex
- [ ] Builds searchable text from segment concatenation
- [ ] Inserts/updates SearchIndex record with tsvector
- [ ] Invalidates Redis cache for project
- [ ] Returns indexedSegmentCount
- [ ] Handles error: updates SearchIndex.status to ERROR
- [ ] Unit test passes: 3 test cases (1 success, 2 error scenarios)

---

### Job Processor #3: Subtitle Export

**File to create:** `src/workers/processors/subtitle-export.processor.ts`

```typescript
import { Job } from 'bullmq'
import { prisma } from '@/lib/db'
import { storage } from '@/lib/storage'  // S3/local adapter
import { AppError } from '@/lib/errors'

interface SubtitleExportJobPayload {
  projectId: string
  transcriptId: string
  format: 'SRT' | 'VTT' | 'ASS'
}

/**
 * Process a subtitle export job: generate subtitle file in requested format, upload to storage.
 *
 * REUSE BEFORE CREATE:
 * - Reuse storage adapter (already handles S3/local transparently)
 * - Reuse AppError for consistent error handling
 */
export async function processSubtitleExportJob(
  job: Job<SubtitleExportJobPayload>,
): Promise<{ fileUrl: string; format: string }> {
  const { projectId, transcriptId, format } = job.data

  try {
    // Step 1: Fetch transcript segments
    const segments = await prisma.transcriptSegment.findMany({
      where: { transcriptId },
      orderBy: { segmentIndex: 'asc' },
    })

    if (segments.length === 0) {
      throw new AppError(
        `No segments for transcript: ${transcriptId}`,
        'NO_SEGMENTS',
        400,
      )
    }

    // Step 2: Generate subtitle content in requested format
    let subtitleContent: string

    switch (format) {
      case 'SRT':
        subtitleContent = generateSRT(segments)
        break
      case 'VTT':
        subtitleContent = generateVTT(segments)
        break
      case 'ASS':
        subtitleContent = generateASS(segments)
        break
      default:
        throw new AppError(`Unknown format: ${format}`, 'UNKNOWN_FORMAT', 400)
    }

    // Step 3: Upload to storage adapter (S3 or local)
    const filename = `${transcriptId}-${format.toLowerCase()}.${format.toLowerCase()}`
    const fileUrl = await storage.upload(filename, subtitleContent, {
      projectId,
      mediaFileId: segments[0]?.transcriptId,
      contentType: getContentType(format),
    })

    // Step 4: Create AssetFile record for audit
    const assetFile = await prisma.assetFile.create({
      data: {
        project: { connect: { id: projectId } },
        mediaFile: { connect: { id: segments[0]?.transcriptId ?? '' } },
        type: `SUBTITLE_${format}`,
        storageUrl: fileUrl,
        metadata: { format, segmentCount: segments.length },
      },
    })

    console.log(`[subtitle:processor] exported: ${transcriptId} as ${format}`)

    return { fileUrl, format }
  } catch (err) {
    console.error(`[subtitle:processor] failed for ${transcriptId}:`, err)
    throw err
  }
}

// Format generators
function generateSRT(segments: any[]): string {
  return segments
    .map((seg, idx) => {
      const start = formatTimeSRT(seg.startTime)
      const end = formatTimeSRT(seg.endTime)
      return `${idx + 1}\n${start} --> ${end}\n${seg.text}\n`
    })
    .join('\n')
}

function generateVTT(segments: any[]): string {
  const content = segments
    .map((seg) => {
      const start = formatTimeVTT(seg.startTime)
      const end = formatTimeVTT(seg.endTime)
      return `${start} --> ${end}\n${seg.text}\n`
    })
    .join('\n')
  return `WEBVTT\n\n${content}`
}

function generateASS(segments: any[]): string {
  const header = `[Script Info]
Title: Cheggie Studios Export
Original Script: Cheggie Studios
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`
  const events = segments
    .map((seg) => {
      const start = formatTimeASS(seg.startTime)
      const end = formatTimeASS(seg.endTime)
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${seg.text}`
    })
    .join('\n')

  return header + events
}

// Time formatters
function formatTimeSRT(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

function formatTimeVTT(seconds: number): string {
  return formatTimeSRT(seconds)
}

function formatTimeASS(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const cs = Math.floor((seconds % 1) * 100)
  return `${String(h).padStart(1, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

function getContentType(format: string): string {
  switch (format) {
    case 'SRT':
      return 'text/plain'
    case 'VTT':
      return 'text/vtt'
    case 'ASS':
      return 'text/plain'
    default:
      return 'application/octet-stream'
  }
}
```

**Acceptance Criteria:**
- [ ] Receives SubtitleExportJobPayload
- [ ] Fetches all TranscriptSegments
- [ ] Generates SRT, VTT, or ASS format correctly
- [ ] Uploads file via storage adapter (S3/local)
- [ ] Creates AssetFile record for audit
- [ ] Returns fileUrl and format
- [ ] Unit test passes: 9 test cases (3 formats × 3 scenarios each)

---

### Job Processor #4: Story Building

**File to create:** `src/workers/processors/story-build.processor.ts`

```typescript
import { Job } from 'bullmq'
import { prisma } from '@/lib/db'
import { callAI } from '@/lib/ai'  // via OpenAI/Claude/etc
import { AppError } from '@/lib/errors'

interface StoryBuildJobPayload {
  projectId: string
  transcriptId: string
}

/**
 * Process a story build job: extract narrative structure, chapters, summary, title.
 *
 * REUSE BEFORE CREATE:
 * - Reuse callAI() abstraction from lib/ai
 * - Reuse prompts from central registry (SYNTHIA 3.0™ pattern)
 */
export async function processStoryBuildJob(
  job: Job<StoryBuildJobPayload>,
): Promise<{ chapterCount: number; storyId: string }> {
  const { projectId, transcriptId } = job.data

  try {
    // Step 1: Fetch all transcript segments
    const segments = await prisma.transcriptSegment.findMany({
      where: { transcriptId },
      orderBy: { segmentIndex: 'asc' },
    })

    if (segments.length === 0) {
      throw new AppError(
        `No segments for story: ${transcriptId}`,
        'NO_SEGMENTS',
        400,
      )
    }

    // Step 2: Build full transcript text
    const fullTranscript = segments.map((s) => s.text).join(' ')

    // Step 3: Call AI to extract story structure
    // (This would use prompts from src/lib/prompts/registry.ts)
    const storyStructure = await extractStoryStructure(fullTranscript)

    // storyStructure = {
    //   chapters: Array<{
    //     title: string,
    //     startSegmentIndex: number,
    //     endSegmentIndex: number,
    //     description: string
    //   }>,
    //   summary: string,
    //   suggestedTitle: string
    // }

    // Step 4: Fetch or create Project and Story
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      throw new AppError(`Project not found: ${projectId}`, 'PROJECT_NOT_FOUND', 404)
    }

    const story = await prisma.story.create({
      data: {
        project: { connect: { id: projectId } },
        transcript: { connect: { id: transcriptId } },
        title: storyStructure.suggestedTitle,
        summary: storyStructure.summary,
        status: 'DRAFT',
      },
    })

    // Step 5: Create Chapter records
    const chapters = await Promise.all(
      storyStructure.chapters.map((ch: any) =>
        prisma.chapter.create({
          data: {
            story: { connect: { id: story.id } },
            transcript: { connect: { id: transcriptId } },
            title: ch.title,
            description: ch.description,
            startSegmentIndex: ch.startSegmentIndex,
            endSegmentIndex: ch.endSegmentIndex,
            status: 'READY',
          },
        }),
      ),
    )

    // Step 6: Update Story status to READY
    await prisma.story.update({
      where: { id: story.id },
      data: { status: 'READY' },
    })

    console.log(
      `[story:processor] created story: ${story.id}, chapters: ${chapters.length}`,
    )

    return { chapterCount: chapters.length, storyId: story.id }
  } catch (err) {
    console.error(`[story:processor] failed for ${transcriptId}:`, err)
    throw err
  }
}

/**
 * Call AI to extract story structure from full transcript.
 * This would normally use a prompt from src/lib/prompts/registry.ts
 */
async function extractStoryStructure(transcript: string): Promise<any> {
  // Placeholder: this would call OpenAI with a story-builder prompt
  // In real implementation, inject getPrompt() dependency
  return {
    chapters: [
      {
        title: 'Introduction',
        startSegmentIndex: 0,
        endSegmentIndex: 5,
        description: '',
      },
      {
        title: 'Main Content',
        startSegmentIndex: 5,
        endSegmentIndex: 20,
        description: '',
      },
    ],
    summary: 'A summary generated by AI',
    suggestedTitle: 'Suggested Video Title',
  }
}
```

**Acceptance Criteria:**
- [ ] Receives StoryBuildJobPayload
- [ ] Fetches all TranscriptSegments
- [ ] Calls AI to extract story structure
- [ ] Creates Story record with title and summary
- [ ] Creates Chapter records with segment ranges
- [ ] Sets Story and Chapter status to READY
- [ ] Returns chapterCount and storyId
- [ ] Unit test passes: 3 test cases

---

### Job Processor #5: ComfyUI Rendering (STUB for Sprint 3)

**File to create:** `src/workers/processors/comfyui-render.processor.ts`

```typescript
import { Job } from 'bullmq'

interface ComfyUIRenderJobPayload {
  projectId: string
  videoId: string
  workflow: Record<string, unknown>  // ComfyUI workflow JSON
}

/**
 * STUB: ComfyUI rendering job processor.
 *
 * Status: PLANNED FOR SPRINT 3
 * Expected completion: 2026-03-31
 *
 * This processor will:
 * 1. Connect to ComfyUI webhook
 * 2. Submit workflow for rendering
 * 3. Poll for completion
 * 4. Store rendered video in storage
 * 5. Create VideoAsset record
 *
 * Blocking: ComfyUI setup + Docker container needed
 */
export async function processComfyUIRenderJob(
  job: Job<ComfyUIRenderJobPayload>,
): Promise<{ status: string }> {
  console.warn(
    '[comfyui:processor] STUB - not implemented until Sprint 3. Job will complete without rendering.',
  )

  // For now, just return success so worker doesn't crash
  return { status: 'SCHEDULED_FOR_SPRINT_3' }
}
```

**Acceptance Criteria:**
- [ ] Created as STUB with clear Sprint 3 target date
- [ ] Does not throw errors or crash
- [ ] Returns valid response
- [ ] Documented in BUILD_NOTES.md why it's stubbed

---

## WORKER PROCESS ENTRY POINT

**File to create:** `src/workers/processor.ts`

```typescript
import { createWorker } from '@/lib/queue/client'
import { processTranscriptJob } from './processors/transcript.processor'
import { processSearchIndexJob } from './processors/search.processor'
import { processSubtitleExportJob } from './processors/subtitle-export.processor'
import { processStoryBuildJob } from './processors/story-build.processor'
import { processComfyUIRenderJob } from './processors/comfyui-render.processor'
import { transcriptQueue, searchQueue, subtitleQueue, exportQueue, comfyuiQueue } from '@/lib/queue/queues'

/**
 * Worker process entry point.
 * Registers all job processors with their respective queues.
 *
 * Run locally: `pnpm worker:start`
 * Run in production: Docker container with `pnpm worker:start` CMD
 */

async function startWorkers() {
  console.log('[worker] starting all queue processors...')

  // Transcript worker (concurrency: 1 — Whistler API calls are sequential)
  const transcriptWorker = createWorker('transcript:process', processTranscriptJob, 1)
  console.log('[worker] registered: transcript:process')

  // Search worker (concurrency: 2)
  const searchWorker = createWorker('search:index', processSearchIndexJob, 2)
  console.log('[worker] registered: search:index')

  // Subtitle worker (concurrency: 3 — fast operation)
  const subtitleWorker = createWorker('export:subtitle', processSubtitleExportJob, 3)
  console.log('[worker] registered: export:subtitle')

  // Story worker (concurrency: 1 — AI calls are sequential)
  const storyWorker = createWorker('story:build', processStoryBuildJob, 1)
  console.log('[worker] registered: story:build')

  // ComfyUI worker (concurrency: 1 — GPU-limited)
  const comfyuiWorker = createWorker('render:comfyui', processComfyUIRenderJob, 1)
  console.log('[worker] registered: render:comfyui')

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[worker] SIGTERM received, shutting down gracefully...')
    await Promise.all([
      transcriptWorker.close(),
      searchWorker.close(),
      subtitleWorker.close(),
      storyWorker.close(),
      comfyuiWorker.close(),
    ])
    process.exit(0)
  })

  console.log('[worker] all processors started and listening for jobs')
}

startWorkers().catch((err) => {
  console.error('[worker] startup failed:', err)
  process.exit(1)
})
```

---

## IMPLEMENTATION ORDER (Priority)

| Priority | Processor | Est. Time | Blocker? | Depends On |
|----------|-----------|-----------|----------|-----------|
| 🔴 CRITICAL | Transcript | 4h | YES | Whisper API working |
| 🔴 CRITICAL | Search Index | 2h | YES | Transcript ready |
| 🟡 HIGH | Subtitle Export | 3h | NO | Transcript ready |
| 🟡 HIGH | Story Build | 5h | NO | AI prompt registry wired |
| 🟢 LOW | ComfyUI (STUB) | 0.5h | NO | (Deferred to Sprint 3) |

**Total Effort:** ~14-15 engineering hours

---

## TESTING STRATEGY

### Unit Tests (Vitest)
- Mock Prisma client
- Mock Redis connection
- Mock OpenAI/Whisper responses
- Test each processor with 3+ scenarios

### Integration Tests (Playwright E2E)
- Real upload flow end-to-end
- Verify job completes successfully
- Check database was updated

### Performance Tests
- 100 concurrent uploads?
- Monitor queue depth
- Check error rates

---

## DEPLOYMENT

### Local Development
```bash
# Terminal 1: Web app
pnpm dev

# Terminal 2: Workers
pnpm worker:start
```

### Production (Vercel + Coolify)
- Web app: `deployWithVercel()`
- Workers: Separate Coolify container running `pnpm worker:start`
- Health check endpoint: `/api/workers/health`

---

**Document Created:** 2026-03-24  
**Responsible:** @claude (code gen), @executiveusa (review + test planning)  
**Status:** Ready for implementation
