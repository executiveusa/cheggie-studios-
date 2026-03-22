# EMERALD TABLETS™ — BUILD NOTES

> This document captures engineering observations, decisions-in-practice, technical debt, and forward planning from the initial MVP build (Sprint 1). It is the honest record of what was built, what was skipped, what was learned, and what comes next.

---

## SPRINT 1: INITIAL MVP BUILD

**Sprint dates:** 2026-03-22 (initial commit)
**Goal:** Working end-to-end demo of the core video workflow platform — upload → transcript → search → story → export

---

## I. WHAT WAS REUSED

**Starting point: empty repository.**

Sprint 1 began from a completely empty repository. No prior Cheggie Studios code existed. Nothing could be reused from a previous version. All modules were created fresh.

The REUSE BEFORE CREATE law was applied at the level of external dependencies and patterns:
- Next.js 15 App Router patterns (reused community-established patterns for auth, layout, API routes)
- NextAuth v5 patterns (reused official docs patterns for credentials + OAuth setup)
- BullMQ patterns (reused established queue patterns for producer/consumer separation)
- Prisma patterns (reused schema conventions from Prisma documentation)
- shadcn/ui component patterns (referenced without installing the package — reused the pattern, not the dependency)

For Sprint 2+, the REUSE BEFORE CREATE law will apply to the growing internal codebase.

---

## II. WHAT WAS CREATED

### Core Application Structure
- `src/app/` — Next.js 15 App Router layout, pages, and API routes
  - Authentication pages: login, register, logout
  - Dashboard layout with workspace switcher
  - Media library with upload interface
  - Transcript viewer with editing capability
  - Search interface with workspace-scoped results
  - Story builder with chapter editor
  - Export interface (SRT, VTT, ASS formats)
  - Settings pages (workspace, user profile, API keys)

### Data Layer
- `prisma/schema.prisma` — Full schema covering: User, Workspace, WorkspaceMembership, Project, MediaFile, Transcript, TranscriptSegment, Chapter, Subtitle, ExportFile, SearchIndex, Job, WorkspaceApiKey, WorkspaceQuota
- `prisma/migrations/` — Initial migration from scratch
- `src/lib/db.ts` — Prisma client singleton with connection pooling config

### Authentication
- `src/auth.ts` — NextAuth v5 config: Credentials + Google OAuth providers
- `src/middleware.ts` — Route protection middleware, session forwarding
- `src/lib/auth/` — Session utilities, tenant context extraction, API key validation

### Storage Abstraction
- `src/lib/storage/interface.ts` — StorageAdapter interface
- `src/lib/storage/local.ts` — LocalStorageAdapter for development
- `src/lib/storage/s3.ts` — S3StorageAdapter for production
- `src/lib/storage/index.ts` — Adapter factory, selected by STORAGE_DRIVER env var

### Service Layer (SYNTHIA 3.0™ boundaries)
- `src/services/transcript/` — Transcript service: dispatch, retrieve, update
- `src/services/search/` — Search service: index, query, cache invalidation
- `src/services/story/` — Story service: chapter extraction, chapter CRUD
- `src/services/media/` — Media service: upload, validate, status management
- `src/services/export/` — Export service: subtitle format generation, file assembly
- `src/services/workspace/` — Workspace service: create, invite, membership management
- `src/services/user/` — User service: profile, password change, API key management

### Prompt Registry
- `src/lib/prompts/registry.ts` — Central prompt store
- `src/lib/prompts/templates/chapter-extractor.ts` — Chapter boundary detection prompt
- `src/lib/prompts/templates/story-builder.ts` — Narrative structure extraction prompt
- `src/lib/prompts/templates/summary-generator.ts` — Short-form summary prompt
- `src/lib/prompts/templates/title-suggester.ts` — Video title suggestion prompt

### Queue and Worker System
- `src/workers/queues.ts` — Queue client, named queue registry
- `src/workers/types.ts` — TypeScript types for all job payloads
- `src/workers/processor.ts` — Worker process entry point
- `src/workers/jobs/transcript.ts` — Transcript job processor
- `src/workers/jobs/search-index.ts` — Search indexing job processor
- `src/workers/jobs/subtitle-export.ts` — Subtitle export job processor
- `src/workers/jobs/story-build.ts` — Story building job processor
- `src/workers/jobs/comfyui-render.ts` — ComfyUI render job processor (STUB)

