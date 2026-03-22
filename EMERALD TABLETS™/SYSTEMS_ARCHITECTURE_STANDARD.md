# EMERALD TABLETS™ — SYSTEMS ARCHITECTURE STANDARD

> This document defines the canonical architecture for the Cheggie Studios platform. All engineering work must conform to this standard. Deviations require a decision log entry with rationale.

---

## I. ARCHITECTURE OVERVIEW

Cheggie Studios is built as a monolithic Next.js 15 application with a co-located background worker process. The architecture is intentionally monolith-first: a single deployable unit that can be split into microservices only when scaling demands require it.

### Core Technology Stack

| Concern | Technology | Version | Rationale |
|---|---|---|---|
| Web framework | Next.js | 15.x (App Router) | Server components, streaming, edge-ready, full-stack |
| Language | TypeScript | 5.x strict mode | Type safety, refactor confidence, IDE productivity |
| ORM | Prisma | 5.x | Schema-first, migration management, type-safe queries |
| Database | PostgreSQL | 16.x | Full-text search, JSONB, reliable, self-hostable |
| Cache + Queue broker | Redis | 7.x | Session cache, job queues, rate limiting |
| Job queues | BullMQ | 5.x | Redis-backed, reliable, observable job processing |
| Auth | NextAuth v5 | 5.x beta | App Router native, credentials + OAuth, session management |
| Styling | Tailwind CSS | 4.x | Utility-first, design tokens, dark mode first-class |
| UI components | shadcn/ui patterns | custom | Accessible, composable, consistent design language |
| Localization | next-intl | 3.x | App Router native i18n, Serbian Latin default |
| Monitoring | Sentry | 8.x | Error tracking, performance, session replay |
| Container | Docker + Compose | latest | Self-hostable, reproducible environments |
| Reverse proxy | NGINX | 1.25+ | SSL termination, static asset serving, upstream proxy |

---

## II. LAYER DIAGRAM

The system is organized into strict vertical layers. Data flows top-to-bottom. Imports flow top-to-bottom. No layer imports from a layer above it.

```
┌─────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                       │
│  Next.js App Router pages, React server components,      │
│  client components, layouts, loading states              │
│  /src/app/                                               │
└──────────────────────┬──────────────────────────────────┘
                       │ calls
┌──────────────────────▼──────────────────────────────────┐
│  API LAYER                                               │
│  Next.js Route Handlers (/api/...), Server Actions       │
│  Input validation (Zod), Auth middleware, Policy checks  │
│  /src/app/api/                                           │
└──────────────────────┬──────────────────────────────────┘
                       │ calls
┌──────────────────────▼──────────────────────────────────┐
│  SERVICE LAYER                                           │
│  Domain services: transcript, search, story, export,     │
│  workspace, user, media, billing                         │
│  /src/services/                                          │
└──────────────────────┬──────────────────────────────────┘
                       │ dispatches jobs to
┌──────────────────────▼──────────────────────────────────┐
│  QUEUE LAYER                                             │
│  BullMQ queue definitions, job type registry,            │
│  job dispatch utilities, queue health monitoring         │
│  /src/workers/queues.ts                                  │
└──────────────────────┬──────────────────────────────────┘
                       │ consumed by
┌──────────────────────▼──────────────────────────────────┐
│  WORKER LAYER                                            │
│  Long-running background processors: transcript worker,  │
│  search index worker, subtitle worker, export worker,    │
│  comfyui worker                                          │
│  /src/workers/                                           │
└──────────────────────┬──────────────────────────────────┘
                       │ reads/writes
┌──────────────────────▼──────────────────────────────────┐
│  STORAGE LAYER                                           │
│  PostgreSQL (Prisma), Redis, File Storage (S3/local),    │
│  External APIs (OpenAI, Whisper, ComfyUI)                │
│  /src/lib/db.ts, /src/lib/storage/, /src/lib/redis.ts   │
└─────────────────────────────────────────────────────────┘
```

