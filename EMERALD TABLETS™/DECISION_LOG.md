# EMERALD TABLETS™ — DECISION LOG

> This log records every significant architectural and engineering decision made during the Cheggie Studios build. Each entry captures context, the decision made, why it was made, what was traded off, and its current status.
>
> Format: Date, decision ID, title, context, decision, rationale, trade-offs, status.
>
> Status options: ACCEPTED | SUPERSEDED | REVERSED | UNDER REVIEW

---

## [DATE: 2026-03-22] [DECISION-001] Tech Stack Selection

**Context:** Empty repository. Need to choose a full-stack technology set for a self-hostable, multi-tenant AI video workflow platform with Serbian-first UX requirements. The platform needs server-side rendering, API routes, background job processing, database persistence, file storage, and real-time feedback on job progress.

**Decision:** Next.js 15 App Router + TypeScript 5 (strict mode) + Prisma 5 + PostgreSQL 16 + Redis 7 + BullMQ 5 + NextAuth v5 + Tailwind CSS v4 + shadcn/ui component patterns + next-intl 3 for localization.

**Rationale:**
- Next.js 15 App Router provides server components, streaming, and full-stack capability in a single framework — reducing infrastructure complexity for the MVP.
- TypeScript strict mode is non-negotiable for a maintainable codebase at this scope.
- Prisma provides schema-first database access with automatic migrations and full TypeScript type generation.
- PostgreSQL is the most capable self-hostable relational database: supports JSONB, full-text search (tsvector), and pgvector for future vector search.
- Redis + BullMQ is the industry standard for background job processing in Node.js — reliable, observable, and easy to scale.
- NextAuth v5 is the only auth library with first-class Next.js App Router support and built-in providers.
- Tailwind v4 + shadcn patterns provide a composable, accessible UI foundation that can be customized for the Cheggie dark theme.
- next-intl is the most complete i18n library for Next.js App Router.

**Trade-offs:**
- NextAuth v5 is still in beta. Some APIs may change before stable release. Accepted because no better alternative exists for App Router.
- Tailwind v4 introduces breaking changes from v3. Some community resources still reference v3 syntax. Accepted because v4 design token system is significantly better.
- Monolith architecture limits future service extraction but dramatically simplifies the MVP build and deployment.

**Status:** ACCEPTED

---

## [DATE: 2026-03-22] [DECISION-002] Single App vs. Monorepo

**Context:** Many SaaS platforms start with a Turborepo or Nx monorepo to separate frontend, API, and workers into independent packages. This provides future flexibility but adds significant upfront complexity.

**Decision:** Single Next.js application with workers as a co-located process. No monorepo tooling in Sprint 1. Monorepo migration is deferred to when a second deployable service is genuinely required.

**Rationale:**
- Monorepo tooling (Turborepo, Nx, pnpm workspaces) adds meaningful developer overhead: workspace linking, build orchestration, shared package management.
- For an MVP with one deployable target, this overhead provides no benefit.
- Workers (BullMQ) are a background process, not a separate HTTP service. They share the same codebase and types with the web app naturally.
- When/if a dedicated worker service or a mobile app is needed, migration to monorepo is straightforward.
- Single repo means single `package.json`, single `tsconfig.json`, single `Dockerfile` — easier to onboard, deploy, and debug.

**Trade-offs:**
- Workers cannot be deployed independently without extracting them. This is fine for MVP; revisit at Tier 2 scaling.
- Shared types between web and workers are in the same codebase rather than a shared package. Risk of tight coupling — mitigated by SYNTHIA 3.0™ boundary rules.

**Status:** ACCEPTED

---

## [DATE: 2026-03-22] [DECISION-003] Authentication Approach

**Context:** Need user authentication supporting: email/password credentials (primary for self-hosted), OAuth for convenience (Google, GitHub), session management, API key auth for programmatic access, and multi-workspace membership with role-based access.

**Decision:** NextAuth v5 with Credentials provider (email + bcrypt-hashed password) as primary. Google OAuth as secondary. Sessions stored in Redis via custom adapter. API keys stored as bcrypt-hashed values in PostgreSQL, validated in a separate middleware path.

**Rationale:**
- NextAuth v5 is the only production-ready solution with App Router native support (auth.ts, `auth()` function, middleware integration).
- Credentials provider covers the self-hosted use case where OAuth isn't desired.
- Google OAuth covers the SaaS use case where users want one-click signup.
- Redis session storage means sessions survive app restarts and scale across multiple web instances.
- API keys follow the same auth middleware path — no separate auth system.

