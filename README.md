# Cheggie Studios

**Pretvori snimak u priču brže.**
*Turn your footage into a story, faster.*

Cheggie Studios is a Serbian-first, AI-assisted video editing and content workflow platform built for creators. Upload raw footage, get automatic transcriptions, generate subtitles, search across your entire video library with natural language, and export polished cuts — all in one place.

---

## Sadržaj / Contents

- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Development](#development)
- [Database](#database)
- [Workers](#workers)
- [Testing](#testing)
- [Deployment](#deployment)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)

---

## Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0 (`npm install -g pnpm`)
- **PostgreSQL** >= 15
- **Redis** >= 7
- **Docker** (optional, for local services)

### 1. Clone and install

```bash
git clone https://github.com/cheggie-studios/cheggie-studios.git
cd cheggie-studios
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your actual values
```

At minimum, set:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `OPENAI_API_KEY` — for AI features

### 3. Set up the database

```bash
pnpm db:migrate    # Run migrations
pnpm db:seed       # Seed initial data (optional)
```

### 4. Start development

```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Environment Setup

### Local services with Docker

Start PostgreSQL and Redis with a single command:

```bash
docker compose up -d postgres redis
```

Or manually:

```bash
# PostgreSQL
docker run -d --name cheggie-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=cheggie_studios \
  -p 5432:5432 postgres:16-alpine

# Redis
docker run -d --name cheggie-redis \
  -p 6379:6379 redis:7-alpine
```

### Whisper (self-hosted transcription)

For production-quality transcriptions without API costs:

```bash
# Using faster-whisper server
docker run -d --name cheggie-whisper \
  -p 8000:8000 \
  --gpus all \
  fedirz/faster-whisper-server:latest-cuda
```

Set `WHISPER_API_URL=http://localhost:8000` and `WHISPER_MODEL=large-v3` in `.env.local`.

---

## Development

```bash
pnpm dev            # Start Next.js dev server with Turbopack
pnpm lint           # Lint with ESLint
pnpm lint:fix       # Auto-fix lint issues
pnpm type-check     # TypeScript type checking (no emit)
pnpm format         # Format with Prettier
pnpm format:check   # Check formatting without writing
```

### Prisma Studio (database GUI)

```bash
pnpm db:studio      # Opens at http://localhost:5555
```

---

## Database

```bash
pnpm db:migrate         # Create and run a new migration (dev)
pnpm db:migrate:deploy  # Run pending migrations (production)
pnpm db:push            # Push schema without migration (prototype only)
pnpm db:seed            # Seed development data
pnpm db:reset           # Reset and reseed (DESTRUCTIVE — dev only)
pnpm db:generate        # Regenerate Prisma client
pnpm db:studio          # Open Prisma Studio GUI
```

---

## Workers

Background job workers process video transcription, subtitle generation, export rendering, and search indexing via BullMQ queues backed by Redis.

```bash
pnpm worker:transcript  # Transcription worker (Whisper)
pnpm worker:subtitle    # Subtitle formatting + translation worker
pnpm worker:export      # Video export and rendering worker
pnpm worker:search      # Search index update worker
pnpm worker:all         # Start all workers concurrently
```

Workers are stateless and can be scaled horizontally. In production, run them as separate processes or containers.

---

## Testing

```bash
pnpm test           # Run unit/integration tests with Vitest
pnpm test:ui        # Open Vitest UI
pnpm test:coverage  # Run tests with coverage report
```

---

## Deployment

### Vercel (recommended for the web app)

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel --prod
```

Set all environment variables from `.env.example` in your Vercel project settings. Workers should be deployed separately (see below).

### Docker (web app + workers)

```bash
# Build the image
DOCKER_BUILD=true docker build -t cheggie-studios .

# Run the web app
docker run -p 3000:3000 \
  --env-file .env.production \
  cheggie-studios

# Run a worker (example: transcript worker)
docker run \
  --env-file .env.production \
  cheggie-studios pnpm worker:transcript
```

### Production checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set `NEXTAUTH_SECRET` to a cryptographically random value
- [ ] Configure `DATABASE_URL` to point to a managed PostgreSQL instance (e.g., Neon, Supabase, RDS)
- [ ] Configure `REDIS_URL` to point to a managed Redis instance (e.g., Upstash, ElastiCache)
- [ ] Set `STORAGE_ADAPTER=s3` and configure S3/R2 credentials
- [ ] Set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` for error monitoring
- [ ] Configure OAuth provider credentials (`AUTH_GOOGLE_ID`, `AUTH_GITHUB_ID`, etc.)
- [ ] Set `NEXTAUTH_URL` to your production domain
- [ ] Set `NEXT_PUBLIC_APP_URL` to your production domain

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Radix UI |
| Auth | NextAuth.js v5 (auth@5 beta) |
| Database | PostgreSQL 16 + Prisma ORM |
| Queues | BullMQ + Redis |
| AI / Transcription | OpenAI Whisper (self-hosted or API) |
| Error Monitoring | Sentry |
| Validation | Zod |
| Forms | React Hook Form + @hookform/resolvers |
| Animations | Framer Motion |
| Package Manager | pnpm |
| Testing | Vitest + Testing Library |

---

## Project Structure

```
cheggie-studios/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Prisma migrations (committed)
│   └── seed.ts                # Development seed data
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # Auth pages (login, register)
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── api/               # API route handlers
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   └── ui/                # shadcn/ui primitives
│   ├── features/              # Feature-sliced modules
│   │   ├── projects/          # Project management
│   │   ├── transcription/     # Transcription feature
│   │   ├── subtitles/         # Subtitle editor
│   │   ├── search/            # Video library search
│   │   └── export/            # Export pipeline
│   ├── lib/
│   │   ├── auth.ts            # NextAuth config
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── redis.ts           # Redis/BullMQ client
│   │   ├── storage.ts         # Storage adapter (local/S3)
│   │   └── env.ts             # Validated env vars (@t3-oss/env-nextjs)
│   ├── workers/               # BullMQ worker processes
│   │   ├── transcript.worker.ts
│   │   ├── subtitle.worker.ts
│   │   ├── export.worker.ts
│   │   └── search.worker.ts
│   ├── hooks/                 # React hooks
│   ├── types/                 # Shared TypeScript types
│   └── config/                # App-level constants
├── .env.example               # Environment variable template
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── postcss.config.js          # PostCSS configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

---

## O projektu / About

Cheggie Studios je platforma zamišljena za srpske kreatore sadržaja koji žele brži, pametniji workflow za video produkciju. Platforma integriše automatsku transkripciju, generisanje titlova, pretragu video arhive i export pipeline — sve u jednom mestu.

*Cheggie Studios is a platform designed for Serbian content creators who want a faster, smarter workflow for video production. It integrates automatic transcription, subtitle generation, video archive search, and export pipeline — all in one place.*

---

Licensed under the MIT License. See `LICENSE` for details.