---

## III. SYNTHIA 3.0™ PATTERN: SERVICE BOUNDARIES, PROMPT REGISTRY, AND ORCHESTRATION

### Service Boundary Anatomy

Every domain service follows an identical structure:

```
/src/services/{domain}/
  index.ts         ← Public API. Only what callers need. Nothing else exported.
  engine.ts        ← Core business logic. No HTTP, no Prisma imports here.
  repository.ts    ← All Prisma queries for this domain. No business logic here.
  types.ts         ← Domain-specific TypeScript types and Zod schemas.
  errors.ts        ← Domain-specific error classes.
```

Service public APIs expose named async functions, not classes. Each function is independently testable.

### Prompt Registry Architecture

Location: `/src/lib/prompts/`

The prompt registry is a typed key-value store of AI prompt templates. No AI call in the system uses a hardcoded prompt string.

```
/src/lib/prompts/
  registry.ts              ← Master registry, exports getPrompt(key)
  types.ts                 ← PromptTemplate interface
  templates/
    story-builder.ts       ← Prompts for story/chapter extraction
    chapter-extractor.ts   ← Chapter boundary detection
    summary-generator.ts   ← Short-form summary generation
    title-suggester.ts     ← Video title generation
    keyword-extractor.ts   ← Finance keyword extraction
```

Prompt template interface:

```typescript
interface PromptTemplate {
  key: string;          // e.g., 'story.extract.finance'
  version: string;      // semver
  model: string;        // 'gpt-4o' | 'gpt-4o-mini'
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  userPromptTemplate: string;  // Handlebars-style {{variable}} substitution
  outputSchema: ZodSchema;     // Validated structured output
  tags: string[];       // For filtering and analytics
}
```

### Job Orchestration Architecture

Location: `/src/workers/`

```
/src/workers/
  queues.ts              ← Queue client, queue names enum, queue factory
  types.ts               ← JobPayload union type, JobStatus enum
  processor.ts           ← Worker process entry point, registers all processors
  jobs/
    transcript.ts        ← TranscriptJobPayload, processTranscript()
    search-index.ts      ← SearchIndexJobPayload, processSearchIndex()
    subtitle-export.ts   ← SubtitleExportJobPayload, processSubtitleExport()
    story-build.ts       ← StoryBuildJobPayload, processStoryBuild()
    comfyui-render.ts    ← ComfyUIRenderJobPayload, processComfyUIRender()
```

Queue naming convention: `{domain}:{operation}` — e.g., `transcript:process`, `search:index`, `export:subtitle`.

---

## IV. DATA FLOW

### Primary Flow: Video Upload to Searchable Content

```
1. USER UPLOADS VIDEO
   └─ POST /api/media/upload
   └─ Storage adapter saves to disk (dev) or S3 (prod)
   └─ MediaFile record created in PostgreSQL (status: PENDING)
   └─ TranscriptJob dispatched to BullMQ queue

2. TRANSCRIPT WORKER (background process)
   └─ Consumes TranscriptJob from queue
   └─ Calls Whisper API (or mock engine in dev)
   └─ Stores raw transcript in PostgreSQL (Transcript record)
   └─ Updates MediaFile status: TRANSCRIBED
   └─ Dispatches SearchIndexJob

3. SEARCH INDEX WORKER
   └─ Consumes SearchIndexJob
   └─ Tokenizes transcript text
   └─ Builds PostgreSQL full-text search vectors (tsvector columns)
   └─ Updates MediaFile status: INDEXED
   └─ Dispatches StoryBuildJob (if auto-story enabled)

4. STORY BUILD WORKER
   └─ Consumes StoryBuildJob
   └─ Retrieves transcript from database
   └─ Calls OpenAI via Prompt Registry (chapter-extractor prompt)
   └─ Stores story chapters in PostgreSQL (Chapter records)
   └─ Updates MediaFile status: STORY_READY
   └─ Notifies user via server-sent events or polling endpoint

5. USER REVIEWS & EXPORTS
   └─ User edits chapters, adds timestamps, adjusts subtitles
   └─ POST /api/export/subtitle → dispatches SubtitleExportJob
   └─ SubtitleExportWorker generates SRT/VTT/ASS files
   └─ Files stored in storage adapter
   └─ Download URL returned to user
```

