# EMERALD TABLETS™ — QUALITY GATE SCORING RUBRIC

> This rubric is used to assess build quality at sprint boundaries, pre-release reviews, and post-incident reviews. Every dimension is scored 0–10. Minimum shipping scores are enforced. A build with any dimension below its minimum score does not ship.

---

## How to Use This Rubric

1. At every sprint boundary, score the current state of `main` across all 10 dimensions.
2. Record scores in the sprint retrospective document.
3. Any dimension below the minimum shipping score creates a **release blocker**.
4. A release blocker must be resolved before shipping to production. No exceptions.
5. Target scores drive the next sprint's priorities.

---

## DIMENSION 1: FUNCTIONALITY

**Question: Does it work end-to-end across the critical user journey?**

The critical user journey for Cheggie Studios: upload video → receive transcript → search content → build story → export subtitles.

| Score | Description |
|---|---|
| 0 | App doesn't start |
| 1-2 | App starts but critical path fails immediately |
| 3-4 | Some paths work; upload or transcript is broken |
| 5 | Upload works; transcript pipeline partially works with errors |
| 6 | Upload → transcript works; search is broken or missing |
| 7 | Upload → transcript → search works; story/export broken |
| 8 | Full critical path works; edge cases and errors not handled cleanly |
| 9 | Critical path works with all major error cases handled gracefully |
| 10 | All advertised features work end-to-end, including edge cases, error recovery, and retry scenarios |

**What 10/10 looks like:** A new user can upload a Serbian finance video, wait for processing, search the transcript, extract chapters, and download an SRT subtitle file — all without encountering errors or confusing states.

**Minimum shipping score: 7**

---

## DIMENSION 2: CODE QUALITY

**Question: Is the codebase maintainable, well-structured, and free of technical rot?**

| Score | Description |
|---|---|
| 0 | Codebase cannot be built |
| 1-2 | TypeScript errors, broken imports, major structural violations |
| 3-4 | Builds with warnings; multiple god files; no separation of concerns |
| 5 | Builds cleanly; some god files; layer violations present |
| 6 | Mostly clean structure; a few files over 400 lines; minor layer violations |
| 7 | TypeScript strict enabled; no god files; service boundaries respected; minor issues |
| 8 | All of 7; no circular deps; all modules have clear single responsibility |
| 9 | All of 8; full adherence to SYNTHIA 3.0™ patterns; prompt registry in use |
| 10 | All of 9; zero linting warnings; all new code reviewed for REUSE BEFORE CREATE; graph audit passed |

**What 10/10 looks like:** `tsc --strict` passes with zero errors. ESLint passes with zero warnings. No file exceeds 400 lines. Every service follows SYNTHIA 3.0™ boundary pattern. Dependency graph has no orphan nodes, no circular dependencies, no layer violations. PR review confirms REUSE BEFORE CREATE was followed.

**Minimum shipping score: 7**

---

## DIMENSION 3: SECURITY

**Question: Is user data, workspace data, and infrastructure protected?**

| Score | Description |
|---|---|
| 0 | No auth; public data access |
| 1-2 | Auth present but easily bypassed; SQL injection possible |
| 3-4 | Basic auth works but no tenant scoping; IDOR vulnerabilities present |
| 5 | Auth + basic tenant scoping; no rate limiting; file serving insecure |
| 6 | Auth + tenant scoping on most routes; some gaps in validation |
| 7 | Auth + tenant scoping on all routes; input validation on all endpoints; signed file URLs |
| 8 | All of 7; rate limiting on all endpoints; no raw process.env in business logic |
| 9 | All of 8; API key auth working; quota enforcement; structured error responses that don't leak internals |
| 10 | All of 9; security headers set; CSP configured; auth audit log; no secrets in code or logs; file scanning hook present |

**What 10/10 looks like:** No authenticated user can access another workspace's data under any circumstance. File access requires signed URLs. Rate limits prevent abuse. Input validation is enforced at the API boundary. Error responses never expose stack traces or internal details in production. No secrets in source code.

**Minimum shipping score: 7**

---

## DIMENSION 4: UX (USER EXPERIENCE)

**Question: Does the UI feel premium, native, and right for a Serbian finance creator?**

| Score | Description |
|---|---|
| 0 | No UI; bare API only |
| 1-2 | UI renders but is unstyled or broken on most screen sizes |
| 3-4 | Basic layout; English-only; poor empty states; no loading feedback |
| 5 | Functional layout; partial Serbian copy; some loading states |
| 6 | Serbian copy on main flows; loading states present; some responsive issues |
| 7 | All main flows in Serbian; responsive layout; loading/error states on critical paths |
| 8 | All of 7; empty states with helpful guidance; consistent visual hierarchy; dark theme |
| 9 | All of 8; premium feel matching design system; native Serbian financial terminology used correctly |
| 10 | All of 9; micro-interactions; keyboard shortcuts; accessible (WCAG AA); Serbian and English locales complete |

