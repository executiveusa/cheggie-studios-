# Cheggie Studios Circular Ecosystem Architecture
## 3-Repo Circular Linking + Unified Brain Design

**Document Version:** 1.0  
**Date:** 2026-03-25  
**Owner:** Aleksa (Cheggie Studios)  
**Status:** Architecture Specification (Ready for Implementation)

---

## 1. Executive Summary

The Cheggie Studios ecosystem is a **circular, interconnected system of 3 independent repos** that share a **unified brain** (pauli-hermes-agent) and **single authentication context** while maintaining clear separation of concerns:

- **Repo 1: cheggie-lifestyle-finance** — Aleksa's personal brand landing page (hub)
- **Repo 2: cheggie-studios-** — Video workflow platform with AI control (core engine)
- **Repo 3: CHEGGIE-AI-Trader** — Voice-controlled trading access tool

**Key Principle:** Circular linking (not linear hierarchy). Each surface can reach the others via footer links or navigation. The unified brain (hermes-agent) powers ALL tool operations across all three surfaces. The chat interface (segment-ai-copilot) is the PRIMARY interaction model.

---

## 2. Circular Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CHEGGIE STUDIOS ECOSYSTEM                           │
│                          (Aleksa's Brand System)                            │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │  NextAuth v5    │
                              │ (cheggie2026)   │
                              │   Shared Auth   │
                              └────────┬────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                │                      │                      │
                ▼                      ▼                      ▼
        ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
        │   Repo 1:    │       │   Repo 2:    │       │   Repo 3:    │
        │  cheggie-    │       │  cheggie-    │       │  CHEGGIE-    │
        │  lifestyle-  │       │  studios-    │       │  AI-Trader   │
        │  finance     │ ◄────►│ (Core Engine)│ ◄────►│ (Voice Tool) │
        │ (Hub/Brand)  │       │              │       │              │
        └────┬─────────┘       └────┬─────────┘       └────┬─────────┘
             │                      │                      │
             │ Circular Footers     │ Circular Footers     │
             └──────────────────────┼──────────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ pauli-hermes-agent   │
                         │  (Unified Brain)     │
                         │ - Tool Registry      │
                         │ - Skill Management   │
                         │ - Decision Engine    │
                         │ - Memory/Context     │
                         └──────────┬───────────┘
                                    │
                ┌───────────────────┼────────────────────┐
                │                   │                    │
                ▼                   ▼                    ▼
        ┌──────────────────┐ ┌──────────────┐ ┌───────────────────┐
        │ segment-ai-      │ │     Tools    │ │  External APIs    │
        │ copilot          │ │ - Bloomberg  │ │  - OpenAI Whisper │
        │ (Chat Interface) │ │ - Reuters    │ │  - StoryKit       │
        │ - Voice input    │ │ - Datasets   │ │  - Trading APIs   │
        │ - Chat UX        │ │ - Indicators │ │  - News feeds     │
        │ - Tool Calling   │ │ - Analytics  │ │  - Data services  │
        └──────────────────┘ └──────────────┘ └───────────────────┘
                │
                └─────► pauli-blog (30-day content archive)

LEGEND:
─────► = Circular linking (footer navigation)
────► = Data flow direction (hermes controls operations)
*/    = Shared authentication context
```

---

## 3. Data Flow: "How Everything Connects"

### 3.1 User Interaction Flow

```mermaid
sequenceDiagram
    participant User as User (Voice/Text)
    participant Chat as segment-ai-copilot<br/>(Chat Interface)
    participant Hermes as pauli-hermes-agent<br/>(Brain)
    participant Tools as Tool Registry<br/>(Skill Execution)
    participant Repo as Active Repo<br/>(Rendering)

    User->>Chat: "Send voice command<br/>or text query"
    Chat->>Chat: Transcribe (Whisper)<br/>Parse intent
    Chat->>Hermes: "Execute skill:<br/>tool_name, params"
    Hermes->>Tools: Lookup tool<br/>Validate context
    Tools->>Tools: Execute (API call,<br/>database query, etc.)
    Tools->>Hermes: Return result +<br/>feedback
    Hermes->>Chat: "Success/Error +<br/>next action"
    Chat->>Repo: Render response<br/>(UI update)
    Repo->>User: Display result +<br/>next options
```

### 3.2 Authentication Flow (Shared Across All 3 Repos)

```
1. User logs in on ANY surface (cheggie-lifestyle-finance, cheggie-studios, or AI-Trader)
2. NextAuth v5 validates credentials against shared PostgreSQL session store
3. Session token issued (valid across all 3 repos)
4. All three repos verify token on each request
5. hermes-agent includes user context in ALL tool calls
6. Logout on ANY surface invalidates session everywhere
```

### 3.3 Circular Navigation (Footer Linking)

```
cheggie-lifestyle-finance Footer:
  └─ "Cheggie Studios" link → cheggie-studios home
  └─ "AI Trading Tool" link → CHEGGIE-AI-Trader
  └─ "Blog" link → pauli-blog (archived finance content)

cheggie-studios Footer:
  └─ "About Aleksa" link → cheggie-lifestyle-finance
  └─ "AI Trading" link → CHEGGIE-AI-Trader
  └─ "Finance Blog" link → pauli-blog

CHEGGIE-AI-Trader Footer:
  └─ "About Aleksa" link → cheggie-lifestyle-finance
  └─ "Cheggie Studios" link → cheggie-studios
  └─ "Finance Resources" link → pauli-blog
```

---

## 4. Technical Stack (Unified Across All 3)

| Component | Technology | Purpose | Notes |
|-----------|-----------|---------|-------|
| **Framework** | Next.js 15 (App Router) | Web app foundation | SSR + API routes |
| **Language** | TypeScript 5 (strict) | Type safety | All three repos same |
| **Database** | PostgreSQL 16 + Prisma ORM | Persistent storage | Shared schema via migrations |
| **Real-Time** | BullMQ + Redis 7 | Job queue + caching | Job processors for all repos |
| **Auth** | NextAuth v5 | Authentication | Shared session store (PostgreSQL) |
| **Storage** | S3-compatible (local dev, prod TBD) | File storage | Videos, transcripts, exports |
| **AI/Voice** | OpenAI Whisper | Voice transcription | Called from segment-ai-copilot |
| **AI/Chat** | Claude API (via segment-ai-copilot) | Chat completion | Tool calling + reasoning |
| **StoryKit** | StoryToolkitAI (preserved) | Video workflow engine | Wrapping, not rewriting |
| **3D Loading** | Three.js r128 | Chess knight animation | 5s pre-load (cheggie-studios entry) |
| **Styling** | Tailwind CSS v4 + shadcn/ui | UI components | Consistent across surfaces |
| **Monitoring** | Sentry | Error tracking | All three repos report |
| **Deployment** | Vercel (cheggie-studios), Coolify (VPS 31.220.58.212) | Hosting | cheggie-lifestyle / AI-Trader on VPS |
| **Secrets** | Infisical (pauli-secrets-vault-) | Env management | Nothing hardcoded |

---

## 5. Repo Responsibilities

### 5.1 Repo 1: cheggie-lifestyle-finance (Hub/Landing Page)
**Purpose:** Aleksa's personal brand + product showcase  
**Owner:** Aleksa (personal voice)  
**Deployment:** Coolify VPS (31.220.58.212) or Vercel  

**Components:**
- Personal intro (story, credentials, trading philosophy)
- Product showcase (Cheggie Studios link, AI-Trader link)
- Blog integration (pauli-blog in featured section)
- Newsletter signup (optional)
- Social proof (testimonials, metrics)
- Footer: Circular links to other two repos + blog

**Key Files:**
```
cheggie-lifestyle-finance/
├── app/
│   ├── page.tsx                  # Landing home
│   ├── about/page.tsx            # Aleksa's story
│   ├── products/page.tsx         # Cheggie Studios + AI-Trader showcase
│   └── layout.tsx                # Shared header/footer (circular nav)
├── components/
│   ├── Hero.tsx                  # Aleksa's headline + CTA
│   ├── ProductShowcase.tsx       # Links to other repos
│   ├── BlogFeed.tsx              # Curated posts from pauli-blog
│   ├── Footer.tsx                # Circular footer navigation
│   └── ...
├── lib/
│   ├── prisma.ts                 # Shared database client
│   └── auth.ts                   # NextAuth configuration (shared)
├── .env.local                    # Secrets from Infisical
└── package.json                  # Next.js 15 + dependencies
```

**Data Dependencies:**
- User session (from NextAuth shared store)
- Blog posts (read from pauli-blog or PostgreSQL cache)
- Product metadata (Cheggie Studios + AI-Trader info)

**No Job Processor Needed** (static landing page, read-only content)

---

### 5.2 Repo 2: cheggie-studios- (Core Video Platform + Chat Control)
**Purpose:** Video workflow engine + AI/chat control interface  
**Owner:** Development team (Aleksa's content system)  
**Deployment:** Vercel (prj_ynAWuq5XP3aEUkf21I8gi7Vu0btL)  

**Components:**
- Video upload + processing (StoryToolkitAI wrapped)
- Chat interface (segment-ai-copilot integrated)
- Tool registry (hermes-agent skill execution)
- Job processor for transcription, export, etc.
- Admin dashboard for video management
- Footer: Circular links to personal page + AI-Trader

**Key Files:**
```
cheggie-studios-/
├── app/
│   ├── dashboard/page.tsx        # Video management UI
│   ├── api/
│   │   ├── chat/route.ts         # Chat endpoint (calls hermes-agent)
│   │   ├── stories/upload/route.ts
│   │   └── jobs/route.ts         # BullMQ job management
│   └── layout.tsx                # Header/footer (circular nav)
├── components/
│   ├── ChatInterface.tsx         # segment-ai-copilot integration
│   ├── VideoPlayer.tsx
│   ├── StoryEditor.tsx           # StoryKit UI (preserved wrapper)
│   └── Footer.tsx                # Circular navigation
├── lib/
│   ├── prisma.ts                 # Shared database
│   ├── auth.ts                   # NextAuth (shared)
│   ├── storykit-wrapper.ts       # Preserves StoryToolkitAI engine
│   └── hermes-api-client.ts      # Calls pauli-hermes-agent
├── services/
│   ├── TranscriptService.ts      # Whisper API calls
│   ├── SearchService.ts          # Vector search (optional)
│   └── ExportService.ts          # Video export
├── jobs/
│   ├── TranscriptProcessor.ts    # BullMQ job handler
│   ├── ExportProcessor.ts
│   └── ... (other processors)
├── .env.local
├── prisma/                       # Shared schema
│   └── schema.prisma
└── package.json
```

**Data Dependencies:**
- User session (NextAuth shared)
- Video data (PostgreSQL via Prisma)
- Job queue (Redis via BullMQ)
- External APIs (Whisper, hermes-agent, storage)

**Job Processors:**
- TranscriptProcessor: Handles video transcription (Whisper)
- ExportProcessor: Exports videos in multiple formats
- SearchIndexer: Optional vector indexing
- NotificationProcessor: User notifications

---

### 5.3 Repo 3: CHEGGIE-AI-Trader (Voice-Controlled Trading Access)
**Purpose:** Voice interface to trading tools (read-only or sandbox, NO live trades)  
**Owner:** Development team (Aleksa's voice trading gateway)  
**Deployment:** Coolify VPS (31.220.58.212) or Vercel  

**Components:**
- Voice input (Whisper + segment-ai-copilot)
- Trading dashboard (read-only: positions, charts, P&L)
- Tool interface to hermes-agent (skill execution)
- Footer: Circular links to personal page + Cheggie Studios

**Key Files:**
```
CHEGGIE-AI-Trader/
├── app/
│   ├── trading/page.tsx          # Trading dashboard
│   ├── api/
│   │   ├── voice/route.ts        # Voice command endpoint
│   │   └── positions/route.ts    # Read-only trading data
│   └── layout.tsx                # Header/footer (circular nav)
├── components/
│   ├── VoiceInput.tsx            # Whisper + transcript UI
│   ├── TradingDashboard.tsx      # Charts, positions, alerts
│   ├── CommandExecutor.tsx       # Tool calling (via hermes)
│   └── Footer.tsx                # Circular navigation
├── lib/
│   ├── prisma.ts                 # Shared database
│   ├── auth.ts                   # NextAuth (shared)
│   └── hermes-api-client.ts      # Tool calling
├── .env.local
└── package.json
```

**Data Dependencies:**
- User session (NextAuth shared)
- Trading data (read from external APIs, cached in PostgreSQL)
- Voice transcript (Whisper)
- Tool execution (hermes-agent)

**No Job Processor Needed** (real-time interactions only)

---

## 6. Unified Brain: pauli-hermes-agent

### 6.1 Role & Responsibilities

**pauli-hermes-agent** is the SINGLE SOURCE OF TRUTH for all intelligent operations across all three repos:

- **Tool Registry:** All available skills (trading tools, video tools, analytics, etc.)
- **Skill Execution:** Handles tool invocation, parameter validation, error handling
- **Decision Making:** Routes requests to appropriate tools based on intent
- **Memory Management:** User context, session state, conversation history
- **Feedback Loops:** Learns from user interactions (prompt optimization)
- **API Endpoint:** Called by all three repos via HTTP (not embedded)

### 6.2 Architecture

```
pauli-hermes-agent/
├── src/
│   ├── core/
│   │   ├── agent.ts              # Main agent loop (Claude reasoning)
│   │   ├── tools.ts              # Tool registry + execution
│   │   └── memory.ts             # Context management
│   ├── tools/
│   │   ├── trading/              # Trading skills (Bloomberg, Reuters APIs)
│   │   │   ├── getPositions.ts
│   │   │   ├── getCharts.ts
│   │   │   ├── getAlerts.ts
│   │   │   └── analyzeMarket.ts
│   │   ├── video/                # Video/StoryKit skills
│   │   │   ├── transcribeVideo.ts
│   │   │   ├── exportVideo.ts
│   │   │   └── analyzeTranscript.ts
│   │   ├── analytics/            # General data skills
│   │   │   ├── searchNews.ts
│   │   │   ├── getMetrics.ts
│   │   │   └── generateReport.ts
│   │   └── system/               # System skills
│   │       ├── getTime.ts
│   │       ├── getWeather.ts     # Optional fun skill
│   │       └── getCalendar.ts    # Schedule integration
│   ├── api/
│   │   └── route.ts              # Express/FastAPI endpoint (single POST)
│   └── index.ts                  # Server entry point
├── .env.local                    # Secrets (Infisical)
└── package.json
```

### 6.3 API Contract (Called by All 3 Repos)

```typescript
// POST /api/agent
{
  "userId": "user-123",
  "sessionId": "session-456",
  "input": {
    "type": "voice" | "text" | "tool-call",
    "content": "Please show me my SPY positions",
    "context": {
      "currentRepo": "CHEGGIE-AI-Trader" | "cheggie-studios" | "cheggie-lifestyle-finance",
      "userPreferences": { ... },
      "conversationHistory": [ ... ]
    }
  }
}

// Response
{
  "status": "success" | "error",
  "agentResponse": "Your SPY position is up 2.3% today...",
  "toolsUsed": ["getPositions", "analyzeMarket"],
  "nextSteps": [ ... ],
  "feedback": {
    "sentiment": "positive" | "neutral" | "negative",
    "confidence": 0.95,
    "suggestedActions": [ ... ]
  }
}
```

---

## 7. Chat Interface: segment-ai-copilot

### 7.1 Role & Integration

**segment-ai-copilot** is the **PRIMARY INTERFACE** for all user interactions:

- Handles voice + text input
- Manages conversation state
- Calls pauli-hermes-agent for tool execution
- Renders responses in chat UI
- Integrated into all three repos

### 7.2 Integration Pattern

Each repo includes:

```typescript
// In each repo's `/components/ChatInterface.tsx`

import { SegmentChatWidget } from 'segment-ai-copilot';
import { hermesCaller } from '@/lib/hermes-api-client';

export function ChatInterface() {
  const handleUserMessage = async (message: string) => {
    const response = await hermesCaller.executeCommand({
      userId: user.id,
      input: message,
      context: {
        currentRepo: 'cheggie-studios', // varies per repo
        userPreferences: user.prefs,
        conversationHistory: [],
      }
    });

    return {
      text: response.agentResponse,
      actions: response.nextSteps,
      tools: response.toolsUsed,
    };
  };

  return (
    <SegmentChatWidget
      onMessage={handleUserMessage}
      voiceEnabled={true}
      placeholder="Ask Aleksa anything..."
    />
  );
}
```

---

## 8. Supporting Integrations

### 8.1 pauli-blog (30-Day Real Finance Content)

**Role:** Content archive + credibility engine  
**Deployment:** Separate blog repo, linked from all surfaces  
**Content Structure:**

```
pauli-blog/
├── posts/
│   ├── 2026-03-01-trading-psychology.md
│   ├── 2026-03-02-market-analysis.md
│   ├── ... (30 days of real finance content)
│   └── 2026-03-30-wrap-up.md
├── sources/
│   └── FINANCE_SOURCES.md        # Top sources + citations
├── glossary/
│   └── TRADING_GLOSSARY.md       # Key terms
└── _config.yml                   # Blog metadata
```

**Content Rules (EMERALD TABLETS™):**
- NO generic AI content
- TOP sources only (Bloomberg, Reuters, academic papers, successful traders)
- QUOTED sources (verbatim citation)
- CITED (link + author attribution)
- Aleksa's OWN philosophy interwoven (not separate)
- Glossary for trading terms (new users)

**Linked from:**
- cheggie-lifestyle-finance: "Blog" in hero + footer
- cheggie-studios: "Finance Resources" in footer
- CHEGGIE-AI-Trader: "Learning Resources" in sidebar

---

### 8.2 pauli-pope-bot (Existing Trader System)

**Role:** Existing trading system (install + upgrade)  
**Status:** Keep as-is, enhance dashboard  
**Integration Point:** pauli-hermes-agent can call pope-bot tools if needed  

---

### 8.3 StoryToolkitAI (Video Engine)

**Role:** Core video workflow (preserve, do NOT rewrite)  
**Integration:** Wrapped in cheggie-studios `/lib/storykit-wrapper.ts`  
**Principle:** REUSE BEFORE CREATE

---

## 9. Authentication: Shared NextAuth v5

### 9.1 Setup

**Single PostgreSQL session store shared by all three repos:**

```typescript
// lib/auth.ts (identical in all three repos)

import { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Validate against shared PostgreSQL user table
        const user = await prisma.user.findUnique({
          where: { email: credentials?.email }
        });

        if (user && (await verifyPassword(credentials?.password, user.passwordHash))) {
          return { id: user.id, email: user.email, name: user.name };
        }
        return null;
      }
    })
  ],
  session: {
    strategy: "database", // Use PostgreSQL, not JWT
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    }
  },
  pages: {
    signIn: '/login', // Each repo can customize URL
  }
};