### Search Flow

```
USER SEARCHES CONTENT
└─ GET /api/search?q={query}&workspaceId={id}
└─ Search service validates query, applies tenant scope
└─ PostgreSQL full-text search against tsvector columns
└─ Results ranked by ts_rank, filtered by workspace
└─ Results returned with context snippets
└─ (Future) pgvector semantic search layer added above full-text
```

---

## V. SECURITY LAYERS

Security is implemented as a layered defense. Each layer is independent and fails closed (deny by default).

### Layer 1: Input Validation
- All API route handler inputs are validated with Zod schemas before any business logic executes.
- Invalid inputs return 400 with structured field errors.
- File uploads are validated for MIME type, file size, and extension before storage.
- No raw file contents are executed or evaluated.

### Layer 2: Authentication Guards
- All `/api/` routes except `/api/auth/**` and `/api/health` require a valid NextAuth session.
- API key authentication is supported for programmatic access (stored as hashed values in PostgreSQL).
- Sessions are stored in Redis with configurable TTL.
- `withAuth` middleware wrapper enforces session presence at route level.

### Layer 3: Tenant Scoping
- Every authenticated request carries a `workspaceId` derived from the session, not from caller-supplied parameters.
- All database queries in the service layer include `WHERE workspace_id = $workspaceId`.
- The tenant scope is set once by middleware and propagated via request context.
- Cross-workspace data access is architecturally impossible through the service layer.

### Layer 4: Rate Limiting
- Per-workspace and per-user rate limits enforced via Redis sliding window counters.
- Upload endpoints: 10 uploads/hour per workspace.
- API endpoints: 1000 requests/hour per workspace, 100 requests/minute per user.
- AI endpoints: governed by credit/quota system stored in PostgreSQL.
- Rate limit headers returned on every response: `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

### Layer 5: Storage Safety
- Files are stored with random UUIDs as names, never user-supplied filenames.
- Served files go through a signed URL system (S3 pre-signed URLs in prod, local auth token in dev).
- No public bucket access. All storage access is mediated through the API.
- Content-Type headers are set server-side, never trusted from upload.
- Virus scanning hook is available in the upload pipeline (ClamAV in self-hosted deployments).

---

## VI. MULTI-TENANT DESIGN

The platform supports multiple independent workspaces (teams/organizations) on a single deployment.

### Data Model

```
User
  ├─ WorkspaceMembership (role: OWNER | ADMIN | EDITOR | VIEWER)
  │    └─ Workspace
  │         ├─ Project
  │         │    ├─ MediaFile
  │         │    │    ├─ Transcript
  │         │    │    ├─ Chapter[]
  │         │    │    ├─ Subtitle[]
  │         │    │    └─ ExportFile[]
  │         │    └─ SearchIndex
  │         ├─ WorkspaceSettings
  │         ├─ WorkspaceApiKey[]
  │         └─ WorkspaceQuota
