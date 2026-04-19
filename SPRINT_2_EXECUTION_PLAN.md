# CHEGGIE STUDIOS SPRINT 2 — COMPLETE MVP EXECUTION PLAN

**Status:** Planning phase  
**Date:** 2026-03-24  
**Epic:** Complete all unfinished tasks, integrate MCPs, deploy to Vercel  
**Design Law Framework:** REUSE BEFORE CREATE, NON-DUPLICATION, ZERO-TOUCH, TRUTH RULES  

---

## PHASE 1: FOUNDATION & VALIDATION (TODAY)

### 1.1 Environment & Secrets Setup
- [ ] Load `E:\THE PAULI FILES\master.env` into secure vault
- [ ] Map secrets to Vercel project `prj_ynAWuq5XP3aEUkf21I8gi7Vu0btL`
- [ ] Generate NEXTAUTH_SECRET with OpenSSL
- [ ] Populate DATABASE_URL (managed PostgreSQL endpoint)
- [ ] Populate REDIS_URL (Upstash or managed)
- [ ] Populate STORAGE_ADAPTER secrets (S3/R2/MinIO)
- [ ] Populate all AI API keys (OpenAI, Anthropic, Google, Replicate)
- [ ] Validate Vercel env vars are encrypted at rest

### 1.2 Build Pipeline Validation
- [ ] Run `pnpm install` and validate all dependencies resolve
- [ ] Run `pnpm build` and capture all errors
- [ ] Run `pnpm type-check` for TypeScript validation
- [ ] Run `pnpm lint` and fix violations
- [ ] Document any build blockers in BUILD_NOTES.md

### 1.3 Design Law Audit
- [ ] Execute taste-skill audit on all UI components
- [ ] Execute pauli-Uncodixfy protocol scan on auth/storage logic
- [ ] Check for REUSE violations (duplicated implementations)
- [ ] Check for NON-DUPLICATION violations (auth, storage, queue, db)
- [ ] Verify ZERO-TOUCH readiness (job retry, health checks, error handling)
- [ ] Verify TRUTH rules (no scaffolding without function, no stubs > 1 sprint old)

---

## PHASE 2: COMPLETION OF UNFINISHED WORK (3-4 days)

### 2.1 Worker Job Processors — CRITICAL PATH

**Goal:** Implement real business logic in all 5 job processors

#### Processor: Transcript Processing (`src/workers/jobs/transcript.ts`)
- [ ] Receive TranscriptJobPayload
- [ ] Validate MediaFile exists and is in READY state
- [ ] Call OpenAI Whisper API (or mock engine if dev)
- [ ] Parse transcript response into segments (timecode + text)
- [ ] Bulk insert TranscriptSegments into DB
- [ ] Update Transcript status to READY
- [ ] Emit `transcript:ready` event (job completed event)
- [ ] Handle errors: set status to ERROR, store error message
- [ ] Test: Verify real Whisper call works in dev environment

#### Processor: Search Indexing (`src/workers/jobs/search-index.ts`)
- [ ] Receive SearchIndexJobPayload
- [ ] Retrieve all TranscriptSegments for a media file
- [ ] Build PostgreSQL tsvector from segments (Serbian language)
- [ ] Insert into SearchIndex table with workspace scope
- [ ] Update SearchIndex status to READY
- [ ] Emit `search:indexed` event
- [ ] Cache invalidation: clear Redis cache for this media file
- [ ] Test: Verify full-text search returns indexed content

#### Processor: Subtitle Export (`src/workers/jobs/subtitle-export.ts`)
- [ ] Receive SubtitleExportJobPayload  
- [ ] Retrieve TranscriptSegments and format specifications
- [ ] Generate SRT format (00:00:00,000 --> 00:00:05,000 structure)
- [ ] Generate VTT format (WEBVTT header + cues)
- [ ] Generate ASS format (Advanced SubStation Alpha)
- [ ] Store files via storage adapter (local or S3)
- [ ] Create ExportFile records in DB with proper storage paths
- [ ] Emit `export:complete` event with download URLs
- [ ] Test: Verify all 3 formats are valid and playable

