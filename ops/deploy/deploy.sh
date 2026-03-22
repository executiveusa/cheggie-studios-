#!/usr/bin/env bash
# =============================================================================
# Cheggie Studios — Production Deployment Script
# Target: Hostinger VPS (Ubuntu 22.04+), Docker Compose
#
# Usage:
#   ./ops/deploy/deploy.sh [--branch <branch>] [--skip-build] [--no-migrate]
#
# Options:
#   --branch <name>   Git branch to deploy (default: main)
#   --skip-build      Skip Docker image rebuild (redeploy existing image)
#   --no-migrate      Skip database migrations
#   --rollback        Roll back to the previous Docker Compose state
#
# Environment:
#   APP_DIR           Absolute path to the app directory (default: /opt/cheggie-studios)
#   COMPOSE_FILE      Docker Compose files to use (default: prod stack)
# =============================================================================

set -euo pipefail
IFS=$'\n\t'

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
APP_DIR="${APP_DIR:-/opt/cheggie-studios}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:- -f docker-compose.yml -f docker-compose.prod.yml}"
HEALTH_URL="https://cheggiestudios.com/api/health"
HEALTH_RETRIES=10
HEALTH_WAIT=5       # seconds between retries
BACKUP_DIR="${APP_DIR}/backups"
SKIP_BUILD=false
NO_MIGRATE=false
ROLLBACK=false

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

# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------
log()     { echo -e "${BLUE}[$(date '+%H:%M:%S')]${RESET} $*"; }
success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${RESET}  $*"; }
error()   { echo -e "${RED}[$(date '+%H:%M:%S')] ✗${RESET}  $*" >&2; }
step()    { echo -e "\n${CYAN}${BOLD}━━━ $* ━━━${RESET}"; }

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --branch)    BRANCH="$2"; shift 2 ;;
        --skip-build) SKIP_BUILD=true; shift ;;
        --no-migrate) NO_MIGRATE=true; shift ;;
        --rollback)  ROLLBACK=true; shift ;;
        *) error "Unknown argument: $1"; exit 1 ;;
    esac
done

# ---------------------------------------------------------------------------
# Require root or docker group membership
# ---------------------------------------------------------------------------
if ! groups | grep -qE '(docker|root)'; then
    error "You must be in the 'docker' group or run as root."
    exit 1
fi

# ---------------------------------------------------------------------------
# Validate working directory
# ---------------------------------------------------------------------------
if [[ ! -d "$APP_DIR" ]]; then
    error "App directory not found: $APP_DIR"
    error "Run setup-vps.sh first, or set APP_DIR."
    exit 1
fi

cd "$APP_DIR"

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}${BOLD}"
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║     CHEGGIE STUDIOS — DEPLOYMENT SCRIPT       ║"
echo "  ║     Branch: ${BRANCH}"
echo "  ╚═══════════════════════════════════════════════╝"
echo -e "${RESET}"
echo -e "  App Dir : ${APP_DIR}"
echo -e "  Time    : $(date)"
echo ""

# ---------------------------------------------------------------------------
# Rollback path
# ---------------------------------------------------------------------------
if [[ "$ROLLBACK" == true ]]; then
    step "ROLLBACK"

    if [[ ! -f "${APP_DIR}/.deploy_backup_tag" ]]; then
        error "No backup tag found at ${APP_DIR}/.deploy_backup_tag — cannot rollback."
        exit 1
    fi

    BACKUP_TAG=$(cat "${APP_DIR}/.deploy_backup_tag")
    warn "Rolling back to: ${BACKUP_TAG}"

    # Restore the previous docker-compose state
    git checkout "${BACKUP_TAG}" -- docker-compose.yml docker-compose.prod.yml

    log "Restarting services with previous configuration..."
    docker compose $COMPOSE_FILE up -d --no-build

    success "Rollback complete. Running tag: ${BACKUP_TAG}"
    exit 0
fi

# ---------------------------------------------------------------------------
# Save current commit as rollback point
# ---------------------------------------------------------------------------
CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "$CURRENT_COMMIT" > "${APP_DIR}/.deploy_backup_tag"
log "Saved rollback tag: ${CURRENT_COMMIT}"

# ---------------------------------------------------------------------------
# Trap: on unexpected failure, attempt rollback
# ---------------------------------------------------------------------------
DEPLOY_FAILED=false

cleanup() {
    if [[ "$DEPLOY_FAILED" == true ]]; then
        echo ""
        error "Deployment failed! Attempting automatic rollback..."

        BACKUP_TAG=$(cat "${APP_DIR}/.deploy_backup_tag" 2>/dev/null || echo "")
        if [[ -n "$BACKUP_TAG" ]] && git rev-parse "$BACKUP_TAG" &>/dev/null; then
            git checkout "$BACKUP_TAG" -- . 2>/dev/null || true
            docker compose $COMPOSE_FILE up -d --no-build 2>/dev/null || true
            warn "Rolled back to ${BACKUP_TAG}. Investigate and redeploy when ready."
        else
            error "Could not rollback — please manually restore the previous state."
        fi
    fi
}

trap 'DEPLOY_FAILED=true; cleanup' ERR

# ---------------------------------------------------------------------------
# Step 1: Pull latest code
# ---------------------------------------------------------------------------
step "1/6 — PULL CODE"

log "Fetching from origin/${BRANCH}..."
git fetch origin "$BRANCH" 2>&1

log "Switching to branch: ${BRANCH}"
git checkout "$BRANCH" 2>&1

log "Pulling latest commits..."
git pull origin "$BRANCH" 2>&1

NEW_COMMIT=$(git rev-parse --short HEAD)
success "Now at commit: ${NEW_COMMIT}"