### Infrastructure/Ops
- `Dockerfile` — Multi-stage build: deps → builder → runner
- `docker-compose.yml` — Development stack: app + postgres + redis + worker
- `docker-compose.prod.yml` — Production stack with health checks and volume mounts
- `nginx/nginx.conf` — Reverse proxy config with SSL, gzip, upload size limits
- `nginx/ssl/` — SSL certificate placeholder (replaced by real certs in deployment)

### Localization
- `messages/sr.json` — Serbian (Latin) translations — primary locale, all keys present
- `messages/en.json` — English translations — all keys present
- `src/lib/i18n/terminology.ts` — Finance/trading terminology glossary (Serbian ↔ English)

---

## III. WHAT DUPLICATION WAS AVOIDED

Sprint 1 maintained these zero-duplication guarantees:

**Single auth implementation:** One NextAuth config at `src/auth.ts`. All auth checks flow through the middleware and the `auth()` function from this single config. No secondary auth logic in individual route handlers.

**Single storage adapter:** All file operations go through `src/lib/storage/index.ts`. No direct `fs` calls in business logic. No direct `aws-sdk` calls outside the S3 adapter. This was enforced by ESLint rule during the build.

**Single queue client:** `src/workers/queues.ts` is the only file that creates BullMQ Queue instances. All job dispatch calls import from this file. Workers import processors, not queue clients.

**Single Prisma client:** `src/lib/db.ts` exports the singleton Prisma client. No other file instantiates `new PrismaClient()`.

**Single environment access point:** `src/lib/env.ts` validates and exports all environment variables. Direct `process.env` access outside this file is flagged by ESLint.

**Single error boundary pattern:** API routes use a shared `withErrorHandler` wrapper. Services use a shared `ServiceError` class hierarchy. No ad-hoc error formatting in individual handlers.

**Single tenant scope source:** `workspaceId` is extracted from the authenticated session in middleware, stored in request context, and read by services from context. No route handler passes `workspaceId` from query params directly to service calls.

---

## IV. WHAT SHOULD BE EXTRACTED INTO SYNTHIA 3.0™ LATER

These concerns are currently implemented inline or partially — they should be extracted into reusable, policy-driven components in a future sprint:

### Prompt Registry (Sprint 2)
Currently: prompts are centrally stored and retrieved, but there is no versioning system, no A/B testing capability, and no analytics on prompt performance. Extract to a full `PromptRegistry` service with: versioned storage, fallback resolution, usage tracking, and hot-reload in development.

### Job Orchestration Service (Sprint 2)
Currently: job dispatch is done by calling BullMQ directly from service functions. Should be extracted to a `JobOrchestrator` service with: typed dispatch, dependency chains (job A triggers job B on completion), timeout enforcement, and a unified job status API.

### Storage Adapter as Injected Dependency (Sprint 2)
Currently: the storage adapter is selected at module load time via env var. Should be injectable for better testability (pass a mock adapter in tests rather than setting env vars).

### Tenant Scoping Middleware (Sprint 2)
Currently: tenant scoping is applied consistently but not through a unified middleware that runs before every service call. Formalize as a `withTenantScope(serviceCall)` wrapper that guarantees no service call can run without a validated workspace context.

### Telemetry Service (Sprint 2)
Currently: Sentry is called directly in error handlers and workers. Should be extracted to a `TelemetryService` that abstracts Sentry, adds correlation IDs, and can swap backends (Sentry → Axiom, etc.) without changing calling code.

### MCP Interface (Sprint 3)
Currently: not implemented. Plan: expose all service operations as MCP tools, enabling AI agents (Claude, GPT-4) to orchestrate the platform programmatically. This unlocks automated content processing pipelines and AI-agent-driven workflows.

### CLI Interface (Sprint 3)
Currently: basic CLI scaffolded at `src/cli/` but most commands are stubs. Complete CLI coverage for: job dispatch, queue inspection, transcript reprocessing, workspace management, storage cleanup.

---

