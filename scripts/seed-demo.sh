#!/usr/bin/env bash
# =============================================================================
# Cheggie Studios — Demo Data Seed Script
#
# Populates the database with realistic demo data for testing, staging,
# and sales demos. Uses the Prisma seed file (prisma/seed.ts).
#
# The seed is idempotent — safe to run multiple times (uses upsert).
#
# Usage:
#   bash scripts/seed-demo.sh [options]
#
# Options:
#   --docker        Run inside the cheggie-app Docker container
#   --env <file>    Path to env file (default: .env.prod or .env)
#   --reset         Drop all demo data first, then re-seed (DESTRUCTIVE)
#   --check         Just verify seed users exist (no changes)
# =============================================================================

set -euo pipefail
IFS=$'\n\t'

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USE_DOCKER=false
ENV_FILE=""
RESET_FIRST=false
CHECK_ONLY=false

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log()     { echo -e "${BLUE}[$(date '+%H:%M:%S')]${RESET} $*"; }
success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${RESET}  $*"; }
error()   { echo -e "${RED}[$(date '+%H:%M:%S')] ✗${RESET}  $*" >&2; }

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --docker)       USE_DOCKER=true; shift ;;
        --env)          ENV_FILE="$2"; shift 2 ;;
        --reset)        RESET_FIRST=true; shift ;;
        --check)        CHECK_ONLY=true; shift ;;
        --help|-h)
            cat <<EOF

${CYAN}${BOLD}Cheggie Studios — Demo Seed${RESET}

Usage: bash scripts/seed-demo.sh [options]

Options:
  --docker        Run inside cheggie-app container
  --env <file>    Path to env file (default: .env.prod or .env)
  --reset         Delete demo data before re-seeding (DESTRUCTIVE)
  --check         Verify seed records exist without modifying data

Demo data includes:
  - admin@cheggiestudios.com (ADMIN role)
  - demo@cheggiestudios.com (USER role, Marko Finance Studio workspace)
  - 3 sample projects with pre-generated transcripts
  - Sample subtitle tracks (SRT + VTT formats)

EOF
            exit 0
            ;;
        *) error "Unknown option: $1"; exit 1 ;;
    esac
done

# ---------------------------------------------------------------------------
# Resolve env file
# ---------------------------------------------------------------------------
if [[ -z "$ENV_FILE" ]]; then
    if [[ -f "${APP_DIR}/.env.prod" ]]; then
        ENV_FILE="${APP_DIR}/.env.prod"
    elif [[ -f "${APP_DIR}/.env" ]]; then
        ENV_FILE="${APP_DIR}/.env"
    else
        error "No .env or .env.prod file found. Create one or use --env <file>."
        exit 1
    fi
fi

log "Using env file: ${ENV_FILE}"

# Load DATABASE_URL from env file
if [[ -z "${DATABASE_URL:-}" ]]; then
    DATABASE_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || echo "")
    if [[ -z "$DATABASE_URL" ]]; then
        error "DATABASE_URL not found in ${ENV_FILE}"
        exit 1
    fi
    export DATABASE_URL
fi

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}${BOLD}"
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║   CHEGGIE STUDIOS — DEMO DATA SEED            ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo -e "${RESET}"
echo -e "  Env  : ${ENV_FILE}"
echo -e "  DB   : ${DATABASE_URL%%@*}@..."
echo ""

# ---------------------------------------------------------------------------
# Check-only mode
# ---------------------------------------------------------------------------
if [[ "$CHECK_ONLY" == true ]]; then
    log "Checking for seed records (read-only)..."

    if [[ "$USE_DOCKER" == true ]]; then
        docker exec cheggie-app sh -c "
            node -e \"
                const { PrismaClient } = require('@prisma/client');
                const prisma = new PrismaClient();
                prisma.user.findMany({
                    where: { email: { in: ['admin@cheggiestudios.com', 'demo@cheggiestudios.com'] } },
                    select: { email: true, role: true, createdAt: true }
                }).then(users => {
                    if (users.length === 0) {
                        console.log('MISSING: No seed users found.');
                        process.exit(1);
                    }
                    users.forEach(u => console.log('FOUND: ' + u.email + ' (' + u.role + ')'));
                    process.exit(0);
                }).catch(e => { console.error(e.message); process.exit(1); })
                .finally(() => prisma.\$disconnect());
            \"
        "
    else
        cd "$APP_DIR"
        node -e "
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            prisma.user.findMany({
                where: { email: { in: ['admin@cheggiestudios.com', 'demo@cheggiestudios.com'] } },
                select: { email: true, role: true, createdAt: true }
            }).then(users => {
                if (users.length === 0) {
                    console.log('MISSING: No seed users found.');
                    process.exit(1);
                }
                users.forEach(u => console.log('FOUND: ' + u.email + ' (' + u.role + ')'));
                process.exit(0);
            }).catch(e => { console.error(e.message); process.exit(1); })
            .finally(() => prisma.\$disconnect());
        " 2>/dev/null
    fi

    exit $?
