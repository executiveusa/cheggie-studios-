# Cheggie Studios 3-Repo Ecosystem — Execution Roadmap

**Document Version:** 1.0  
**Date:** 2026-03-25  
**Status:** Ready for Implementation  
**Total Effort:** ~80-120 engineering hours (2-3 weeks @ 2-3 engineers)  
**Start Date:** 2026-03-26  
**Target Launch:** 2026-04-10

---

## Executive Summary

Move from **3-repo architecture blueprint** to **fully deployed, circular, interconnected ecosystem** in 5 phases over 3 weeks.

**Key Milestones:**
- ✅ Phase 1 (Foundation): Database + secrets + agent stub (Days 1-2)
- ✅ Phase 2 (Infrastructure): All three repos + shared auth + circular nav (Days 3-5)
- ✅ Phase 3 (Brain): Tool registry + segment-ai-copilot integration (Days 6-8)
- ✅ Phase 4 (Content): Landing page + blog + design audit (Days 9-15)
- ✅ Phase 5 (Deployment): VPS + Vercel + launch (Days 16-19)

---

## Phase 1: Architecture Foundation (2 Days)

**Goal:** Set up shared infrastructure (database, secrets, basic agent)  
**Owner:** Backend engineer  
**Effort:** 16 hours

### 1.1 Database Setup

**Task 1.1.1:** PostgreSQL 16 instance accessible from all three repos
- [ ] Create PostgreSQL 16 database (local dev or cloud)
- [ ] Test connection string: `postgresql://user:pass@host:5432/cheggie`
- [ ] Create `prisma/schema.prisma` (shared across all repos)
- [ ] Run initial migration: `npx prisma migrate dev --name init`
- [ ] Seed test data (User: aleksa@cheggie.studios, password: cheggie2026)

**Effort:** 4 hours  
**Deliverable:** DATABASE_URL works for all three repos

**Task 1.1.2:** Redis 7 instance for caching + queues
- [ ] Deploy Redis (local dev or Upstash)
- [ ] Test connection: `redis-cli ping`
- [ ] Create Redis namespace: `cheggie:*` prefix

**Effort:** 2 hours  
**Deliverable:** REDIS_URL works

### 1.2 Secrets Management (Infisical)

**Task 1.2.1:** Infisical vault setup
- [ ] Create Infisical vault: `pauli-secrets-vault-cheggie`
- [ ] Add secrets:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `NEXTAUTH_SECRET` (generate: `openssl rand -base64 32`)
  - `OPENAI_API_KEY`
  - `CLAUDE_API_KEY`
  - `WHISPER_API_KEY`
  - `SENTRY_DSN`
  - (All others from existing .env.local)
- [ ] Set up Infisical token for CI/CD

**Effort:** 3 hours  
**Deliverable:** All secrets centralized, CI/CD can pull them

### 1.3 pauli-hermes-agent Stub

**Task 1.3.1:** Set up basic agent endpoint
- [ ] Clone pauli-hermes-agent repo (or create new)
- [ ] Create Express.js server (or FastAPI)
- [ ] Implement `/api/agent` endpoint (accepts request, echoes back response)
- [ ] Deploy to VPS 31.220.58.212 (or local for testing)
- [ ] Create docs: API contract + example requests

**Effort:** 5 hours  
**Deliverable:** POST /api/agent works end-to-end (hermes-agent stub running)

### 1.4 Documentation & Validation

**Task 1.4.1:** Validate Phase 1 completion
- [ ] Test: All three repos can connect to PostgreSQL
- [ ] Test: Redis connection works
- [ ] Test: hermes-agent endpoint responds
- [ ] Document: Connection strings + secrets (Infisical only, no hardcoding)
- [ ] Checklist: Phase 1 gate passed ✅

**Effort:** 2 hours  
**Deliverable:** Phase 1 validation checklist

---

## Phase 2: Core Infrastructure (3-4 Days)

**Goal:** Deploy all three repos with shared auth + circular navigation  
**Owner:** Full stack engineers (2 people, parallel work)  
**Effort:** 32 hours

### 2.1 Shared NextAuth v5 Setup