#### Processor: Story Build (`src/workers/jobs/story-build.ts`)
- [ ] Receive StoryBuildJobPayload
- [ ] Retrieve full transcript text
- [ ] Call OpenAI with story-builder prompt (from registry)
- [ ] Parse response: chapter boundaries, chapter titles, narrative structure
- [ ] Bulk insert Chapter records with segment ranges
- [ ] Generate summary via summary-generator prompt
- [ ] Generate suggested title via title-suggester prompt
- [ ] Update Project status to READY
- [ ] Emit `story:complete` event
- [ ] Test: Verify chapters are correctly extracted from real video transcript

#### Processor: ComfyUI Render (Stub for Sprint 3)
- [ ] Document interface contract for ComfyUI webhook integration
- [ ] Mark as STUB with expected Sprint 3 completion date
- [ ] Create placeholder that returns "rendering scheduled" status

**DUE DATE:** End of day 2

---

### 2.2 API Route Completion

#### POST /api/projects/{projectId}/upload
- [ ] Validate file type (video/audio only)
- [ ] Check workspace storage quota
- [ ] Store file via storage adapter
- [ ] Create MediaFile record in DB (status = PENDING)
- [ ] Dispatch `transcript:process` job to BullMQ
- [ ] Return MediaFile + job ID to client
- [ ] Test: Verify upload creates job and JobID

#### GET /api/projects/{projectId}/transcript/{transcriptId}
- [ ] Return full Transcript with paginated segments
- [ ] Support filtering by segment time range
- [ ] Return cached if available
- [ ] Support real-time progress polling (check job status)

#### GET /api/search
- [ ] Accept query string and workspace ID
- [ ] Execute PostgreSQL tsvector query
- [ ] Return ranked results with relevance scores
- [ ] Cache results for 5 minutes
- [ ] Test: Verify Serbian search works (terminology from glossary)

#### POST /api/projects/{projectId}/export
- [ ] Accept format parameter (srt, vtt, ass)
- [ ] Dispatch `export:subtitle` job
- [ ] Return job ID + estimated completion time
- [ ] Provide polling endpoint for completion

#### GET /api/workers/health
- [ ] Return status of all queues (transcript, search, export, story, comfyui)
- [ ] Return queue depth, error count, success count
- [ ] Test: Verify Vercel can monitor worker health

---

### 2.3 Testing Infrastructure

#### E2E Tests (Playwright)
- [ ] Full flow: `upload → transcript → search → story → export`
- [ ] Auth flow: login, logout, OAuth Google
- [ ] Multi-workspace: create, invite, switch workspace
- [ ] Error states: upload oversized file, invalid format, quota exceeded
- [ ] Real-time: upload file, monitor job progress in UI

#### Unit Tests (Vitest)
- [ ] Service layer: transcript, search, story, export, workspace, user services
- [ ] Prompt registry: verify all prompts load correctly
- [ ] Storage adapter: unit tests against mock adapter
- [ ] Auth middleware: verify session validation, API key validation
- [ ] Error handling: verify ServiceError is thrown and caught correctly

**Coverage target:** 70% for all src/ files

---

## PHASE 3: MCP INTEGRATIONS (Days 3-4)

### 3.1 Supabase MCP Integration

**Goal:** Connect Cheggie Studios database operations through Supabase MCP for real-time sync and edge-function triggers.

- [ ] Import supabase-mcp from `https://github.com/supabase-community/supabase-mcp.git`
- [ ] Create `src/lib/mcp/supabase-client.ts` wrapper
- [ ] Wire Supabase project from master.env: `kbphngxqozmpfrbdzgca`
- [ ] Test connection: list tables, verify schema matches Prisma model
- [ ] Set up PostgreSQL LISTEN/NOTIFY on transcript completion events
- [ ] Create Supabase Edge Function for auto-indexing on transcript completion
- [ ] Implement real-time subscription to job status changes
- [ ] Test: Verify job completion triggers automatic search index update

### 3.2 Coolify Deployment Integration

**Goal:** Connect Cheggie Studios to Coolify for alternative container deployment option.

- [ ] Import Coolify API client using credentials from master.env
- [ ] Create `src/lib/coolify/client.ts` wrapper
- [ ] Map Vercel project ID to Coolify project ID (from master.env)
- [ ] Test OAuth deployment flow: generate new API token
- [ ] Create Coolify webhook for auto-deploy on main branch push
- [ ] Document deployment procedure: push → Coolify webhook → build → test → deploy
- [ ] Test: Deploy staging container to Coolify and verify health check

### 3.3 jcodemunch-mcp Integration

