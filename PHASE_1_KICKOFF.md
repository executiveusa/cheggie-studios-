# Cheggie Studios Ecosystem Kickoff — Immediate Actions

**Status:** Ready to execute Phase 1  
**Date:** 2026-03-25  
**Next Step:** Confirm these 3 decisions, then pull trigger

---

## Decision 1: Aleksa's Story & Finance Niche

**Question:** What should we use for landing page copy + blog content?

**Option A (Fast):** Use placeholder copy now, iterate later
- Pro: Unblock all other work immediately
- Con: Design audit may show lower scores until copy is real
- Timeline: Write real copy in Week 2 (Phase 4)
- Recommendation: **GO WITH THIS** — ship skeleton, polish in Week 2

**Option B (Slow):** Wait for real copy before proceeding
- Pro: Final design reflects real voice
- Con: Blocks Phase 4 (design audit, blog content)
- Timeline: Delays launch by 3-4 days
- Recommendation: NOT RECOMMENDED

**Decision:** _____ (A or B)

---

## Decision 2: Finance Blog Sources

**Question:** What are Aleksa's top finance sources / influence?

**Examples (real money makers):**
- Renaissance Technologies
- Citadel
- DE Shaw
- Millennium Management
- Academic papers (SSRN)
- Trading blogs (specific trader names?)
- Crypto if applicable, specific protocols?