**Task 2.1.1:** Configure shared NextAuth across all three repos
- [ ] Copy `lib/auth.ts` to all three repos (identical)
- [ ] Configure PostgreSQL session store (adapter: `@auth/prisma-adapter`)
- [ ] Implement login/logout pages (shared styling)
- [ ] Create `/api/auth/[nextauth]` routes (all three repos)
- [ ] Test: Login on one repo, verify session in another

**Effort:** 6 hours  
**Deliverable:** User can log in on any surface + session persists across all three

### 2.2 cheggie-lifestyle-finance (Repo 1)

**Task 2.2.1:** Scaffold landing page
- [ ] Create Next.js 15 app (or clone existing)
- [ ] Implement layout.tsx + header + footer (circular nav template)
- [ ] Create pages:
  - `/` — Landing hero (Aleksa's intro)
  - `/about` — Aleksa's story
  - `/products` — Lleggie Studios + AI-Trader showcase
  - `/login` — Auth login page
- [ ] Connect NextAuth (shared auth.ts)
- [ ] Connect Prisma (shared schema)
- [ ] Implement circular footer navigation (links to other repos)

**Effort:** 8 hours  
**Deliverable:** Landing page deployed (static content, ready for copy)

### 2.3 cheggie-studios- (Repo 2 - Enhanced)

**Task 2.3.1:** Add chat interface + circular navigation
- [ ] Create `/dashboard` page (video management UI)
- [ ] Create `/api/chat` endpoint (calls hermes-agent)
- [ ] Integrate segment-ai-copilot (or create chat UI component)
- [ ] Implement circular footer navigation
- [ ] Connect NextAuth (shared)
- [ ] Connect Prisma (shared)
- [ ] Wire hermes-agent client (calls /api/agent)

**Effort:** 12 hours  
**Deliverable:** Chat interface works + hermes-agent connected

### 2.4 CHEGGIE-AI-Trader (Repo 3)

**Task 2.4.1:** Scaffold trading dashboard
- [ ] Create Next.js 15 app
- [ ] Implement pages:
  - `/` — Trading dashboard (position overview)
  - `/voice` — Voice command input
  - `/alerts` — Trading alerts
  - `/login` — Auth login
- [ ] Connect NextAuth (shared)
- [ ] Implement circular footer navigation
- [ ] Wire hermes-agent client (tool calling)

**Effort:** 8 hours  
**Deliverable:** Trading dashboard skeleton deployed

### 2.5 Three.js Chess Knight Loader

**Task 2.5.1:** Create loading animation
- [ ] Implement ChessKnightLoader component (Three.js r128)
- [ ] Create knight 3D model + animation
- [ ] Duration: 5 seconds
- [ ] Show "Welcome to Cheggie Studios" splash after
- [ ] Integrate into cheggie-studios entry point

**Effort:** 6 hours  
**Deliverable:** Chess knight animation works on cheggie-studios load

### 2.6 Circular Navigation Testing

**Task 2.6.1:** Validate all three repos linked
- [ ] cheggie-lifestyle-finance footer → Cheggie Studios link works
- [ ] cheggie-lifestyle-finance footer → AI-Trader link works
- [ ] cheggie-studios footer → Aleksa page link works
- [ ] cheggie-studios footer → AI-Trader link works
- [ ] CHEGGIE-AI-Trader footer → Aleksa page link works
- [ ] CHEGGIE-AI-Trader footer → Cheggie Studios link works
- [ ] All pages load under 2s (LCP)

**Effort:** 2 hours  
**Deliverable:** Phase 2 validation checklist ✅

---

## Phase 3: Brain Integration (3 Days)

**Goal:** Wire pauli-hermes-agent with full tool registry  
**Owner:** AI/Backend engineer  
**Effort:** 32 hours

### 3.1 Tool Registry Foundation

**Task 3.1.1:** Build tool definition + registry
- [ ] Create `pauli-hermes-agent/src/tools.ts` with tool registry structure
- [ ] Define tool schema (name, description, params, required)
- [ ] Implement tool loading + validation
- [ ] Create error handling for missing/invalid tools

**Effort:** 5 hours  
**Deliverable:** Tool registry foundation (ready for tools)

### 3.2 Trading Tools

**Task 3.2.1:** Implement trading tool suite
- [ ] Tool: `getPositions` (reads user's trading positions from external API)
  - Params: `userId`, `asset_class` (stocks, options, crypto)
  - Returns: Positions list with P&L
- [ ] Tool: `getCharts` (fetch price charts)
  - Params: `symbol`, `timeframe` (1d, 1w, 1m)
  - Returns: OHLCV data
- [ ] Tool: `getAlerts` (list active trading alerts)
  - Params: `userId`
  - Returns: Alert list
- [ ] Tool: `analyzeMarket` (market analysis based on hermes reasoning)
  - Params: `symbols`, `timeframe`
  - Returns: Analysis + recommendation

**Effort:** 8 hours  
**Deliverable:** All trading tools callable from hermes-agent

### 3.3 Video/StoryKit Tools

**Task 3.3.1:** Implement video tool suite
- [ ] Tool: `transcribeVideo` (calls Whisper + stores in DB)
  - Params: `videoUrl`, `storyId`
  - Returns: Transcript + segments
  - **Queue via BullMQ** (long-running job)
- [ ] Tool: `exportVideo` (export video in multiple formats)
  - Params: `storyId`, `format` (mp4, wav, srt)
  - Returns: Export status + download URL
  - **Queue via BullMQ**
- [ ] Tool: `analyzeTranscript` (search + summarize)
  - Params: `transcriptId`, `query`
  - Returns: Matching segments + summary

**Effort:** 8 hours  
**Deliverable:** Video tools callable + BullMQ integration

### 3.4 Analytics & System Tools

**Task 3.4.1:** Implement utility tools
- [ ] Tool: `searchNews` (fetch relevant news)
  - Params: `query`, `sources` (bloomberg, reuters)
  - Returns: News summary
- [ ] Tool: `getMetrics` (dashboard statistics)
  - Params: `userId`, `metric` (portfolio_value, trades_today)
  - Returns: Metric value
- [ ] Tool: `generateReport` (create PDF report)
  - Params: `reportType` (daily, weekly, monthly)
  - Returns: Report URL

**Effort:** 5 hours  
**Deliverable:** Utility tools working

### 3.5 segment-ai-copilot Integration

**Task 3.5.1:** Wire chatbot to hermes-agent
- [ ] Integrate segment-ai-copilot package into all three repos
- [ ] Create `hermes-api-client.ts` (common HTTP client)
- [ ] Test chat message → hermes-agent → tool execution → response
- [ ] Implement voice input (Whisper transcription)
- [ ] UX: Chat displays tool execution progress + results

**Effort:** 6 hours  
**Deliverable:** End-to-end chat → tool → result flow working

### 3.6 Brain Integration Testing

**Task 3.6.1:** Validate Phase 3 completion
- [ ] Test: Chat "Show my SPY positions" → hermes → getPositions → response
- [ ] Test: Chat "Transcribe video XYZ" → BullMQ job → transcript stored
- [ ] Test: Chat "Latest market news" → hermes → searchNews → results
- [ ] Test: Voice input → Whisper → understood command → executed
- [ ] Performance: Tool execution <2s for sync tools
- [ ] Error handling: Invalid tool → graceful error message

**Effort:** 2 hours  
**Deliverable:** Phase 3 validation checklist ✅

---

## Phase 4: Content & Design (7 Days)

**Goal:** Create landing page + blog + design audit  
**Owner:** Content + Design team  
**Effort:** 40 hours

### 4.1 cheggie-lifestyle-finance Content

**Task 4.1.1:** Write Aleksa's landing page copy
- [ ] Hero section: Aleksa's headline (WHO he is, WHAT he does, WHY it matters)
- [ ] About section: Story, credentials, trading philosophy (real voice, no AI slop)
- [ ] Products section: Cheggie Studios description + link
- [ ] Products section: AI-Trader description + link
- [ ] Call-to-action: Newsletter signup OR book call
- [ ] Social proof: Testimonials / metrics (optional)

**Effort:** 8 hours  
**Required Input:** Aleksa's story, credentials, philosophy  
**Note:** This task is **GATED** waiting for Aleksa's real background information

**Deliverable:** Landing page copy (ready for design polish)

### 4.2 Design Audit (EMERALD TABLETS™)

**Task 4.2.1:** Score all three repos on 12-axis framework
- [ ] Axis 1 (Design Coherence): Consistent spacing, typography, color scheme
- [ ] Axis 2 (User Journey): Friction-free path to chat + video + trading
- [ ] Axis 3 (Information Hierarchy): Primary actions obvious, secondary accessible
- [ ] Axis 4 (Responsiveness): Desktop, tablet, mobile all work
- [ ] Axis 5 (Accessibility): WCAG AA, keyboard nav, screen readers
- [ ] Axis 6 (Performance): <2s LCP, <3s FID (voice command must respond fast)
- [ ] Axis 7 (Brand Authenticity): Aleksa's voice evident (not generic "AI chatbot" vibes)
- [ ] Axis 8 (Feedback Loops): Chat shows progress, BullMQ jobs display status
- [ ] Axis 9 (Error Handling): Clear, actionable error messages (not "500 Internal Error")
- [ ] Axis 10 (Visual Delight): Chess knight animation, smooth transitions, micro-interactions
- [ ] Axis 11 (Security Perception): No hardcoded secrets visible, HTTPS everywhere
- [ ] Axis 12 (Viral Readiness): Share buttons, metrics display, "invite a friend" flow

**Scoring:** 1-10 per axis, must average ≥8.5

**Effort:** 10 hours  
**Deliverable:** Design audit report + remediation plan

### 4.3 pauli-blog Content

**Task 4.3.1:** Seed blog with 30 days of real finance content
- [ ] Establish content sources (TOP 5-10 finance sources only)
  - Example: Renaissance Technologies, Citadel, DE Shaw, academic papers, successful trader blogs
- [ ] Create blog post structure template:
  - Title
  - Date (backdated 30 days)
  - Summary (1 paragraph)
  - Body (real takeaways, quoted sources)
  - Sources (full citations + links)
  - Glossary terms (new trading terms defined)
  - Related reading
- [ ] Write 30 blog posts (various finance topics):
  - Trading psychology (Aleksa's philosophy interwoven)
  - Market analysis (real market events from past 30 days)
  - Trading systems (real trading approaches)
  - Risk management (capital preservation)
  - Crypto / forex / options (Aleksa's niche)
- [ ] Create glossary (trading terms)
- [ ] Deploy blog (Jekyll or Eleventy)

**Effort:** 16 hours  
**Required Input:** Aleksa's finance sources + trading philosophy  
**Note:** This task is **GATED** waiting for source list + niche clarification

**Deliverable:** Full blog live with 30 days of real content

### 4.4 Viral Readiness UX Review

**Task 4.4.1:** Audit user journey for viral potential
- [ ] New user flow: Landing page → Chat intro → First interaction → Share result (can we do this in <60s?)
- [ ] Sharing mechanism: "Share my analysis" button on trading dashboard
- [ ] Social proof: Display top traders' results (or metrics)
- [ ] Call-to-action clarity: What's the one thing Aleksa wants users to do?
- [ ] Mobile-first: Ensure mobile is first-class (voice input on mobile!)
- [ ] Referral mechanism: "Invite a friend, get 1 free analysis"

**Effort:** 6 hours  
**Deliverable:** Viral readiness checklist + UX improvements

---

## Phase 5: Deployment & Launch (4 Days)

**Goal:** Deploy all three repos + launch  
**Owner:** DevOps + QA  
**Effort:** 20 hours

### 5.1 Deploy to Coolify VPS

**Task 5.1.1:** Deploy cheggie-lifestyle-finance
- [ ] SSH to 31.220.58.212
- [ ] Clone repo + set up environment
- [ ] Install dependencies + build Next.js app
- [ ] Configure reverse proxy (Nginx) + SSL cert
- [ ] Set up automatic deployments (git push → deploy)
- [ ] Test: cheggie-lifestyle-finance accessible via domain

**Effort:** 4 hours  
**Deliverable:** cheggie-lifestyle-finance live on VPS

**Task 5.1.2:** Deploy CHEGGIE-AI-Trader
- [ ] Same process as above for AI-Trader repo
- [ ] Configure separate port / subdomain

**Effort:** 2 hours  
**Deliverable:** CHEGGIE-AI-Trader live on VPS

**Task 5.1.3:** Deploy pauli-hermes-agent
- [ ] Deploy agent server to VPS (or cloud)
- [ ] Configure process manager (PM2 or systemd)
- [ ] Set up monitoring + logs

**Effort:** 2 hours  
**Deliverable:** pauli-hermes-agent running + accessible

**Task 5.1.4:** Deploy pauli-blog
- [ ] Build static site (Jekyll / Eleventy)
- [ ] Deploy to Vercel or static hosting

**Effort:** 1 hour  
**Deliverable:** pauli-blog live

### 5.2 Deploy cheggie-studios to Vercel

**Task 5.2.1:** Final checks + Vercel deployment
- [ ] Ensure all environment variables set (Infisical secrets)
- [ ] Run final tests (chat works, video upload works, jobs process)
- [ ] Deploy to Vercel (git push origin main)
- [ ] Monitor: Sentry errors, performance metrics

**Effort:** 2 hours  
**Deliverable:** cheggie-studios deployed to Vercel production

### 5.3 Integration Testing

**Task 5.3.1:** End-to-end circular ecosystem testing
- [ ] Test: Log in on cheggie-lifestyle-finance, navigate to Cheggie Studios, session persists
- [ ] Test: Log in on CHEGGIE-AI-Trader, chat works, hermes-agent responses accurate
- [ ] Test: All three repos' footers link correctly
- [ ] Test: Chat interface works on all three surfaces
- [ ] Test: Voice input transcription works
- [ ] Test: Video upload → processing → complete (BullMQ)
- [ ] Test: Performance <2s LCP, <3s FID on all pages
- [ ] Test: Mobile responsive (chat + video + trading UI)

**Effort:** 4 hours  
**Deliverable:** Integration test report ✅

### 5.4 Monitoring & Go-Live

**Task 5.4.1:** Set up monitoring + alerting
- [ ] Sentry: Errors tracked on all three repos
- [ ] Performance: Monitor LCP, FID, CLS
- [ ] Uptime: Monitor all three endpoints
- [ ] Database: Monitor connection pool + query performance
- [ ] Cache: Monitor Redis hit rate

**Effort:** 2 hours  
**Deliverable:** Monitoring dashboard live

**Task 5.4.2:** Launch & communication
- [ ] Announce launch (email, socials, blog)
- [ ] Monitor Day 1 metrics (errors, traffic, user actions)
- [ ] Be ready for quick fixes if needed
- [ ] Celebrate! 🎉

**Effort:** 2 hours  
**Deliverable:** Cheggie Studios ecosystem live

---

## Timeline & Milestones

```
Week 1:
├─ Days 1-2: Phase 1 (Foundation) ✓
├─ Days 3-5: Phase 2 (Infrastructure) ✓
└─ Days 6-8: Phase 3 (Brain Integration) ✓

Week 2:
├─ Days 9-15: Phase 4 (Content & Design) ✓
└─ Gated tasks: Aleksa's story + finance sources needed

Week 3:
├─ Days 16-19: Phase 5 (Deployment & Launch) ✓
└─ Day 20+: Monitor + iterate
```

**Critical Path:**
1. Database + secrets (Phase 1) — Must complete before anything else
2. NextAuth setup (Phase 2) — Blocks all repo work
3. hermes-agent stub (Phase 1) — Blocks Phase 3
4. Tool registry (Phase 3) — Blocks chat integration
5. Landing page copy (Phase 4) — Waiting on Aleksa's story
6. Blog content (Phase 4) — Waiting on finance sources + niche

---

## Resource Requirements

### Personnel

| Role | Effort | Duration | Notes |
|------|--------|----------|-------|
| Backend Engineer | 24 hours | Week 1-2 | Database, auth, API setup |
| Full-Stack Engineer | 32 hours | Week 1-2 | All three repos skeleton + chat |
| AI/Agent Engineer | 24 hours | Week 2 | hermes-agent + tool registry |
| Content Writer | 16 hours | Week 2-3 | Blog posts + landing copy |
| Design Lead | 10 hours | Week 2-3 | Design audit + UX review |
| DevOps Engineer | 8 hours | Week 3 | Deployment + monitoring |
| QA Engineer | 4 hours | Week 3 | Integration testing |

**Total:** ~120 hours over 3 weeks = 2-3 full-time engineers

### Infrastructure

| Component | Cost/Month | Provider | Notes |
|-----------|-----------|----------|-------|
| PostgreSQL 16 | $15-50 | AWS RDS / DigitalOcean / Local | Shared across all repos |
| Redis | $15-30 | Upstash / DigitalOcean | BullMQ queue storage |
| VPS (Coolify) | $30-50 | Hostinger (31.220.58.212) | 2 landing pages + blog + agent |
| Vercel | $15-50 | Vercel (cheggie-studios) | Production video platform |
| Sentry | $29/month | Sentry | Error tracking |
| Infisical | Free/Pro | Infisical.com | Secrets management |

---

## Gated Tasks (Waiting on Input)

These tasks block progression and need Aleksa's input:

1. **Landing page copy** (4.1.1)
   - Waiting for: Aleksa's real story, credentials, trading philosophy
   - Impact: Cannot finalize cheggie-lifestyle-finance without this
   - Solution: Use placeholder copy → iterate once real copy provided

2. **Blog content** (4.3.1)
   - Waiting for: Top 5-10 finance sources, trading niche (options? crypto? stocks?)
   - Impact: Cannot write credible blog without sources
   - Solution: Establish source list → write 30 posts in parallel while other phases proceed

3. **Design decisions** (4.2.1)
   - Waiting for: Brand color palette, typography preferences, Aleksa's "vibe"
   - Impact: Design audit will be lower score if brand undefined
   - Solution: Define brand basics Week 1 (color, fonts) → design to brand

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| API rate limits (Whisper, APIs) | Chat blocks | Implement queues + retry logic early (Phase 3) |
| Database migration failures | Data loss | Test migrations thoroughly in staging first |
| SSH access to VPS | Deployment blocked | Verify SSH key + IP whitelist in Phase 0 |
| Infisical outage | Secrets inaccessible | Fall back to local .env.local in dev |
| Vercel deployment issues | cheggie-studios down | Automated rollback configured |
| BullMQ crashes | Jobs lost | Use Redis persistence + monitoring |

---

## Success Criteria (Phase 5 Gate)

ALL must be true to declare "launch ready":

- [ ] All three repos deployed + accessible
- [ ] Circular navigation working (all footer links clickable)
- [ ] Authentication shared across all three surfaces
- [ ] Chat interface functional on all three surfaces
- [ ] hermes-agent responding to tool calls (<2s round trip)
- [ ] Voice transcription working (Whisper)
- [ ] BullMQ jobs processing (video transcription complete)
- [ ] No hardcoded secrets anywhere (Infisical only)
- [ ] Performance: <2s LCP, <3s FID on all pages
- [ ] Mobile responsive (tested on phones)
- [ ] Sentry monitoring active + alerting configured
- [ ] Database backups automated
- [ ] SSL certificates valid (HTTPS everywhere)
- [ ] Design audit ≥8.5/10 on 12-axis scoring
- [ ] Home page copy finalized (Aleksa approved)
- [ ] Blog live with 30 days of content

---

## Post-Launch: V2 Roadmap

Once V1 is stable (~1 week post-launch), plan:

- [ ] Live trading (currently sandbox only) — WITH SAFEGUARDS
- [ ] Aleksa training videos (video platform deep dive)
- [ ] ChatBot personality refinement (Aleksa's voice stronger)
- [ ] Advanced trading analytics (correlation analysis, etc.)
- [ ] Community features (user profiles, leaderboards)
- [ ] Mobile app (React Native or Flutter)
- [ ] Upgrade auth to 2FA (security)

---

## Document Status

**Status:** Ready for Phase 1 kickoff  
**Owner:** Development team  
**Last Updated:** 2026-03-25  
**Next Review:** Post-Phase 1 (2026-03-27)

---

## Appendix: Daily Standups (Template)

**Each day, answer:**

1. What did we complete yesterday?
2. What are we working on today?
3. What blockers do we have?
4. What input do we need from Aleksa?
5. Are we on track for launch?

**Track in Beads issue system** (one issue per day)

---

**Let's build this.** 🚀