**Trade-offs:**
- NextAuth v5 beta status means some breaking changes may arrive. Accepted — pinning to a specific beta version and tracking release notes.
- Credentials auth requires bcrypt on every login. Acceptable latency for a B2B app with low-frequency login events.
- Not implementing JWT sessions — JWT is stateless but makes token revocation hard. Redis sessions allow instant revocation.

**Status:** ACCEPTED

---

## [DATE: 2026-03-22] [DECISION-004] Storage Abstraction Strategy

**Context:** Development needs to run without AWS credentials or internet access. Production needs durable, scalable object storage with signed URL access. The implementation must not differ between environments except for configuration.

**Decision:** Storage abstraction layer with two adapters behind a shared `StorageAdapter` interface: `LocalStorageAdapter` (dev, stores to `/data/uploads/`) and `S3StorageAdapter` (prod, AWS S3 / MinIO / R2 compatible). Adapter selected at runtime via `STORAGE_DRIVER` environment variable. All file operations go through the adapter interface — no direct `fs` or `aws-sdk` calls in business logic.

**Rationale:**
- Adapter pattern allows fully local development with zero external dependencies.
- S3 compatibility (not just AWS S3) means self-hosted operators can use MinIO or Cloudflare R2 without changing code.
- Single interface prevents storage-specific logic from leaking into services or workers.
- Dev adapter uses Redis-backed signed tokens (not real pre-signed URLs) to maintain security parity.

**Trade-offs:**
- Slightly more abstraction than a simple direct S3 integration. Worth it for the local dev and self-hostable-operator benefits.
- MinIO / R2 compatibility requires testing against each target — planned for Sprint 2.

**Status:** ACCEPTED

---

## [DATE: 2026-03-22] [DECISION-005] AI Transcript Approach

**Context:** The core feature of the platform is high-quality transcription of Serbian finance/trading video content. The transcript engine drives: search indexing, subtitle generation, chapter extraction, and story building. We need a solution that works in demo mode (no API keys) and production mode (real AI).

**Decision:** Three-tier transcript engine strategy:
1. **Mock engine** (`NODE_ENV=development`, no API key): Returns deterministic fake transcript data for development and demo purposes. Simulates realistic timing and content.
2. **OpenAI Whisper API** (production primary): `whisper-1` model via OpenAI API. Best quality for Serbian language content.
3. **Local Whisper** (self-hosted option, Sprint 3+): Stub interface for future local Whisper deployment. Allows air-gapped self-hosting.

The active engine is selected via `TRANSCRIPT_ENGINE` environment variable. The service layer is unaware of which engine is active.

**Rationale:**
- Demo-ability without API keys is critical for early investor and user demos.
- Whisper is the best available model for Serbian speech recognition.
- The stub interface for local Whisper future-proofs the architecture for operators who cannot send audio to OpenAI.
- Engine selection at environment level means no code changes to switch engines.

**Trade-offs:**
- Mock engine produces fake data that doesn't match real video content. Engineers and testers must be aware of this.
- Production guard prevents mock engine from activating in `NODE_ENV=production` — this is enforced in code.
- Local Whisper stub is incomplete in Sprint 1. Tracked in BUILD_NOTES.

**Status:** ACCEPTED

---

## [DATE: 2026-03-22] [DECISION-006] Search Architecture

**Context:** Users need to search across all transcribed video content within their workspace. The search experience must be fast (< 300ms), relevant (finance/trading terminology weighted), and accurate (Serbian language tokenization). Vector semantic search would provide the best relevance but adds operational complexity.

**Decision:** PostgreSQL full-text search (tsvector/tsquery) as the initial implementation. `simple` dictionary for tokenization (handles Serbian without stemming issues). Search results cached in Redis for 5 minutes per workspace+query combination. pgvector semantic search deferred to Sprint 3 as an enhancement layer.

**Rationale:**
- PostgreSQL full-text search is production-ready, requires no additional infrastructure, and handles the expected data scale easily.
- `simple` dictionary avoids Serbian stemming problems with the default English dictionaries.
- Redis caching means repeated searches (common in a session) are near-instant.
- pgvector would improve semantic search ("show me videos about market crashes") but adds: a vector database or PostgreSQL extension, embedding generation costs, and embedding storage at scale. Not justified for MVP.

**Trade-offs:**
- Full-text search has weaker semantic understanding than vector search. Users searching with synonyms may miss relevant content.
- `simple` dictionary means no stop-word removal or stemming — slightly lower precision than language-specific tokenization. Acceptable for MVP.
- Migration from full-text to vector search requires re-indexing all content. Plan: add pgvector as an additional index, not a replacement, in Sprint 3.

**Status:** ACCEPTED

---

