# PRIME DIRECTIVE
## Cheggie Studios — Operating Doctrine v1.0

---

## I. CORE MISSION

**Cheggie Studios builds the Serbian-first AI video workflow platform for finance and trading content creators.**

This is not a generic video tool. This is not a content farm. This is a precision instrument for a specific creator archetype: the Serbian-language finance analyst, trading educator, market commentator, and investment educator who publishes video content and demands professional output with minimal friction.

The platform automates the most painful parts of the creator workflow:
- Transcription and subtitle generation (Serbian language, native quality)
- Story and chapter extraction from long-form market analysis videos
- Search across all uploaded content
- Export pipelines (YouTube-ready, podcast-ready, short-form clips)
- AI-assisted narrative building from transcript data

The product is self-hostable, premium, and built for teams. Every design and engineering decision must serve this mission before anything else.

---

## II. THE REUSE BEFORE CREATE LAW

This is the single most important engineering law in this codebase. Violating it creates rot.

**The decision hierarchy is strict and non-negotiable:**

```
1. REUSE   — Can an existing module solve this without modification?
2. WRAP    — Can an existing module solve this with a thin adapter or config?
3. FINISH  — Is there an incomplete module that should be completed instead?
4. REFACTOR — Does an existing module need restructuring to accommodate this?
5. CREATE  — Only if none of the above apply. Document why in DECISION_LOG.md.
```

Before writing a single line of new code, an engineer must demonstrate that all four prior levels have been evaluated and ruled out. "It was easier to create new" is not a justification. "I didn't know it existed" is a process failure, not an excuse.

**This law applies to:**
- API route handlers
- Service functions
- React components
- Utility functions
- Type definitions
- Configuration objects
- Test fixtures
- Database queries
- Prompt templates

---

## III. THE NON-DUPLICATION LAW

**There shall be one canonical implementation of every concern.**

- One auth implementation. Not two.
- One storage adapter interface. Not one for uploads and one for exports.
- One queue client initialization. Not one per worker file.
- One Prisma client instance. Not one per service.
- One translation namespace per domain. Not scattered keys.
- One error boundary pattern. Not custom try/catch in every route.
- One telemetry wrapper. Not ad-hoc Sentry calls across files.

When duplication is discovered, it is not left. It is consolidated immediately — or a ticket is created with a specific deadline, logged in BUILD_NOTES.md, and assigned before the next sprint ships.

**Signs of duplication:**
- Two files that do "almost the same thing"
- Copy-pasted type definitions
- Multiple files importing the same external library directly instead of through a shared wrapper
- Similar prompt templates that aren't stored in the prompt registry
- Repeated auth checks outside of middleware

---

## IV. ZERO-TOUCH EXECUTION RULES

The platform must be operable without manual intervention in its core workflows.

**What zero-touch means:**
- A video uploaded at 3am must be transcribed, indexed, and searchable by 3:15am with no human action
- A job that fails must retry automatically with exponential backoff
- A failed job must produce a structured error record, not a silent crash
- Health endpoints must reflect real system state so monitoring can act without humans
- Workers must be stateless: kill and restart any worker without data loss
- Queue jobs must be idempotent: running the same job twice must not corrupt data

**What zero-touch does not mean:**
- No configuration. Ops config is fine. Manual operation is not.
- No dashboards. Dashboards are encouraged for observability.
- No intervention for infrastructure failures. Some failures need humans. The system must page them.

---

## V. TRUTH RULES

These rules govern what is allowed to exist in the codebase:

**No scaffolding without function.**
A file, component, route, or service that exists but does nothing must be removed or completed. Placeholder files that have sat untouched for more than one sprint are deleted. Exception: stubs that are explicitly marked with `// STUB: [reason] [expected completion date]` and tracked in BUILD_NOTES.md.

**No feature without test.**
Every feature that ships to production has at minimum:
- One integration test covering the happy path
- One test covering the most likely failure mode
- Type safety that makes misuse a compile error, not a runtime error

Unit tests are not required for every function. Integration tests on critical paths are required for every feature.

**No duplication without consolidation.**
If duplicated code is discovered during a PR review or audit, it is not merged until it is consolidated. The PR description must reference the consolidation or the PR is blocked.

---

## VI. FOCUS RULES

**Ship a working demo first. Polish second.**