**What 10/10 looks like:** A Serbian finance professional opens the app and it feels like it was built for them — not translated into their language, but authored in it. The typography, spacing, and color use match a premium SaaS product. Empty states guide action. Errors are human-readable. The interface is responsive on a laptop and tablet.

**Minimum shipping score: 6**

---

## DIMENSION 5: PERFORMANCE

**Question: Does the system remain fast and responsive under real usage conditions?**

| Score | Description |
|---|---|
| 0 | Synchronous blocking on all operations; unusable under any load |
| 1-2 | Upload blocks HTTP thread; no queuing |
| 3-4 | Basic queuing but N+1 queries everywhere; pages load slowly |
| 5 | Jobs queued; some N+1 queries remain; no caching |
| 6 | Jobs queued; major N+1 queries fixed; basic search optimization |
| 7 | All heavy work queued; no N+1 in critical paths; search cached in Redis |
| 8 | All of 7; database indexes on all query-critical columns; API response times < 200ms p95 |
| 9 | All of 8; background job progress streamed to UI; worker concurrency tuned |
| 10 | All of 9; CDN for assets; pgvector for semantic search; worker auto-scaling triggers; full performance test suite |

**What 10/10 looks like:** A 1-hour video is uploaded and processing begins within 2 seconds. The user can interact with the rest of the app immediately. Transcript jobs complete without blocking any API requests. Search returns results in under 300ms for workspaces with 1000+ videos. No database query takes more than 100ms under normal load.

**Minimum shipping score: 6**

---

## DIMENSION 6: OBSERVABILITY

**Question: Can engineering diagnose and respond to problems in production without guesswork?**

| Score | Description |
|---|---|
| 0 | No logging; no monitoring |
| 1-2 | console.log only; no structured output |
| 3-4 | Some structured logging; no Sentry; no health endpoint |
| 5 | Sentry initialized; basic health endpoint; unstructured logs mixed with structured |
| 6 | Sentry capturing errors; health endpoint present; mostly structured logs |
| 7 | All errors go to Sentry; health endpoint shows queue depth; all logs structured per standard |
| 8 | All of 7; worker failures tracked with context; performance traces in Sentry |
| 9 | All of 8; traceId propagated through job lifecycle; alert rules configured in Sentry |
| 10 | All of 9; log aggregation configured; dashboards for queue depth and error rate; on-call runbook exists |

**What 10/10 looks like:** When a transcript job fails at 3am, Sentry fires an alert with the full job payload, stack trace, and workspace context. The on-call engineer opens the health endpoint and sees exactly which queue is failing and at what rate. They can reproduce the failure using the job ID in the logs.

**Minimum shipping score: 6**

---

## DIMENSION 7: REUSE (SYNTHIA 3.0™ COMPLIANCE)

**Question: Is the codebase free of duplication and compliant with SYNTHIA 3.0™ patterns?**

| Score | Description |
|---|---|
| 0 | No patterns; copy-paste everywhere |
| 1-2 | Multiple auth implementations; multiple storage patterns |
| 3-4 | Significant duplication; no shared utilities; inline prompts |
| 5 | Some shared utilities; auth centralized; some inline prompts remain |
| 6 | Auth centralized; storage abstracted; some duplicated service logic |
| 7 | No duplicated auth, storage, or queue patterns; prompt registry in use for most prompts |
| 8 | All of 7; all prompts in registry; service boundaries followed across all domains |
| 9 | All of 8; tenant scoping middleware used everywhere; error classification unified |
| 10 | All of 9; full SYNTHIA 3.0™ compliance; graph audit passed; zero orphan nodes; REUSE log maintained |

**What 10/10 looks like:** There is exactly one implementation of every concern: one auth middleware, one storage adapter, one queue client, one prompt registry. No service duplicates logic from another service. A new engineer can add a feature by following existing patterns without inventing new ones.

**Minimum shipping score: 6**

---

## DIMENSION 8: TEST COVERAGE

**Question: Are critical paths protected by automated tests?**