**What we need:**
- Top 5-10 sources (we'll cite heavily)
- Trading niche (options? stocks? crypto? forex? algorithmic?)
- Trading philosophy (Aleksa's POV on these markets)

**Timeline:**
- Option A (Fast): Use generic finance blogs for now, upgrade sources in Week 2
- Option B (Slower): Provide source list → write blog in parallel to Phase 1-3

**Decision:** _____ (A or B if A, or list sources if B)

---

## Decision 3: Deployment Location

**Question:** Which VPS/cloud for each repo?

**Current plan:**
- cheggie-lifestyle-finance: Coolify VPS (31.220.58.212) ✅
- CHEGGIE-AI-Trader: Coolify VPS (31.220.58.212) ✅
- cheggie-studios: Vercel (prj_ynAWuq5XP3aEUkf21I8gi7Vu0btL) ✅
- pauli-hermes-agent: VPS or cloud? ← **CLARIFY**
- pauli-blog: Vercel or VPS or other? ← **CLARIFY**

**Questions:**
1. Do you have SSH access to 31.220.58.212 (VPS)? YES / NO / NEED TO VERIFY
2. Is Coolify already installed on that VPS? YES / NO / ?
3. Should hermes-agent run on same VPS or separate server?
4. Should blog be on Vercel (simplest) or custom domain on VPS?

**Decision:** Confirm access + preferred deployment targets

---

## Before Phase 1 Starts: Checklist

### Infrastructure Verification

- [ ] PostgreSQL 16 access confirmed (local or cloud)
  - Connection string: `postgresql://user:pass@host:5432/cheggie`
  - Test: `psql $CONNECTION_STRING -c "SELECT 1"`

- [ ] Redis 7 access confirmed (local or Upstash)
  - Connection string: `redis://host:6379`
  - Test: `redis-cli -u $REDIS_URL ping`

- [ ] VPS access verified (31.220.58.212)
  - SSH key in place: `ssh -i ~/.ssh/id_rsa root@31.220.58.212`
  - Coolify installed? `coolify version`
  - Domain pointing to VPS? Check DNS records

- [ ] Vercel project confirmed
  - Vercel project for cheggie-studios: prj_ynAWuq5XP3aEUkf21I8gi7Vu0btL ✅
  - GitHub personal access token ready
  - Environment variables in Vercel dashboard: DATABASE_URL, REDIS_URL, etc.

- [ ] GitHub organization access
  - Can create 8 repos (or already created?)
  - Teams + permissions set up for collaboration

### Secret Management

- [ ] Infisical vault created: `pauli-secrets-vault-cheggie`
- [ ] Master secrets centralized:
  - DATABASE_URL ✅
  - REDIS_URL ✅
  - OPENAI_API_KEY ✅
  - CLAUDE_API_KEY ✅
  - WHISPER_API_KEY ✅
  - NEXTAUTH_SECRET (generate new)
  - SENTRY_DSN ✅

- [ ] Infisical token for CI/CD generated

### Repository Setup

- [ ] cheggie-lifestyle-finance (create/use existing)
- [ ] CHEGGIE-AI-Trader (create/use existing)
- [ ] pauli-hermes-agent (create/use existing)
- [ ] pauli-blog (create/use existing)
- [ ] pauli-pope-bot (already exists?)
- [ ] segment-ai-copilot (access to repo?)
- [ ] paperclip base framework (access to repo?)
- [ ] StoryToolkitAI (locate + confirm location)

### Approval & Sign-Off

- [ ] Aleksa approves architecture (ECOSYSTEM_ARCHITECTURE.md)
- [ ] Aleksa approves roadmap (EXECUTION_ROADMAP.md)
- [ ] Team understands phases + effort estimates
- [ ] Phase 1 start date confirmed: 2026-03-26

---

## Phase 1 Kick-Off (Immediate)

**Once the above is confirmed:**

### Day 1 (2026-03-26) — 8 hours

**Task:** Database + Infisical setup

```bash
# 1. PostgreSQL setup (local or managed)
createdb cheggie
psql cheggie -c "CREATE SCHEMA public;"

# 2. Initialize shared schema
git clone [cheggie-studios] --branch main
cd cheggie-studios
npx prisma migrate dev --name init

# 3. Add initial user (for login testing)
npx prisma db seed
# → Creates: aleksa@cheggie.studios / cheggie2026

# 4. Infisical vault setup
infisical login
infisical init --name pauli-secrets-vault-cheggie
# → Add all secrets to vault

# 5. Redis setup
redis-server &
redis-cli ping → PONG ✅

# 6. Export secrets from Infisical (for local dev)
infisical export --format dotenv >> .env.local
source .env.local
```

**Deliverable:** DATABASE_URL + REDIS_URL + INFISICAL_TOKEN all working

### Day 2 (2026-03-27) — 8 hours

**Task:** hermes-agent stub + validation

```bash
# 1. Create basic hermes-agent server
mkdir pauli-hermes-agent
cd pauli-hermes-agent

# 2. Initialize Express/FastAPI
npm init -y && npm install express dotenv axios

# 3. Create /api/agent endpoint
cat > server.js << 'EOF'
const express = require('express');
const app = express();

app.use(express.json());

app.post('/api/agent', async (req, res) => {
  const { userId, input, context } = req.body;
  
  console.log(`[Agent] User: ${userId}, Input: ${input}`);
  
  // Echo back for now (stub)
  res.json({
    status: 'success',
    agentResponse: `You said: "${input}"`,
    toolsUsed: [],
    nextSteps: []
  });
});

app.listen(3001, () => console.log('Agent running on :3001'));
EOF

npm start

# 4. Test from cheggie-studios
curl -X POST http://localhost:3001/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test",
    "input": "Hello agent",
    "context": {}
  }' → {"status": "success", ...} ✅

# 5. Deploy stub to VPS
coolify deploy pauli-hermes-agent \
  --project cheggie-studios \
  --env production
```

**Deliverable:** hermes-agent stub responds to requests (from any surface)

---

## Then: Proceed to Phase 2

Once Phase 1 complete, all three repos kick off in parallel:

**Phase 2 Work (Days 3-5):**
- ( Backend ) PostgreSQL + NextAuth across all three
- ( Full-Stack ) cheggie-lifestyle-finance scaffold + auth
- ( Full-Stack ) cheggie-studios + chat interface
- ( Full-Stack ) CHEGGIE-AI-Trader scaffold + auth
- ( AI ) hermes-agent real tool registry

**Critical path:** NextAuth → All other repos depend on it

---

## Open Questions (Fill In)

1. **Aleksa's story/copy?** ✏️ _____________
2. **Finance sources/niche?** ✏️ _____________
3. **VPS SSH access verified?** ✏️ YES / NO
4. **Infisical token ready?** ✏️ YES / NO
5. **GitHub repos created?** ✏️ LIST THEM

---

## Once All Above Complete

**Execute Phase 1 immediately:**

```bash
# 1. Create Beads issues for Phase 1 tasks
beads create --title "Database setup" --effort 4h
beads create --title "Secrets in Infisical" --effort 3h
beads create --title "hermes-agent stub" --effort 5h
beads create --title "Phase 1 validation" --effort 2h

# 2. Start daily standups
# 3. Assign work to engineers
# 4. Track progress in Beads
# 5. Launch Phase 2 once Phase 1 done
```

**Target:** Phase 1 complete by end of 2026-03-27 (2 days)

---

## What Happens If We're Blocked

If SSH/Infisical/DB not ready:

1. **Option A (Recommended):** Start with LOCAL dev setup
   - PostgreSQL local (Docker: `docker run -e POSTGRES_PASSWORD=pass postgres:16`)
   - Redis local (Docker: `docker run -p 6379:6379 redis:7`)
   - Work offline, sync with Infisical later
   - Unblocks all work immediately

2. **Option B:** Wait for infrastructure
   - Risk: Delays Phase 1 by 1-2 days
   - Not recommended

3. **Option C (Hybrid):** Parallel work
   - Phase 1A (local dev): Database + schema setup (can do NOW)
   - Phase 1B (await VPS): Deployment + monitoring (wait for access)
   - Keeps momentum going

---

## Final Confirmation Needed

**Before Phase 1 starts, confirm:**

- [ ] I have the three decisions above answered
- [ ] I have verified database + Redis + VPS access
- [ ] I have Infisical token ready
- [ ] I have told the engineering team to expect work starting 2026-03-26
- [ ] I understand Phase 1 = 2 days, Phase 2 = 3-4 days, Phase 3-5 = 10+ days
- [ ] I'm ready to commit to 2-3 full-time engineers for 3 weeks

**Status:** Ready to go 🚀

---

**Next:** Answer the 3 decisions above, confirm checklist items, then I'll generate Phase 1 detailed task board + Beads issues.