The sequence is:
1. Make it work (end-to-end, real data or deterministic mock)
2. Make it correct (edge cases, error states, validation)
3. Make it fast (performance profiling, caching, query optimization)
4. Make it beautiful (animation, micro-interactions, brand polish)

Engineers do not jump to step 4 before step 1 is complete. Designers do not block step 1 on step 4. Product does not demo step 4 features that haven't passed step 2.

**The demo must always be demoable.**
The main branch must always produce a working demo. Features are developed in branches. Nothing merges to main that breaks the demo. If it breaks, it is fixed before anything else.

---

## VII. GRAPH RULES

The codebase is a knowledge graph. Every module is a node. Every import is an edge. The graph must remain healthy.

**Rules for graph health:**

- **No orphan nodes.** Every module must be imported by something meaningful, or it is deleted.
- **No circular dependencies.** Services do not import from API routes. Workers do not import from pages.
- **No upward imports.** Lower layers do not import from higher layers. Workers do not import from React components.
- **No god files.** No file exceeds 400 lines without documented justification. No file handles more than one concern.
- **Explicit boundaries.** Every service directory has an `index.ts` that exports only its public API. Internal implementation files are not imported directly from outside the directory.

**Layer ordering (top to bottom, imports flow down only):**
```
pages / components
    ↓
api routes
    ↓
service layer
    ↓
queue / job definitions
    ↓
workers
    ↓
storage / database / external services
```

---

## VIII. THE SYNTHIA 3.0™ BACKEND HARNESS PATTERN

SYNTHIA 3.0™ is the name for the reusable backend harness that powers all Cheggie Studios services. It is not a framework — it is a pattern. Every service boundary, worker, and AI integration follows this pattern.

**The eight pillars of SYNTHIA 3.0™:**

### 1. Service Boundaries
Every domain has a service module with a clean public API. The service is the only point of entry for business logic. API routes call services. Workers call services. Nothing else calls the database directly.

```
/src/services/
  transcript/
    index.ts          ← public API
    engine.ts         ← core logic
    types.ts          ← domain types
  search/
    index.ts
    engine.ts
    types.ts
```

### 2. Prompt Registry
All AI prompts are stored in a central registry. No inline prompt strings. No prompt strings scattered across files. The registry is versioned. Prompts have names, versions, and input schemas.

```
/src/lib/prompts/
  registry.ts         ← all prompts indexed by key
  types.ts            ← PromptTemplate, PromptInput types
  templates/
    story-builder.ts
    chapter-extractor.ts
    summary-generator.ts
```

### 3. MCP/CLI Architecture
The system exposes a Model Context Protocol interface for AI agent integration and a CLI for ops tasks. Both consume the same service layer. Neither bypasses it.

### 4. Job Orchestration
All async work is expressed as named jobs with typed payloads. Jobs are defined in a central job registry. Workers consume from typed queues. Job status is observable.

```
/src/workers/
  queues.ts           ← queue definitions and client
  jobs/
    transcript.ts
    search-index.ts
    subtitle-export.ts
    story-build.ts
    comfyui-render.ts
```

### 5. Logging
Structured logging throughout. Every log entry has: timestamp, level, service, traceId, userId (when available), and message. No `console.log` in production code. Use the shared logger.

### 6. Policy Checks
Authorization is not scattered in route handlers. It lives in a policy layer that takes `(user, resource, action)` and returns `allowed | denied | not-found`. Routes call policy checks. Services do not re-implement auth.

### 7. Tenant Scoping
Every database query from a service includes tenant scoping. There is no path to cross-tenant data access. Middleware attaches `tenantId` to the request context. Services read it from context, not from caller-supplied parameters (which can be spoofed).

### 8. Error Classification
Errors are typed and classified: `UserError` (4xx, show to user), `SystemError` (5xx, log and alert), `ValidationError` (400, return field errors). Error handlers at the API boundary translate these to HTTP responses. Workers translate them to job failure records.

---

## IX. LANGUAGE AND CULTURAL RULES

**Serbian is the primary language. Everything else is secondary.**

- UI copy defaults to Serbian (Latin script)
- Error messages are in Serbian
- Onboarding and empty states are in Serbian
- The design must feel native, not translated
- Finance and trading terminology must be accurate in Serbian (not Google Translate quality)
- English is available as a secondary locale but is not the reference locale

---

*This document is the law. When in doubt, re-read it.*
*Last reviewed: 2026-03-22*
