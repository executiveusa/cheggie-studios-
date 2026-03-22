# =============================================================================
# Cheggie Studios — Multi-Stage Dockerfile
# Target: Next.js 15 standalone output + BullMQ workers
#
# Build args:
#   DOCKER_BUILD=true   — enables standalone output in next.config.ts
#
# Stages:
#   1. base        — shared Node.js Alpine base
#   2. deps        — install all dependencies (including devDeps for build)
#   3. builder     — compile Next.js + generate Prisma client + build workers
#   4. runner      — minimal production image (standalone output only)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base
# -----------------------------------------------------------------------------
FROM node:20-alpine AS base

# Install system dependencies needed by:
#   - sharp (image processing — native bindings)
#   - prisma (query engine binary)
#   - openssl (Prisma connection encryption)
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    ca-certificates \
    && update-ca-certificates

# Enable corepack for pnpm
RUN corepack enable pnpm

# -----------------------------------------------------------------------------
# Stage 2: Dependencies
# Install ALL dependencies (including devDeps) needed for the build.
# This layer is cached separately so rebuilds skip re-installing unless
# package files change.
# -----------------------------------------------------------------------------
FROM base AS deps

WORKDIR /app

# Copy lockfile and manifest first for optimal layer caching
COPY package.json pnpm-lock.yaml* ./

# Install dependencies with frozen lockfile for reproducible builds.
# --prefer-offline uses the store cache when available.
RUN pnpm install --frozen-lockfile --prefer-offline

# -----------------------------------------------------------------------------
# Stage 3: Builder
# Compile the application. This stage has access to all devDependencies.
# -----------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy full source tree
COPY . .

# Generate Prisma client for the target platform (linux-musl for Alpine)
RUN pnpm prisma generate

# Build the Next.js application in standalone mode.
# DOCKER_BUILD=true triggers `output: 'standalone'` in next.config.ts.
ENV DOCKER_BUILD=true
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm build

# Compile TypeScript workers to plain JS so the runner image
# doesn't need tsx/ts-node at runtime.
# Workers live at src/workers/*.worker.ts — compiled to workers/*.worker.js
RUN mkdir -p workers && \
    for worker in src/workers/*.worker.ts; do \
      name=$(basename "$worker" .ts); \
      node_modules/.bin/esbuild "$worker" \
        --bundle \
        --platform=node \
        --target=node20 \
        --external:@prisma/client \
        --external:prisma \
        --outfile="workers/${name}.js" \
        2>/dev/null || \
      node_modules/.bin/tsx --noEmit "$worker" 2>/dev/null || \
      echo "Warning: could not compile $worker — skipping (worker may not exist yet)"; \
    done

# -----------------------------------------------------------------------------
# Stage 4: Runner
# Minimal production image. Only contains the standalone Next.js build,
# compiled workers, Prisma client, and uploaded assets directory.
# No source code, no devDependencies, no build tools.
# -----------------------------------------------------------------------------
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy Next.js public assets
COPY --from=builder /app/public ./public

# Copy standalone server bundle (includes embedded node_modules subset)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets (CSS, JS chunks, images — served by Next.js directly)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy compiled BullMQ workers
COPY --from=builder --chown=nextjs:nodejs /app/workers ./workers

# Copy Prisma schema + generated client (needed by workers and migrations)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Create uploads directory (bind-mounted in production, but needs to exist)
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Health check — requires /api/health route to exist in the app
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start the Next.js standalone server
CMD ["node", "server.js"]
