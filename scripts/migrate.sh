#!/usr/bin/env bash
# =============================================================================
# Cheggie Studios — Database Migration Helper
#
# Wraps Prisma migrate commands for both development and production.
#
# Usage:
#   bash scripts/migrate.sh [command] [options]
#
# Commands:
#   dev      Run prisma migrate dev (creates migration files, applies, generates client)
#   prod     Run prisma migrate deploy (applies pending migrations, no file creation)
#   status   Show pending migrations
#   reset    Reset DB and re-run all migrations (DEV ONLY — DESTRUCTIVE)
#   create   Create a new empty migration file
#   generate Regenerate Prisma client (after schema change without migrating)
#
# Options:
#   --name <name>    Migration name (required for 'create' command)
#   --docker         Run inside the running Docker container (cheggie-app)
#   --dry-run        For prod: show what would run without applying
# =============================================================================

set -euo pipefail
IFS=$'\n\t'

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMMAND="${1:-help}"
USE_DOCKER=false
DRY_RUN=false
MIGRATION_NAME=""
ENV_FILE="${APP_DIR}/.env.prod"

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
# Usage
# ---------------------------------------------------------------------------
usage() {
    cat <<EOF

${CYAN}${BOLD}Cheggie Studios — Migration Helper${RESET}

${BOLD}Usage:${RESET}
  bash scripts/migrate.sh <command> [options]

${BOLD}Commands:${RESET}
  dev               Create + apply migration (development only)
  prod              Apply pending migrations (production-safe)
  status            Show migration status
  reset             Reset DB and re-run all migrations (DEV ONLY)
  create            Create new empty migration (requires --name)
  generate          Regenerate Prisma client only

${BOLD}Options:${RESET}
  --name <name>     Migration name (for 'create' command)
  --docker          Run inside cheggie-app container
  --dry-run         Show pending migrations without applying (prod only)

${BOLD}Examples:${RESET}
  # Development — create and apply a new migration
  bash scripts/migrate.sh dev

  # Development — create an empty named migration
  bash scripts/migrate.sh create --name add_subtitle_style_column

  # Production — apply all pending migrations
  bash scripts/migrate.sh prod

  # Production — run inside Docker container
  bash scripts/migrate.sh prod --docker

  # Check status
  bash scripts/migrate.sh status

EOF
    exit 0
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
shift 1 || true

while [[ $# -gt 0 ]]; do
    case "$1" in
        --name)    MIGRATION_NAME="$2"; shift 2 ;;
        --docker)  USE_DOCKER=true; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        --help|-h) usage ;;
        *) error "Unknown option: $1"; usage ;;
    esac
done

# ---------------------------------------------------------------------------
# Resolve DATABASE_URL
# ---------------------------------------------------------------------------
resolve_db_url() {
    if [[ -n "${DATABASE_URL:-}" ]]; then
        echo "$DATABASE_URL"
        return
    fi

    # Try .env.prod first, then .env
    for env_file in "${APP_DIR}/.env.prod" "${APP_DIR}/.env"; do
        if [[ -f "$env_file" ]]; then
            local url
            url=$(grep '^DATABASE_URL=' "$env_file" 2>/dev/null | cut -d= -f2- || echo "")
            if [[ -n "$url" ]]; then
                echo "$url"
                return
            fi
        fi
    done

    error "DATABASE_URL not found in environment or .env/.env.prod"
    exit 1
}