## V. PERFORMANCE IMPROVEMENTS NEEDED

### Search Indexing (Priority: High, Sprint 2)
Current state: PostgreSQL full-text search with `simple` dictionary. Works for Sprint 1 scale.
Required improvement: Add `pg_trgm` trigram index for partial-match search. Improves search on partial words (common in typing-ahead scenarios).
Future improvement: pgvector semantic search for "find videos about X topic" queries. Required before scaling to workspaces with 100+ videos.

### Worker Scaling (Priority: Medium, Sprint 2)
Current state: single worker process, all job types processed sequentially per type.
Required improvement: separate worker processes per job type in production Docker Compose. Transcript workers are the bottleneck — they need higher concurrency limits.

### CDN for Assets (Priority: Medium, Sprint 3)
Current state: all file downloads go through the Next.js API (signed URL route).
Required improvement: generate real S3 pre-signed URLs that bypass the app server. Add CDN (CloudFront, Cloudflare) in front of S3 bucket for exported files (subtitles, thumbnails).

### Database Connection Pooling (Priority: Medium, Sprint 2)
Current state: Prisma default connection pool. Fine for development.
Required improvement: PgBouncer in production for connection pooling, especially as worker instances scale.

### N+1 Query Audit (Priority: Medium, Sprint 2)
Current state: major N+1 queries identified and fixed (media list with transcript status, workspace member list). Minor N+1 queries may exist in less-used paths.
Required improvement: enable Prisma query logging in staging and run through all major UI flows to identify remaining N+1 patterns.

---

## VI. SECURITY IMPROVEMENTS NEEDED

### Two-Factor Authentication (Sprint 2)
Current state: username + password only. TOTP not implemented.
Required: TOTP 2FA as optional for users, enforceable by workspace admins. Use `otplib` library. QR code enrollment flow.

### Audit Logging (Sprint 2)
Current state: no audit log. Who did what, when, is not recorded.
Required: `AuditLog` table in PostgreSQL. Log: auth events (login, logout, failed login), workspace events (member added/removed, settings changed), content events (file deleted, export downloaded). Queryable by workspace admins.

### Rate Limiting Per User (Sprint 2)
Current state: rate limiting is per-workspace. A single user inside a workspace can exhaust the workspace quota.
Required: add per-user rate limiting layer inside the per-workspace limit. Protect against a single bad actor in a team environment.

### File Type Scanning (Sprint 3)
Current state: MIME type and extension validation on upload. No content scanning.
Required: ClamAV integration hook in the upload pipeline for self-hosted deployments. Configurable (can be disabled for trusted internal deployments). File is quarantined if scan fails — not served to users.

### Content Security Policy (Sprint 2)
Current state: basic security headers via NGINX config. No CSP header.
Required: CSP header configured in `next.config.ts` with appropriate directives for video playback, external resources (Google OAuth), and Sentry reporting endpoint.

---

## VII. PRODUCT INSIGHTS FROM BUILD

**Finance/trading creators need speed above all.**
Every time a user has to wait, they lose trust in the tool. The most critical UX improvement after the MVP is: real-time job progress streaming (WebSocket or SSE) so users see their transcript appearing word by word, not just a spinner for 3 minutes. For traders, time is extremely high-value — they will abandon a tool that makes them wait without feedback.

**Serbian copy must feel native, not translated.**
During the initial copy pass, several phrases were initially written in English and translated. These felt wrong immediately — the word order, formality level, and finance-domain vocabulary were off. The correct process: write in Serbian first with a native speaker, then translate to English. Never the reverse. This is especially important for error messages and empty states — these are moments of friction, and friction in a foreign language breaks trust.

**Empty states matter enormously for onboarding.**
The initial prototype had generic empty states ("No videos found" / "Nema videa"). User testing feedback was immediate: new users didn't know what to do next. Empty states must be instructional: "Upload your first video to get started — we'll transcribe it and make it searchable" with a direct action button. Every empty state is an onboarding opportunity.

**The workspace concept needs more explanation at first login.**
Users who sign up don't immediately understand the workspace → project → media hierarchy. The onboarding wizard (Sprint 2) needs to walk them through creating their first workspace and project with a real video upload, not just show them an empty dashboard.