| Score | Description |
|---|---|
| 0 | No tests |
| 1-2 | A few unit tests; no integration tests |
| 3-4 | Unit tests for some utilities; auth not tested |
| 5 | Auth tested; some API route tests; workers untested |
| 6 | Auth + major API routes tested; happy paths covered |
| 7 | Auth + API routes + service layer tested; happy paths + primary failure modes |
| 8 | All of 7; worker job handlers tested with mocked dependencies |
| 9 | All of 8; tenant scoping tested with cross-workspace access attempts; storage tested |
| 10 | All of 9; E2E tests on critical user journey; CI enforces test pass before merge |

**What 10/10 looks like:** Every authentication path is tested. Every API route that writes data is tested for happy path and missing auth. Tenant scoping is verified by attempting cross-workspace access in tests and asserting it fails. Workers are tested with mocked queue jobs. E2E test covers: register → upload → process → search → export.

**Minimum shipping score: 6**

---

## DIMENSION 9: DEPLOYMENT

**Question: Can the application be deployed reliably in a self-hosted environment?**

| Score | Description |
|---|---|
| 0 | Cannot be deployed; no container configuration |
| 1-2 | Dockerfile exists but doesn't build |
| 3-4 | Builds but missing environment documentation; manual steps required |
| 5 | Docker Compose works locally; some manual steps for production |
| 6 | Docker Compose works; environment variables documented; basic NGINX config |
| 7 | Docker Compose works end-to-end; NGINX SSL config; database migrations run in entrypoint |
| 8 | All of 7; worker process correctly separated; health check in Compose; volume mounts for persistence |
| 9 | All of 8; production and development Compose files; CI/CD pipeline runs tests before deploy |
| 10 | All of 9; one-command production deploy; backup strategy documented; update procedure documented; rollback procedure documented |

**What 10/10 looks like:** A new operator follows a README and has a fully functional instance running in under 30 minutes with: SSL, persistent storage, background workers, health monitoring, and a first admin user. They can update to a new version by pulling the latest image and running one command.

**Minimum shipping score: 7**

---

## DIMENSION 10: DOCUMENTATION (EMERALD TABLETS™ COMPLETENESS)

**Question: Is the build knowledge captured in the EMERALD TABLETS™ doctrine?**

| Score | Description |
|---|---|
| 0 | No documentation |
| 1-2 | Partial README only |
| 3-4 | README + some inline comments; no architecture docs |
| 5 | EMERALD TABLETS™ folder exists; PRIME_DIRECTIVE partially complete |
| 6 | PRIME_DIRECTIVE complete; SYSTEMS_ARCHITECTURE partially complete |
| 7 | PRIME_DIRECTIVE + SYSTEMS_ARCHITECTURE complete; DECISION_LOG has major decisions |
| 8 | All of 7; BUILD_NOTES and SCORING complete; DECISION_LOG covers all major choices |
| 9 | All of 8; inline JSDoc on all public service APIs; all STUB comments reference a sprint |
| 10 | All of 9; documentation is accurate (matches actual code); onboarding a new engineer is possible from docs alone |

**What 10/10 looks like:** A senior engineer with no prior context can read the EMERALD TABLETS™ docs, understand the entire system architecture, know why every major decision was made, identify what technical debt exists and why it was accepted, and begin contributing to the codebase within a day.

**Minimum shipping score: 7**

---

## SCORING SUMMARY TABLE

| Dimension | Min to Ship | Sprint 1 Target | Sprint 2 Target |
|---|---|---|---|
| 1. Functionality | 7 | 7 | 9 |
| 2. Code Quality | 7 | 7 | 8 |
| 3. Security | 7 | 7 | 8 |
| 4. UX | 6 | 7 | 8 |
| 5. Performance | 6 | 6 | 8 |
| 6. Observability | 6 | 6 | 8 |
| 7. Reuse | 6 | 6 | 8 |
| 8. Test Coverage | 6 | 6 | 8 |
| 9. Deployment | 7 | 7 | 8 |
| 10. Documentation | 7 | 7 | 8 |
| **Total (max 100)** | **65** | **69** | **83** |

---

## RELEASE BLOCKER PROCESS

When a dimension falls below its minimum shipping score:

1. **Document the blocker** in the sprint retrospective with the specific failing criteria.
2. **Create a focused task** in the sprint board with acceptance criteria tied to the scoring rubric.
3. **Assign and timebox** — blockers must have an owner and a deadline.
4. **Re-score after fix** — the engineer who fixes the blocker re-runs the scoring exercise and documents the new score.
5. **Sign off** — a second engineer confirms the re-score before the blocker is cleared.

No release happens with an uncleared blocker. This is a hard rule.

---

*Scoring rubric version: 1.0.0*
*Last reviewed: 2026-03-22*