fi

# ---------------------------------------------------------------------------
# Optional: Reset demo data first
# ---------------------------------------------------------------------------
if [[ "$RESET_FIRST" == true ]]; then
    warn "Resetting demo data (deleting demo users and their data)..."
    echo ""
    read -rp "Type 'RESET' to confirm deletion of demo data: " confirm
    [[ "$confirm" == "RESET" ]] || { log "Aborted."; exit 0; }

    RESET_SCRIPT='
        const { PrismaClient } = require("@prisma/client");
        const prisma = new PrismaClient();

        async function resetDemoData() {
            const demoEmails = ["demo@cheggiestudios.com", "admin@cheggiestudios.com"];

            // Find users
            const users = await prisma.user.findMany({
                where: { email: { in: demoEmails } },
                select: { id: true, email: true }
            });

            if (users.length === 0) {
                console.log("No demo users found — nothing to reset.");
                return;
            }

            const userIds = users.map(u => u.id);
            console.log("Deleting demo data for:", users.map(u => u.email).join(", "));

            // Prisma cascade deletes will handle related records if onDelete: Cascade is set
            // Otherwise, delete in reverse dependency order
            await prisma.user.deleteMany({ where: { id: { in: userIds } } });
            console.log("Demo data deleted.");
        }

        resetDemoData()
            .catch(e => { console.error(e.message); process.exit(1); })
            .finally(() => prisma.$disconnect());
    '

    if [[ "$USE_DOCKER" == true ]]; then
        docker exec cheggie-app node -e "$RESET_SCRIPT"
    else
        cd "$APP_DIR"
        node -e "$RESET_SCRIPT" 2>/dev/null
    fi

    success "Demo data reset."
fi

# ---------------------------------------------------------------------------
# Run the Prisma seed
# ---------------------------------------------------------------------------
log "Running Prisma seed (prisma/seed.ts)..."
echo ""

if [[ "$USE_DOCKER" == true ]]; then
    log "Running inside cheggie-app container..."

    if ! docker ps --format '{{.Names}}' | grep -q "cheggie-app"; then
        error "Container 'cheggie-app' is not running."
        error "Start services first: docker compose up -d"
        exit 1
    fi

    docker exec -e DATABASE_URL="$DATABASE_URL" cheggie-app \
        sh -c "cd /app && npx prisma db seed"
else
    # Run locally
    if ! command -v npx &>/dev/null; then
        error "npx not found. Use --docker to run inside the container."
        exit 1
    fi

    cd "$APP_DIR"

    log "Installing dependencies if needed..."
    if [[ ! -d "node_modules" ]]; then
        if command -v pnpm &>/dev/null; then
            pnpm install --frozen-lockfile
        else
            npm install
        fi
    fi

    log "Generating Prisma client..."
    npx prisma generate 2>/dev/null

    log "Seeding database..."
    DATABASE_URL="$DATABASE_URL" npx prisma db seed
fi

echo ""
success "Demo data seeded successfully!"
echo ""
echo -e "${CYAN}Demo accounts:${RESET}"
echo -e "  Admin : admin@cheggiestudios.com  (role: ADMIN)"
echo -e "  Demo  : demo@cheggiestudios.com   (role: USER, workspace: Marko Finance Studio)"
echo ""
echo -e "${CYAN}Sign in at:${RESET} https://cheggiestudios.com/auth/signin"
echo -e "${YELLOW}Note:${RESET} Demo accounts require OAuth (Google/GitHub) — no password login."
echo ""