**Export quality is a differentiator.**
Finance creators are meticulous about their brand. The subtitle export quality (timing accuracy, formatting, line length) matters as much as the transcription accuracy. Prioritize subtitle timing refinement and a preview-before-download export flow.

---

## VIII. KNOWN TECHNICAL DEBT

| ID | Debt | Severity | Location | Target Sprint |
|---|---|---|---|---|
| TD-001 | Mock transcript engine must be replaced with real Whisper integration | HIGH | `src/workers/jobs/transcript.ts` | Sprint 2 |
| TD-002 | Search needs pgvector upgrade for semantic queries | MEDIUM | `src/services/search/` | Sprint 3 |
| TD-003 | ComfyUI worker is a stub — no real API calls | MEDIUM | `src/workers/jobs/comfyui-render.ts` | Sprint 3 |
| TD-004 | CLI commands mostly stubbed | LOW | `src/cli/` | Sprint 3 |
| TD-005 | No 2FA implementation | MEDIUM | `src/auth.ts` | Sprint 2 |
| TD-006 | No audit log | MEDIUM | New: `src/services/audit/` | Sprint 2 |
| TD-007 | TOTP/MFA not implemented | MEDIUM | `src/auth.ts` | Sprint 2 |
| TD-008 | No CSP header | MEDIUM | `next.config.ts` | Sprint 2 |
| TD-009 | Per-user rate limiting missing (workspace-only) | MEDIUM | `src/middleware.ts` | Sprint 2 |
| TD-010 | MCP interface not implemented | LOW | New: `src/mcp/` | Sprint 3 |
| TD-011 | No file content scanning (ClamAV stub only) | LOW | `src/lib/storage/` | Sprint 3 |
| TD-012 | Telemetry service not extracted (direct Sentry calls) | LOW | Throughout codebase | Sprint 2 |
| TD-013 | Worker processes not separated in Docker Compose (all in one) | MEDIUM | `docker-compose.prod.yml` | Sprint 2 |
| TD-014 | No PgBouncer for production connection pooling | MEDIUM | `docker-compose.prod.yml` | Sprint 2 |

---

## IX. NEXT SPRINT PRIORITIES

### Sprint 2 Focus: "Production Readiness + Real Engines"

**P0 — Blockers for real users:**
1. **Real Whisper integration** — Replace mock transcript engine with `whisper-1` API calls. Include Serbian language hints, timestamp extraction, confidence scoring. Add fallback to mock if API unavailable.
2. **Onboarding wizard** — First-login flow that creates workspace, guides first upload, and explains the transcript → search → story workflow. Reduces time-to-value from "confused" to "got it."

**P1 — Security and compliance:**
3. **2FA / TOTP** — Optional for users, enforceable by workspace admins. Required before any enterprise/team onboarding.
4. **Audit logging** — `AuditLog` table and service. Log all auth and content events. Viewable by workspace admins.
5. **CSP header + security audit** — Systematic review of security headers, CSP policy, cookie flags.

**P2 — Architecture extraction:**
6. **Job Orchestrator service** — Extract job dispatch to unified orchestrator with dependency chains and status API.
7. **Telemetry service** — Extract Sentry calls to unified telemetry abstraction.
8. **Worker process separation** — Separate transcript, search, and export workers in production Docker Compose with independent concurrency limits.

**P3 — Growth features:**
9. **Team collaboration** — Real-time cursors on transcript editor (Liveblocks or Yjs). Comment threads on chapters.
10. **Billing / Stripe integration** — Workspace subscription tiers, credit system for AI API usage, payment management portal.

### Sprint 3 Focus: "Advanced AI + Scale"

- Real Whisper self-hosted option (air-gapped deployments)
- pgvector semantic search layer
- ComfyUI real integration (GPU worker, workflow management)
- MCP interface for AI agent orchestration
- Kubernetes Helm chart for Tier 2+ deployments
- CDN integration for asset delivery
- Advanced analytics (usage by workspace, popular search queries, export metrics)

---

*Build notes version: 1.0.0*
*Sprint 1 completed: 2026-03-22*
*Engineer: Cheggie Studios Engineering*