# ---------------------------------------------------------------------------
# Run prisma via Docker or locally
# ---------------------------------------------------------------------------
run_prisma() {
    local prisma_args="$*"

    if [[ "$USE_DOCKER" == true ]]; then
        log "Running Prisma inside cheggie-app container..."

        if ! docker ps --format '{{.Names}}' | grep -q "cheggie-app"; then
            error "Container 'cheggie-app' is not running."
            error "Start it with: docker compose up -d app"
            exit 1
        fi

        docker exec cheggie-app sh -c "npx prisma $prisma_args"
    else
        # Run locally — check if prisma is available
        if ! command -v npx &>/dev/null; then
            error "npx not found. Install Node.js or use --docker to run inside the container."
            exit 1
        fi

        cd "$APP_DIR"

        local db_url
        db_url=$(resolve_db_url)

        DATABASE_URL="$db_url" npx prisma $prisma_args
    fi
}

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------
case "$COMMAND" in

    # -----------------------------------------------------------------------
    dev)
        warn "Running 'prisma migrate dev' — this creates migration files."
        warn "Only use this in DEVELOPMENT environments."
        echo ""

        if [[ "$USE_DOCKER" == false ]] && [[ "${NODE_ENV:-development}" == "production" ]]; then
            error "NODE_ENV=production detected. Use 'migrate prod' for production."
            exit 1
        fi

        read -rp "Continue? [y/N] " confirm
        [[ "$confirm" =~ ^[Yy]$ ]] || { log "Aborted."; exit 0; }

        log "Running Prisma migrate dev..."
        run_prisma "migrate dev"
        success "Development migration complete. Prisma client regenerated."
        ;;

    # -----------------------------------------------------------------------
    prod)
        log "Running 'prisma migrate deploy' (production-safe)..."
        log "This only applies pending migrations — never creates new ones."
        echo ""

        if [[ "$DRY_RUN" == true ]]; then
            log "[DRY RUN] Checking migration status (not applying)..."
            run_prisma "migrate status"
            exit 0
        fi

        # Warn if running locally against a production URL
        DB_URL=$(resolve_db_url 2>/dev/null || echo "")
        if echo "$DB_URL" | grep -qv "localhost\|127.0.0.1"; then
            warn "Applying migrations to a REMOTE database: ${DB_URL%%@*}@..."
            echo ""
            read -rp "Confirm? [y/N] " confirm
            [[ "$confirm" =~ ^[Yy]$ ]] || { log "Aborted."; exit 0; }
        fi

        log "Applying pending migrations..."
        run_prisma "migrate deploy"
        success "Production migrations applied successfully."
        ;;

    # -----------------------------------------------------------------------
    status)
        log "Checking Prisma migration status..."
        echo ""
        run_prisma "migrate status"
        ;;

    # -----------------------------------------------------------------------
    reset)
        error "WARNING: 'migrate reset' will DROP and recreate the database."
        error "ALL DATA WILL BE LOST. This is for development only."
        echo ""

        if [[ "${NODE_ENV:-development}" == "production" ]]; then
            error "Refusing to reset a production database."
            exit 1
        fi

        read -rp "Type 'RESET' to confirm: " confirm
        [[ "$confirm" == "RESET" ]] || { log "Aborted."; exit 0; }

        log "Resetting database..."
        run_prisma "migrate reset --force"
        success "Database reset and all migrations re-applied."
        ;;

    # -----------------------------------------------------------------------
    create)
        if [[ -z "$MIGRATION_NAME" ]]; then
            error "Migration name required. Use: bash scripts/migrate.sh create --name <name>"
            exit 1
        fi

        # Sanitize name: lowercase, underscores only
        SAFE_NAME=$(echo "$MIGRATION_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g')
        log "Creating empty migration: ${SAFE_NAME}"

        run_prisma "migrate dev --create-only --name ${SAFE_NAME}"
        success "Empty migration created. Edit it in prisma/migrations/, then run 'migrate dev' to apply."
        ;;

    # -----------------------------------------------------------------------
    generate)
        log "Regenerating Prisma client..."
        run_prisma "generate"
        success "Prisma client regenerated."
        ;;

    # -----------------------------------------------------------------------
    help|--help|-h)
        usage
        ;;

    # -----------------------------------------------------------------------
    *)
        error "Unknown command: ${COMMAND}"
        usage
        ;;

esac