**Goal:** Use jcodemunch for AST-based codebase indexing to save tokens during code generation.

- [ ] Import jcodemunch-mcp from `https://github.com/jgravelle/jcodemunch-mcp.git`
- [ ] Set up jcodemunch server in development environment
- [ ] Create `src/lib/mcp/jcodemunch-client.ts` for token-efficient code search
- [ ] Replace semantic_search calls with jcodemunch queries for codebase exploration
- [ ] Document usage: "Use jcodemunch for finding functions/components instead of grep"
- [ ] Measure token savings before/after

### 3.4 Ralphy Integration (Auto-Stub Completion)

**Goal:** Use Ralphy to auto-complete remaining TODO comments and stubs during CI/CD.

- [ ] Add Ralphy to GitHub Actions workflow (zte-autodeploy.yml)
- [ ] Create Ralphy config: target stubs/TODOs in ts/tsx files
- [ ] Test Ralphy on known stubs:
  - [ ] `ComfyUI render job processor` (STUB marker)
  - [ ] Any incomplete service implementations
- [ ] Document Ralphy contract: what it can auto-complete, what needs review
- [ ] Set up branch protection: Ralphy PRs must pass E2E tests before merge

---

## PHASE 4: DESIGN LAW ENFORCEMENT (Day 4)

### 4.1 Taste-Skill UI Audit
- [ ] Run taste-skill on all React components in `src/components/`
- [ ] Verify no glassmorphism violations
- [ ] Verify no oversized border radii
- [ ] Verify no eyebrow labels
- [ ] Fix any violations: simplify, refine per design system
- [ ] Document audit results in ops/audits/taste-skill-[date].md

### 4.2 Pauli-Uncodixfy Protocol Scan
- [ ] Run pauli-Uncodixfy on auth, storage, database, queue implementations
- [ ] Verify single-instance rules enforced:
  - [ ] One auth implementation (NextAuth v5)
  - [ ] One storage adapter interface
  - [ ] One queue client singleton
  - [ ] One Prisma client instance
- [ ] Fix any violations found
- [ ] Document scan results

### 4.3 Code Quality Gates
- [ ] TypeScript strict mode: zero errors
- [ ] ESLint: zero errors
- [ ] Prettier: all files formatted
- [ ] No console.log() statements outside dev/debug code
- [ ] No hardcoded API URLs or secrets
- [ ] All env vars accessed via src/lib/env.ts

---

## PHASE 5: DEPLOYMENT & VERIFICATION (Day 5)

### 5.1 Vercel Staging Deployment
- [ ] Push feature branch to GitHub
- [ ] Verify GitHub Actions runs ZTE auto-deploy pipeline
- [ ] Confirm build passes all gates (build, test, audit)
- [ ] Staging URL is live: `https://cheggie-studios-staging.vercel.app`
- [ ] Verify all env vars populated correctly
- [ ] Health check endpoint returns green

### 5.2 End-to-End User Flow Testing
- [ ] User flow: Signup → Create workspace → Invite member → Upload video
- [ ] Video flow: Upload video → Transcript auto-generated → Search indexes → Results appear
- [ ] Story flow: View transcript → Extract chapters → Build story → Download story
- [ ] Export flow: Select subtitle format → Download SRT/VTT/ASS
- [ ] Error flow: Upload oversized file → Graceful error message
- [ ] Real-time flow: Upload file, see job progress in real-time

### 5.3 Performance & Monitoring
- [ ] Build time: < 60 seconds
- [ ] First Contentful Paint (FCP): < 3 seconds
- [ ] Largest Contentful Paint (LCP): < 6 seconds
- [ ] Cumulative Layout Shift (CLS): < 0.1
- [ ] Sentry: zero errors in staging
- [ ] Database queries: no N+1 queries detected

### 5.4 Security Verification
- [ ] All secrets encrypted at rest in Vercel
- [ ] Session tokens are httpOnly, secure, sameSite=strict
- [ ] API keys validated in middleware before service call
- [ ] File upload validation: file type, size, virus scan placeholder
- [ ] SQL injection test: parameterized queries only
- [ ] CSRF protection: token validation on POST/PUT/DELETE

---

## ADDITIONAL WORK ITEMS (Post-MVP, Sprint 3+)

### Real-Time Progress Tracking
- [ ] WebSocket connection for job progress updates
- [ ] Server-Sent Events (SSE) fallback
- [ ] UI progress bar component