// In middleware: Verify token is valid across all repos
// In API routes: Validate session before processing
```

### 9.2 Default Credentials (V1)
- Email: `aleksa@cheggie.studios`
- Password: `cheggie2026` (temporary, upgrade in V2)

---

## 10. Shared Database Schema (Prisma)

**All three repos use IDENTICAL Prisma schema (prisma/ folder shared via git submodule or copied):**

```prisma
// prisma/schema.prisma

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  passwordHash String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  sessions  Session[]
  preferences UserPreferences?
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}

model UserPreferences {
  id        String   @id @default(cuid())
  userId    String   @unique
  theme     String   @default("dark")
  language  String   @default("en")
  tradingRisk String @default("medium")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Story {
  id        String   @id @default(cuid())
  title     String
  content   String
  videoUrl  String?
  userId    String
  status    String   @default("draft")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  transcript Transcript?
}

model Transcript {
  id        String   @id @default(cuid())
  storyId   String   @unique
  text      String
  segments  TranscriptSegment[]
  story     Story    @relation(fields: [storyId], references: [id], onDelete: Cascade)
}

model TranscriptSegment {
  id        String   @id @default(cuid())
  transcriptId String
  startTime Float
  endTime   Float
  text      String
  transcript Transcript @relation(fields: [transcriptId], references: [id], onDelete: Cascade)
}

model Job {
  id        String   @id @default(cuid())
  type      String   // "transcript", "export", "index", etc.
  status    String   @default("pending") // pending, processing, completed, failed
  progress  Int      @default(0)
  result    String?
  error     String?
  metadata  String? // JSON
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 11. Secrets Management: Infisical

**All sensitive data managed via Infisical (pauli-secrets-vault-), NOT hardcoded:**

```env
# .env.local (copied from Infisical at deployment)

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/cheggie

# Authentication
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=http://localhost:3000

# APIs
OPENAI_API_KEY=sk-xxx
CLAUDE_API_KEY=sk-xxx
WHISPER_API_KEY=sk-xxx
BLOOMBERG_API_KEY=xxx
REUTERS_API_KEY=xxx

# Services
HERMES_AGENT_URL=http://localhost:3001/api/agent
STORYKIT_API_URL=http://localhost:3002/api
REDIS_URL=redis://localhost:6379

# Storage
AWS_S3_BUCKET=cheggie-studios
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Monitoring
SENTRY_DSN=https://xxx@sentry.io
SENTRY_ORG=cheggie

# Infisical
INFISICAL_TOKEN=xxx
```

---

## 12. Deployment Architecture

### 12.1 cheggie-lifestyle-finance

**Environment:** Coolify VPS (31.220.58.212) or Vercel  
**Server:** Next.js (no background jobs)  
**Deployment:**
```bash
coolify deploy cheggie-lifestyle-finance \
  --project cheggie-studios \
  --env production
```

### 12.2 cheggie-studios-

**Environment:** Vercel (prj_ynAWuq5XP3aEUkf21I8gi7Vu0btL)  
**Server:** Next.js API routes + BullMQ workers  
**Redis:** Managed (e.g., Upstash)  
**Cron:** Process jobs every 5 minutes  
**Deployment:**
```bash
git push origin main
# → Vercel auto-deploys from git
```

### 12.3 CHEGGIE-AI-Trader

**Environment:** Coolify VPS (31.220.58.212) or Vercel  
**Server:** Next.js (no background jobs)  
**Deployment:**
```bash
coolify deploy CHEGGIE-AI-Trader \
  --project cheggie-studios \
  --env production
```

### 12.4 pauli-hermes-agent

**Environment:** Coolify VPS (31.220.58.212)  
**Server:** FastAPI or Express.js  
**Deployment:**
```bash
coolify deploy pauli-hermes-agent \
  --project cheggie-studios \
  --env production
```

### 12.5 pauli-blog

**Environment:** Static site (Vercel or any CDN)  
**Generator:** Jekyll or Eleventy  
**Deployment:**
```bash
npm run build && git push origin main
# → Static HTML published
```

---

## 13. Loading Screen: Chess Knight 3D Animation

**Location:** cheggie-studios entry point  
**Animation:** Chess knight moving in 3D space (Three.js r128)  
**Duration:** 5 seconds  
**Then:** "Welcome to Cheggie Studios" splash screen  

**Implementation:**

```typescript
// app/loading.tsx (or page.tsx entry)

import { ChessKnightLoader } from '@/components/ChessKnightLoader';

export default function LoadingPage() {
  return <ChessKnightLoader duration={5000} />;
}

// components/ChessKnightLoader.tsx
import * as THREE from 'three';

export function ChessKnightLoader({ duration }: { duration: number }) {
  useEffect(() => {
    // Initialize Three.js scene
    // Load knight 3D model
    // Animate knight movement + rotation
    // After `duration` ms, show "Welcome" splash
    
    setTimeout(() => {
      // Show splash screen or redirect to dashboard
    }, duration);
  }, [duration]);

  return <canvas ref={canvasRef} />;
}
```

---

## 14. Design Governance: EMERALD TABLETS™

All three repos must meet **8.5/10 quality minimum** on 12-axis scoring:

1. **Design Coherence** — Consistent visual language, proper spacing, typography
2. **User Journey** — Clear friction-free paths to key actions (chat, video, trading)
3. **Information Hierarchy** — Primary actions obvious, secondary info accessible
4. **Responsiveness** — Works on desktop, tablet, mobile (Aleksa's brand, not generic)
5. **Accessibility** — WCAG AA compliance (voice commands must work)
6. **Performance** — <2s LCP, <3s FID (chat responsiveness critical)
7. **Brand Authenticity** — Aleksa's voice + philosophy evident (not AI slop)
8. **Feedback Loops** — Chat confirms actions, shows progress (BullMQ status)
9. **Error Handling** — Clear, actionable error messages (not generic 500 errors)
10. **Visual Delight** — Chess knight loading, smooth transitions, micro-interactions
11. **Security Perception** — Secrets vault visible, no hardcoded creds, HTTPS everywhere
12. **Viral Readiness** — Social sharing, metrics dashboard, "share my result" flows

**Audit Process:**
- Design review against each axis
- Score 1-10 per axis
- Average must be ≥8.5
- Document decisions + trade-offs

---

## 15. Next Steps & Execution Roadmap

### Phase 1: Architecture Foundation (Week 1)
- [ ] Set up GitHub repos (or sync existing)
- [ ] Configure shared PostgreSQL database
- [ ] Set up Redis instance
- [ ] Create shared Prisma schema + migrations
- [ ] Establish Infisical vault + secrets
- [ ] Deploy pauli-hermes-agent stub (basic echo)

### Phase 2: Core Infrastructure (Week 1-2)
- [ ] Set up shared NextAuth v5 (all three repos)
- [ ] Create cheggie-lifestyle-finance skeleton
- [ ] Create CHEGGIE-AI-Trader skeleton
- [ ] Enhance cheggie-studios with chat integration
- [ ] Wire circular footer navigation (all three)
- [ ] Deploy Three.js chess knight loader

### Phase 3: Brain Integration (Week 2)
- [ ] Implement pauli-hermes-agent tool registry
- [ ] Build trading tools (getPositions, getCharts, analyzeMarket)
- [ ] Build video tools (transcribeVideo, exportVideo)
- [ ] Connect segment-ai-copilot to hermes API
- [ ] Test end-to-end chat → tool execution

### Phase 4: Content & Polish (Week 2-3)
- [ ] Write cheggie-lifestyle-finance copy (Aleksa's story)
- [ ] Build pauli-blog structure + seed 30-day content
- [ ] Design audit (8.5/10 scoring)
- [ ] Viral readiness UX review
- [ ] User journey mapping

### Phase 5: Deployment & Launch (Week 3)
- [ ] Deploy all three repos to Coolify/Vercel
- [ ] Final integration testing (circular links, auth, chat)
- [ ] Sentry monitoring + alerting
- [ ] Performance optimization (LCP, FID)
- [ ] Go live + monitor

---

## 16. Critical Assumptions & Unknowns

**Confirmed:**
- ✅ Aleksa is real person with real brand
- ✅ Circular linking (not linear hierarchy)
- ✅ Chat-first UI (segment-ai-copilot primary interface)
- ✅ Unified brain (pauli-hermes-agent)
- ✅ Shared auth (NextAuth v5)
- ✅ Real finance content (no AI slop)
- ✅ VPS deployment (31.220.58.212)

**To Clarify:**
- ❓ Aleksa's finance niche (options, stocks, crypto, forex?)
- ❓ Top finance sources (for blog credibility)
- ❓ StoryToolkitAI location (separate repo?)
- ❓ Trading safeguards (read-only, sandbox, live?)
- ❓ Blog content depth (30 posts, 50 posts, continuous?)

---

## 17. Success Criteria

- [ ] All three repos deployed + linked
- [ ] Circular navigation works (footer links tested)
- [ ] Chat interface responsive + voice working
- [ ] hermes-agent executes tools correctly
- [ ] All three repos share auth + database
- [ ] No hardcoded secrets (Infisical only)
- [ ] Design audit ≥8.5/10
- [ ] Performance: <2s LCP, <3s FID
- [ ] Blog live with 30 days of real content
- [ ] VPS stable + monitoring active
- [ ] User journey frictionless (new user → chat in <10s)

---

**Document Status:** Ready for implementation  
**Maintained by:** Development team + Aleksa (editorial approval)  
**Next Review:** Post-Phase 2 (after architecture deployment)