```

### Tenant Isolation Rules
- Workspace data is isolated at the database query level (not just middleware).
- Workspace IDs are UUIDs, never sequential integers (prevents enumeration).
- Workspace creation is rate-limited per user.
- Workspace deletion is soft-deleted first, permanently purged after 30-day grace period.

### Role-Based Access Control

| Action | VIEWER | EDITOR | ADMIN | OWNER |
|---|---|---|---|---|
| View content | Yes | Yes | Yes | Yes |
| Upload media | No | Yes | Yes | Yes |
| Edit transcripts | No | Yes | Yes | Yes |
| Manage projects | No | Yes | Yes | Yes |
| Manage members | No | No | Yes | Yes |
| Billing / settings | No | No | No | Yes |
| Delete workspace | No | No | No | Yes |

---

## VII. WORKER SEPARATION

Each worker type runs as a separate BullMQ processor. In development, all run in a single process. In production, each can scale independently.

### Transcript Worker
- **Input:** `mediaFileId`, `workspaceId`, `audioPath`
- **Process:** Calls Whisper API → parses response → stores segments with timestamps
- **Output:** `Transcript` record, status update on `MediaFile`
- **Failure handling:** Retry up to 3 times with exponential backoff. After 3 failures, mark as `FAILED`, notify workspace.
- **Scaling note:** GPU-bound in self-hosted Whisper. Scale horizontally by adding worker instances.

### Search Index Worker
- **Input:** `mediaFileId`, `transcriptId`, `workspaceId`
- **Process:** Tokenizes text → calls PostgreSQL `to_tsvector()` → updates search index record
- **Output:** Searchable `tsvector` columns on `Transcript`, status update
- **Scaling note:** CPU-light, can run many instances.

### Subtitle Worker
- **Input:** `transcriptId`, `exportFormat` (SRT | VTT | ASS), `workspaceId`
- **Process:** Reads transcript segments → formats per subtitle spec → writes file to storage
- **Output:** `ExportFile` record with download URL
- **Scaling note:** CPU-light, fast. Can run many instances.

### Export Worker
- **Input:** `mediaFileId`, `exportConfig` (format, resolution, branding options)
- **Process:** Assembles export package → calls FFmpeg if video rendering required
- **Output:** `ExportFile` records, ZIP download URL
- **Scaling note:** CPU/disk intensive. Separate from other workers.

### ComfyUI Worker
- **Input:** `workspaceId`, `renderJobId`, `workflowId`, `inputs`
- **Process:** Calls ComfyUI API → polls for completion → retrieves rendered output → stores in storage
- **Output:** Rendered image/video asset, status update
- **Scaling note:** GPU-dependent. Stub implementation in MVP; real implementation in Sprint 3+.

---

## VIII. STORAGE ABSTRACTION

The storage layer is abstracted behind a uniform interface that swaps between local filesystem (development) and S3-compatible object storage (production) without changing calling code.

### Storage Adapter Interface

```typescript
interface StorageAdapter {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<StorageObject>;
  download(key: string): Promise<Buffer>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix: string): Promise<StorageObject[]>;
}
```

### Local Adapter (Development)
- Stores files in `/data/uploads/` relative to project root (Docker volume-mounted).
- Signed URLs are local API routes with short-lived tokens stored in Redis.
- No AWS credentials needed in development.

### S3 Adapter (Production)
- Compatible with AWS S3, MinIO (self-hosted), Cloudflare R2, and any S3-compatible provider.
- Configured via `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`.
- Pre-signed URLs generated via AWS SDK with configurable expiry.
- Bucket policy enforces private access (no public-read).

### Storage Key Schema

```
{workspaceId}/{projectId}/{mediaFileId}/{type}/{filename}

Examples:
  ws-abc123/proj-def456/media-ghi789/raw/original.mp4
  ws-abc123/proj-def456/media-ghi789/exports/subtitles.srt
  ws-abc123/proj-def456/media-ghi789/exports/thumbnail.jpg