## [DATE: 2026-03-22] [DECISION-007] Job Queue Architecture

**Context:** All heavy processing (transcription, search indexing, subtitle generation, ComfyUI rendering) must be non-blocking, retryable, observable, and scalable. The queue system is the backbone of the platform's async processing capability.

**Decision:** BullMQ 5 backed by Redis 7. Separate named queues per job type: `transcript:process`, `search:index`, `subtitle:export`, `story:build`, `comfyui:render`. Central queue client singleton in `src/workers/queues.ts`. Typed job payloads per queue. Worker processors registered at startup. Bull Board admin UI available in development.

**Rationale:**
- BullMQ is the most feature-complete, production-proven job queue for Node.js.
- Redis backing means queue state survives application restarts.
- Named queues enable per-queue concurrency tuning and independent worker scaling.
- Typed payloads (TypeScript) prevent payload schema drift between dispatchers and consumers.
- Bull Board provides visual queue inspection in dev/staging without custom tooling.

**Trade-offs:**
- Requires Redis as infrastructure dependency. Accepted — Redis is already required for session storage.
- BullMQ v5 has some breaking changes from v4. Documentation is still catching up. Accepted.
- Not using database-backed queues (e.g., Inngest, Trigger.dev) — they would reduce infrastructure requirements but add external service dependencies. Self-hostable requirement favors BullMQ.

**Status:** ACCEPTED

---

## [DATE: 2026-03-22] [DECISION-008] Design System and Visual Direction

**Context:** The platform targets Serbian finance and trading professionals who expect a premium, professional tool — not a consumer app. The design must convey trust, precision, and efficiency. It must support dark mode as the primary interface (traders spend long hours in front of screens).

**Decision:** Tailwind CSS v4 as the styling foundation. Custom dark theme as default (light theme as optional, not primary). shadcn/ui component patterns adapted with custom design tokens — not installed as an npm package but used as a reference pattern for component architecture. Monospace accents for data/numbers (trading context). Custom color palette: deep navy backgrounds, emerald green accents, precise neutral grays.

**Rationale:**
- Tailwind v4's design token system (CSS variables + `@theme`) enables the custom color palette without fighting the framework.
- Dark-first design matches the finance/trading creator's work environment and tool expectations.
- shadcn/ui patterns (Radix UI primitives + Tailwind) provide accessible, composable components without framework lock-in.
- Custom implementation (not shadcn/ui as npm package) gives full control over styling and avoids upgrade coupling.
- Emerald green accents are a deliberate reference to the EMERALD TABLETS™ doctrine naming.