### Transcript Editing & Versioning
- [ ] Backend versioning system for transcript changes
- [ ] Edit API endpoint: update segment text
- [ ] Version history: view/restore previous transcripts

### Vector Semantic Search (Sprint 3)
- [ ] pgvector extension setup in PostgreSQL
- [ ] Embedding generation: OpenAI embeddings API
- [ ] Semantic search alongside full-text search

### Kubernetes & Horizontal Scaling
- [ ] Helm chart for Cheggie Studios
- [ ] Worker replicas via Kubernetes deployment
- [ ] Load testing: 100 concurrent uploads

### Billing & Quotas
- [ ] Stripe integration for premium plans
- [ ] Quota enforcement: max videos, max minutes, max API calls
- [ ] Usage tracking: per-workspace metrics

---

## EXECUTION LOG

| Date | Phase | Status | Notes |
|------|-------|--------|-------|
| 2026-03-24 | 1.1 | Planning | Initial gap analysis complete |
| - | 1.2 | Pending | Build validation TBD |
| - | 1.3 | Pending | Design audit TBD |
| - | 2.1 | Pending | Job processor implementation TBD |
| - | 3.x | Pending | MCP integrations TBD |
| - | 4.x | Pending | Design law enforcement TBD |
| - | 5.x | Pending | Deployment TBD |

---

## DECISION POINTS & BLOCKERS

### Blocker 1: Managed Database Configuration
- **Issue:** Need to provision managed PostgreSQL endpoint (Vercel, Neon, Supabase, AWS RDS)
- **Decision Required:** Which provider? (Recommendation: Neon — best DX for Vercel)
- **Impact:** Cannot run E2E tests until DATABASE_URL is live

### Blocker 2: Redis Configuration
- **Issue:** Need to provision managed Redis or Upstash
- **Decision Required:** Which provider? (Recommendation: Upstash — serverless, same-region to Vercel)
- **Impact:** BullMQ queues cannot run until REDIS_URL is configured

### Blocker 3: Worker Deployment Strategy
- **Issue:** BullMQ workers cannot run on Vercel Functions (max 15 min execution)
- **Decision Required:** Deploy workers as:
  - A) Separate Coolify container (recommended)
  - B) AWS Lambda with scheduled trigger
  - C) Raspberry Pi cron job (dev only)
- **Impact:** Affects architecture of job dispatch and monitoring

### Blocker 4: Whisper API vs. Local
- **Issue:** OpenAI Whisper API costs ~$0.02 per minute of audio
- **Decision Required:** Keep OpenAI Whisper or implement local Whisper?
- **Impact:** Cost/quality trade-off for high-volume usage

---

## SUCCESS CRITERIA

### Build Quality
- ✅ Zero TypeScript errors (strict mode)
- ✅ Zero ESLint errors
- ✅ 70% test coverage
- ✅ Build time < 60 seconds
- ✅ Zero security vulnerabilities

### Feature Completeness
- ✅ All 5 job processors have real implementations
- ✅ All API endpoints respond with valid data
- ✅ End-to-end flow works: upload → transcript → search → export
- ✅ Error handling is consistent and user-friendly
- ✅ Real-time job progress visible in UI

### Performance
- ✅ FCP < 3 seconds
- ✅ LCP < 6 seconds
- ✅ File upload < 30 seconds (small video)
- ✅ Transcript processing < 5 minutes (for 30-minute video)
- ✅ Search results < 500ms

### Design Law Compliance
- ✅ Zero REUSE violations (all concerns implemented once)
- ✅ Zero NON-DUPLICATION violations (single auth, storage, queue, db)
- ✅ Zero TRUTH violations (no scaffolding without function)
- ✅ Zero ZERO-TOUCH violations (all jobs are retryable, stateless)
- ✅ Taste-skill audit passes
- ✅ Pauli-Uncodixfy protocol scan passes

### Deployment Readiness
- ✅ Staging deployment is live and healthy
- ✅ All Vercel env vars are encrypted and set
- ✅ Supabase MCP authenticated and operational
- ✅ Coolify webhook configured and tested
- ✅ Monitoring dashboard shows all systems green

---

**Plan Created:** 2026-03-24  
**Target Completion:** 2026-03-28 (5 calendar days, estimated 40-50 engineering hours)  
**Priority:** 🔴 CRITICAL (MVP blocker)  