```

---

## IX. CACHE STRATEGY

Redis serves three distinct caching roles. Each uses a separate key namespace to prevent collisions.

### Session Cache (`sess:`)
- NextAuth sessions stored as JSON in Redis.
- TTL: 7 days (rolling, refreshed on activity).
- Key: `sess:{sessionToken}`

### Job Queue State (`bull:`)
- BullMQ uses Redis internally for queue state, job payloads, and result storage.
- Do not write directly to `bull:` namespace. Use BullMQ API only.

### Search Cache (`sc:`)
- Frequently repeated search queries cached for 5 minutes.
- Key: `sc:{workspaceId}:{queryHash}`
- Evicted on new content indexed in the workspace.

### Rate Limit Counters (`rl:`)
- Sliding window counters for rate limiting.
- Key: `rl:{workspaceId}:{endpoint}:{windowStart}`
- TTL: window duration + 1 minute buffer.

---

## X. SCALING STRATEGY

The architecture is designed for three deployment tiers:

### Tier 1: Single VPS (MVP / Small Teams)
- One Docker Compose stack.
- Next.js app + BullMQ workers in same container or adjacent containers.
- PostgreSQL + Redis on same host.
- NGINX on host for SSL termination.
- Suitable for up to ~50 active users, ~200 videos/month.

### Tier 2: Separated Services (Growth)
- Web tier (Next.js) scales horizontally behind load balancer.
- Worker tier scales horizontally (stateless, Redis-backed).
- Managed PostgreSQL (RDS / Supabase / Neon).
- Managed Redis (Upstash / ElastiCache).
- S3-compatible object storage.
- Suitable for ~500 active users, ~2000 videos/month.

### Tier 3: Full Scale
- Kubernetes cluster with HPA for web and worker pods.
- Read replicas for PostgreSQL.
- Redis Cluster for queue and cache.
- CDN in front of storage for asset delivery.
- Dedicated GPU nodes for Whisper and ComfyUI workers.

### Statelessness Guarantee
The web tier is fully stateless. Session state lives in Redis. File state lives in storage. The only local state is temporary files during request handling, cleaned up before response.

---

## XI. MONITORING AND OBSERVABILITY

### Sentry Integration
- Client-side: Sentry browser SDK captures JS errors, unhandled promise rejections, performance.
- Server-side: Sentry Node SDK captures API errors, unhandled exceptions, slow transactions.
- Workers: Sentry captures job failures with full payload context.
- Alert rules: P0 alert on any unhandled server error. P1 alert on job failure rate > 5%.

### Structured Logging
All log output conforms to the SYNTHIA 3.0™ log schema (see PRIME_DIRECTIVE.md). Logs are written to stdout in production and collected by the container runtime or log aggregator (Loki, Datadog, CloudWatch, etc.).

### Health Endpoints

```
GET /api/health
Response: {
  status: 'healthy' | 'degraded' | 'unhealthy',
  timestamp: ISO-8601,
  services: {
    database: { status, latencyMs },
    redis: { status, latencyMs },
    storage: { status },
    queues: {
      transcript: { waiting, active, failed },
      search: { waiting, active, failed },
      export: { waiting, active, failed }
    }
  }
}
```

The health endpoint is unauthenticated and is polled by NGINX upstream health checks and external monitoring (UptimeRobot, etc.).

---

## XII. SERBIAN-FIRST LOCALIZATION ARCHITECTURE

Localization is not an afterthought. It is a first-class architectural concern.

### next-intl Configuration
- Default locale: `sr` (Serbian Latin script)
- Supported locales: `sr`, `en`
- Locale detection: Accept-Language header → user preference in session → default `sr`
- Routing: locale prefix in URL path (`/sr/dashboard`, `/en/dashboard`) — allows clean sharing

### Message File Structure

```
/messages/
  sr.json         ← Serbian (primary — always most complete)
  en.json         ← English (secondary — translated from Serbian)
```

All new UI strings are added to `sr.json` first, then translated to `en.json`. The reverse never happens.

### Finance/Trading Terminology
A custom terminology glossary is maintained at `/src/lib/i18n/terminology.ts`. It defines canonical Serbian translations for finance and trading terms used in the UI and in AI prompt templates. This prevents inconsistent translation of domain-specific vocabulary.

---

*Architecture version: 1.0.0*
*Last reviewed: 2026-03-22*
*Owner: Engineering — Cheggie Studios*