**Trade-offs:**
- Tailwind v4 has fewer community examples than v3. Some copy-paste from online resources won't work directly.
- Custom component implementation (vs. shadcn/ui package) means more upfront work but better long-term control.
- Dark-first increases testing surface slightly (must verify light mode doesn't break).

**Status:** ACCEPTED

---

## [DATE: 2026-03-22] [DECISION-009] Localization Approach

**Context:** Serbian-first is a core platform requirement. The default user experience must be in Serbian Latin script, with English as a secondary locale. Localization must be type-safe (prevent missing keys), maintainable (translation files not scattered), and compatible with Next.js App Router routing.

**Decision:** next-intl 3.x with App Router integration. Default locale: `sr` (Serbian Latin). Secondary locale: `en`. Message files in `/messages/sr.json` and `/messages/en.json`. Locale-prefixed routing (`/sr/...`, `/en/...`) with redirect from root based on Accept-Language header. Custom Serbian financial terminology glossary at `/src/lib/i18n/terminology.ts`.

**Rationale:**
- next-intl is the best-maintained, most feature-complete i18n library for Next.js App Router.
- Type-safe message keys (via TypeScript declaration merging) prevent typos and missing translations from reaching production.
- Locale-prefixed routing enables clean URL sharing and proper SEO for both locales.
- Separate terminology glossary enforces consistent translation of finance/trading terms across UI copy and AI prompts.
- Serbian Latin (not Cyrillic) is the standard for web/digital content targeting Serbian tech-savvy users.

**Trade-offs:**
- next-intl adds bundle size and configuration overhead vs. a simple key-value i18n system. Justified by type safety and App Router integration quality.
- Locale-prefixed routing requires handling redirects carefully. Covered by next-intl middleware.
- Maintaining parallel translation files creates a maintenance burden. Mitigated: Serbian is the source of truth, English is derived.

**Status:** ACCEPTED

---

## [DATE: 2026-03-22] [DECISION-010] Demo Data Strategy

**Context:** In Sprint 1, the real AI engines (Whisper, OpenAI) may not be configured, and the ComfyUI integration is a stub. The platform must be fully demo-able end-to-end without real API keys or GPU infrastructure.

**Decision:** Deterministic mock data strategy for all incomplete engine integrations:
- Transcript engine mock: returns a realistic Serbian finance transcript with proper timestamps.
- Story builder mock: returns plausible chapters derived from the mock transcript.
- Search mock: returns pre-seeded search results when the search index is empty.
- ComfyUI mock: returns a placeholder rendered image.

All mocks are activated by `NODE_ENV=development` or explicit `MOCK_*=true` environment variables. Mocks are disabled in `NODE_ENV=production` — this is enforced by a build-time check. Mock data is deterministic (same input → same output) to allow reliable testing against known values.

**Rationale:**
- Deterministic mocks enable fully reproducible demos without external API dependencies.
- Same mocks work for automated tests — predictable inputs and outputs.
- Enforced production disabling prevents accidental demo data in production.
- Mock data that looks realistic (actual Serbian text, realistic timestamps) makes demos more convincing than generic placeholder text.

**Trade-offs:**
- Engineers must remember to test with real APIs before shipping engine integrations. Tracked as a test requirement in BUILD_NOTES.
- Mock data may mask edge cases in the real engine. Mitigated by integration tests that use real APIs in CI (with secrets).

**Status:** ACCEPTED

---

## [DATE: 2026-03-22] [DECISION-011] SYNTHIA 3.0™ Scope in Sprint 1

**Context:** The full SYNTHIA 3.0™ harness (prompt registry, MCP/CLI interface, full job orchestration, telemetry service, policy framework) represents significant architectural investment. Sprint 1 focus is a working MVP, not a complete framework.

**Decision:** SYNTHIA 3.0™ foundation is laid in Sprint 1, but not fully realized:
- Service boundary pattern: IMPLEMENTED (all domains have service modules)
- Prompt registry: IMPLEMENTED (basic version, templates for transcript and story)
- Job orchestration: IMPLEMENTED (BullMQ queues and workers)
- CLI interface: STUB (commands scaffolded, not all implemented)
- MCP interface: DEFERRED (Sprint 3+)
- Policy framework: PARTIAL (auth middleware in place, full RBAC in Sprint 2)
- Telemetry service: PARTIAL (Sentry initialized, structured logging, no unified telemetry service yet)

Sprint 2 will complete the policy framework and unified telemetry service. Sprint 3 will implement the MCP interface.

**Rationale:**
- Attempting full SYNTHIA 3.0™ implementation in Sprint 1 risks scope creep and delays shipping.
- The foundation (service boundaries, prompt registry, queues) is the most critical pattern — getting that right enables the rest.
- Partial implementation is acceptable if stubs are clearly marked and tracked.

**Trade-offs:**
- CLI commands are not all functional in Sprint 1. Documented in BUILD_NOTES.
- Some service calls don't yet go through a unified policy layer. Risk: auth gaps in less-used routes. Mitigated by auth middleware on all `/api/` routes.

**Status:** ACCEPTED

---

## [DATE: 2026-03-22] [DECISION-012] ComfyUI Integration Strategy

**Context:** ComfyUI is a planned integration for AI image/video generation (thumbnails, intros, brand assets). It requires GPU infrastructure and a running ComfyUI server. This is not available in the Sprint 1 environment. However, the architecture must accommodate it.

**Decision:** ComfyUI worker is implemented as a stub interface in Sprint 1:
- `ComfyUIService` exists with a defined public API.
- `comfyui:render` BullMQ queue is defined and registered.
- Worker processor is registered but calls a mock that returns a placeholder asset.
- UI allows users to trigger ComfyUI-style render requests, showing them in a "coming soon" state.
- Real ComfyUI HTTP client (`/src/lib/comfyui/client.ts`) is scaffolded with `// STUB: [Sprint 3] Real ComfyUI API calls`.

**Rationale:**
- Stubbing the interface now means Sprint 3 ComfyUI implementation is a drop-in — replace the stub with real calls, no architecture changes needed.
- Users can see the planned feature in context without it being broken.
- Avoids blocking Sprint 1 MVP on GPU infrastructure procurement.

**Trade-offs:**
- "Coming soon" states in the UI may frustrate early users who expected the feature. Mitigated by clear labeling.
- Stub implementation means ComfyUI code path is not tested with real API calls until Sprint 3. Integration test will be added when the real client is implemented.

**Status:** ACCEPTED

---

*Decision log version: 1.0.0*
*Started: 2026-03-22*
*Maintained by: Engineering — Cheggie Studios*
*Next decision ID: DECISION-013*