# Show what changed
log "Changes since last deploy:"
git log --oneline "${CURRENT_COMMIT}..HEAD" 2>/dev/null | head -10 || true

# ---------------------------------------------------------------------------
# Step 2: Validate required files
# ---------------------------------------------------------------------------
step "2/6 — VALIDATE"

if [[ ! -f ".env.prod" ]]; then
    error ".env.prod not found in ${APP_DIR}"
    error "Copy .env.example to .env.prod and fill in all values."
    exit 1
fi

REQUIRED_VARS=(
    "DATABASE_URL"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
    "REDIS_URL"
    "OPENAI_API_KEY"
)

log "Checking required env vars in .env.prod..."
MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -qE "^${var}=.+" .env.prod 2>/dev/null; then
        MISSING+=("$var")
    fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
    error "Missing required env vars in .env.prod:"
    for v in "${MISSING[@]}"; do
        error "  - $v"
    done
    exit 1
fi

success "All required env vars present."

# ---------------------------------------------------------------------------
# Step 3: Create backup of database
# ---------------------------------------------------------------------------
step "3/6 — DATABASE BACKUP"

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="${BACKUP_DIR}/db_backup_$(date +%Y%m%d_%H%M%S).sql.gz"

log "Creating PostgreSQL backup → ${BACKUP_FILE}"

if docker ps --format '{{.Names}}' | grep -q "cheggie-postgres"; then
    docker exec cheggie-postgres sh -c \
        "pg_dump -U \$POSTGRES_USER \$POSTGRES_DB" 2>/dev/null \
        | gzip > "$BACKUP_FILE" \
        && success "Database backup saved: $(du -sh "$BACKUP_FILE" | cut -f1)" \
        || warn "Database backup failed — proceeding anyway (DB may be empty)"
else
    warn "Postgres container not running — skipping backup."
fi

# Prune backups older than 7 days
find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
log "Old backups pruned (kept last 7 days)."

# ---------------------------------------------------------------------------
# Step 4: Build Docker images
# ---------------------------------------------------------------------------
step "4/6 — BUILD"

if [[ "$SKIP_BUILD" == true ]]; then
    warn "--skip-build: Skipping Docker image rebuild."
else
    log "Building Docker images (this may take a few minutes)..."

    # Build with progress output, pulling fresh base images
    docker compose $COMPOSE_FILE build \
        --pull \
        --no-cache \
        app worker-transcript worker-subtitle worker-export worker-search \
        2>&1

    success "Docker images built successfully."
fi

# ---------------------------------------------------------------------------
# Step 5: Run database migrations
# ---------------------------------------------------------------------------
step "5/6 — MIGRATIONS"

if [[ "$NO_MIGRATE" == true ]]; then
    warn "--no-migrate: Skipping database migrations."
else
    log "Running Prisma migrations (migrate deploy)..."

    # Run migrations in a temporary container (not the running app)
    docker compose $COMPOSE_FILE run --rm \
        -e DATABASE_URL="$(grep '^DATABASE_URL=' .env.prod | cut -d= -f2-)" \
        app \
        sh -c "cd /app && node -e \"const { execSync } = require('child_process'); execSync('npx prisma migrate deploy', { stdio: 'inherit' });\"" \
        2>&1 \
    || {
        # Fallback: run migrations via standalone prisma binary
        docker compose $COMPOSE_FILE run --rm \
            --env-file .env.prod \
            app \
            sh -c "npx prisma migrate deploy" \
            2>&1
    }

    success "Migrations applied."
fi

# ---------------------------------------------------------------------------
# Step 6: Deploy (rolling restart)
# ---------------------------------------------------------------------------
step "6/6 — DEPLOY"

log "Starting services with rolling restart..."

# Bring up infrastructure services first (postgres, redis)
docker compose $COMPOSE_FILE up -d postgres redis
log "Waiting for postgres and redis to be healthy..."
sleep 5

# Bring up application and workers
docker compose $COMPOSE_FILE up -d --remove-orphans

success "Services started. Verifying health..."

# ---------------------------------------------------------------------------
# Health check with retries
# ---------------------------------------------------------------------------
log "Waiting for app to pass health check at ${HEALTH_URL}..."

ATTEMPT=0
while [[ $ATTEMPT -lt $HEALTH_RETRIES ]]; do
    ATTEMPT=$((ATTEMPT + 1))
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "000")

    if [[ "$HTTP_CODE" == "200" ]]; then
        success "Health check passed (HTTP ${HTTP_CODE}) on attempt ${ATTEMPT}."
        break
    fi

    if [[ $ATTEMPT -lt $HEALTH_RETRIES ]]; then
        warn "Attempt ${ATTEMPT}/${HEALTH_RETRIES}: HTTP ${HTTP_CODE} — retrying in ${HEALTH_WAIT}s..."
        sleep "$HEALTH_WAIT"
    else
        error "Health check failed after ${HEALTH_RETRIES} attempts (last HTTP: ${HTTP_CODE})."
        error "Check logs: docker compose logs --tail=50 app"
        DEPLOY_FAILED=true
        exit 1
    fi
done

# ---------------------------------------------------------------------------
# Post-deploy summary
# ---------------------------------------------------------------------------
DEPLOY_FAILED=false  # Clear the trap flag — deployment succeeded

echo ""
echo -e "${GREEN}${BOLD}"
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║   DEPLOYMENT SUCCESSFUL                       ║"
echo -e "  ║   Commit: ${NEW_COMMIT}                              ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo -e "${RESET}"

log "Running containers:"
docker compose $COMPOSE_FILE ps 2>/dev/null || docker ps --filter "name=cheggie"

echo ""
success "Cheggie Studios is live at https://cheggiestudios.com"
echo ""
