#!/usr/bin/env bash
# =============================================================================
# Cheggie Studios — Health Check Script
#
# Checks all critical components and outputs a status report.
# Exits 0 if all checks pass, exits 1 if any check fails.
#
# Usage:
#   bash ops/monitoring/health-check.sh [--quiet] [--json]
#
# Options:
#   --quiet   Suppress output, only set exit code
#   --json    Output results as JSON
#   --url     Override the app base URL (default: https://cheggiestudios.com)
# =============================================================================

set -uo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
APP_URL="${APP_URL:-https://cheggiestudios.com}"
APP_DIR="${APP_DIR:-/opt/cheggie-studios}"
TIMEOUT=10          # seconds for HTTP checks
REDIS_TIMEOUT=5     # seconds for Redis ping
DB_TIMEOUT=5        # seconds for Postgres check
QUIET=false
JSON_OUTPUT=false

# ---------------------------------------------------------------------------
# Colors (disabled when not a TTY)
# ---------------------------------------------------------------------------
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    CYAN='\033[0;36m'
    BOLD='\033[1m'
    RESET='\033[0m'
else
    RED='' GREEN='' YELLOW='' CYAN='' BOLD='' RESET=''
fi

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --quiet)  QUIET=true; shift ;;
        --json)   JSON_OUTPUT=true; shift ;;
        --url)    APP_URL="$2"; shift 2 ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log() {
    [[ "$QUIET" == true ]] || echo -e "$*"
}

pass() { log "${GREEN}[PASS]${RESET} $1"; }
fail() { log "${RED}[FAIL]${RESET} $1"; }
warn() { log "${YELLOW}[WARN]${RESET} $1"; }
info() { log "${CYAN}[INFO]${RESET} $1"; }

# Track overall status
OVERALL_STATUS="ok"
declare -A CHECK_RESULTS
declare -A CHECK_DETAILS

mark_fail() {
    local name="$1"
    local detail="${2:-}"
    CHECK_RESULTS["$name"]="fail"
    CHECK_DETAILS["$name"]="${detail}"
    OVERALL_STATUS="fail"
}

mark_pass() {
    local name="$1"
    local detail="${2:-}"
    CHECK_RESULTS["$name"]="pass"
    CHECK_DETAILS["$name"]="${detail}"
}

mark_warn() {
    local name="$1"
    local detail="${2:-}"
    CHECK_RESULTS["$name"]="warn"
    CHECK_DETAILS["$name"]="${detail}"
    # Warnings don't fail the overall check
}

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
log ""
log "${CYAN}${BOLD}Cheggie Studios — Health Check${RESET}"
log "${CYAN}$(date)${RESET}"
log "${CYAN}Target: ${APP_URL}${RESET}"
log ""

# ---------------------------------------------------------------------------
# Check 1: HTTP health endpoint
# ---------------------------------------------------------------------------
log "${BOLD}1. App HTTP health${RESET}"

HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" \
    "${APP_URL}/api/health" 2>/dev/null || echo -e "\n000")

HTTP_BODY=$(echo "$HTTP_RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -n1)

if [[ "$HTTP_CODE" == "200" ]]; then
    pass "App HTTP health: HTTP ${HTTP_CODE}"
    mark_pass "http_health" "HTTP ${HTTP_CODE}"

    # Parse JSON body if available
    if command -v jq &>/dev/null; then
        DB_STATUS=$(echo "$HTTP_BODY" | jq -r '.db // "unknown"' 2>/dev/null || echo "unknown")
        REDIS_STATUS=$(echo "$HTTP_BODY" | jq -r '.redis // "unknown"' 2>/dev/null || echo "unknown")
        APP_VERSION=$(echo "$HTTP_BODY" | jq -r '.version // "unknown"' 2>/dev/null || echo "unknown")
        info "  Response: db=${DB_STATUS}, redis=${REDIS_STATUS}, version=${APP_VERSION}"
    else
        info "  Response: ${HTTP_BODY}"
    fi
elif [[ "$HTTP_CODE" == "000" ]]; then
    fail "App HTTP health: Connection refused (app may be down)"
    mark_fail "http_health" "Connection refused"
else
    fail "App HTTP health: HTTP ${HTTP_CODE}"
    mark_fail "http_health" "HTTP ${HTTP_CODE}: ${HTTP_BODY}"
fi

# ---------------------------------------------------------------------------
# Check 2: HTTPS certificate validity
# ---------------------------------------------------------------------------
log ""
log "${BOLD}2. SSL certificate${RESET}"

HOSTNAME=$(echo "$APP_URL" | sed 's|https://||' | sed 's|/.*||')

if [[ "$APP_URL" == https://* ]]; then
    CERT_INFO=$(echo | timeout "$TIMEOUT" openssl s_client \
        -connect "${HOSTNAME}:443" \
        -servername "$HOSTNAME" \
        2>/dev/null | openssl x509 -noout -dates -subject 2>/dev/null || echo "FAILED")

    if echo "$CERT_INFO" | grep -q "notAfter"; then
        EXPIRY_DATE=$(echo "$CERT_INFO" | grep notAfter | cut -d= -f2)
        EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY_DATE" +%s 2>/dev/null || echo "0")
        NOW_EPOCH=$(date +%s)
        DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

        if [[ $DAYS_LEFT -lt 0 ]]; then
            fail "SSL certificate: EXPIRED (${EXPIRY_DATE})"
            mark_fail "ssl_cert" "Expired: ${EXPIRY_DATE}"
        elif [[ $DAYS_LEFT -lt 14 ]]; then
            warn "SSL certificate: Expires in ${DAYS_LEFT} days — RENEW SOON (${EXPIRY_DATE})"
            mark_warn "ssl_cert" "Expiring in ${DAYS_LEFT} days"
        else
            pass "SSL certificate: Valid, expires in ${DAYS_LEFT} days"
            mark_pass "ssl_cert" "Expires in ${DAYS_LEFT} days"
        fi
    else
        fail "SSL certificate: Could not retrieve certificate info"
        mark_fail "ssl_cert" "Could not connect"
    fi
else
    warn "SSL certificate: Skipping (not an HTTPS URL)"
    mark_warn "ssl_cert" "HTTP URL, no SSL check"
fi

# ---------------------------------------------------------------------------
# Check 3: PostgreSQL connection
# ---------------------------------------------------------------------------
log ""
log "${BOLD}3. PostgreSQL${RESET}"

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "cheggie-postgres"; then
    PG_RESULT=$(timeout "$DB_TIMEOUT" docker exec cheggie-postgres \
        pg_isready -U postgres -d cheggie_studios 2>&1 || echo "FAILED")

    if echo "$PG_RESULT" | grep -q "accepting connections"; then
        pass "PostgreSQL: Accepting connections"
        mark_pass "postgres" "pg_isready OK"

        # Connection count
        CONN_COUNT=$(timeout "$DB_TIMEOUT" docker exec cheggie-postgres \
            psql -U postgres -d cheggie_studios -t -c \
            "SELECT count(*) FROM pg_stat_activity WHERE state != 'idle';" \
            2>/dev/null | tr -d ' \n' || echo "?")
        info "  Active non-idle connections: ${CONN_COUNT}"
    else
        fail "PostgreSQL: Not ready — ${PG_RESULT}"
        mark_fail "postgres" "$PG_RESULT"
    fi
elif command -v psql &>/dev/null && [[ -n "${DATABASE_URL:-}" ]]; then
    # Fallback: use psql directly if Docker not available
    if timeout "$DB_TIMEOUT" psql "$DATABASE_URL" -c "SELECT 1;" &>/dev/null; then
        pass "PostgreSQL: Connected via DATABASE_URL"
        mark_pass "postgres" "Connected"
    else
        fail "PostgreSQL: Connection failed"
        mark_fail "postgres" "Connection refused"
    fi
else
    warn "PostgreSQL: Cannot check (Docker not available, container not found)"
    mark_warn "postgres" "Docker unavailable"
fi

# ---------------------------------------------------------------------------
# Check 4: Redis connection
# ---------------------------------------------------------------------------
log ""
log "${BOLD}4. Redis${RESET}"

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "cheggie-redis"; then
    # Get Redis password if available
    REDIS_PASS=""
    if [[ -f "${APP_DIR}/.env.prod" ]]; then
        REDIS_PASS=$(grep '^REDIS_PASSWORD=' "${APP_DIR}/.env.prod" 2>/dev/null | cut -d= -f2- || echo "")
    fi

    if [[ -n "$REDIS_PASS" ]]; then
        PING_RESULT=$(timeout "$REDIS_TIMEOUT" docker exec cheggie-redis \
            redis-cli -a "$REDIS_PASS" ping 2>/dev/null || echo "FAILED")
    else
        PING_RESULT=$(timeout "$REDIS_TIMEOUT" docker exec cheggie-redis \
            redis-cli ping 2>/dev/null || echo "FAILED")
    fi

    if [[ "$PING_RESULT" == "PONG" ]]; then
        pass "Redis: PONG received"
        mark_pass "redis" "PONG"

        # Memory usage
        REDIS_MEM=$(timeout "$REDIS_TIMEOUT" docker exec cheggie-redis \
            redis-cli -a "$REDIS_PASS" info memory 2>/dev/null \
            | grep "used_memory_human" | cut -d: -f2 | tr -d '\r\n' || echo "?")
        info "  Used memory: ${REDIS_MEM}"
    else
        fail "Redis: No PONG — ${PING_RESULT}"
        mark_fail "redis" "$PING_RESULT"
    fi
else
    warn "Redis: Container 'cheggie-redis' not found"
    mark_warn "redis" "Container not found"
fi

# ---------------------------------------------------------------------------
# Check 5: BullMQ queue depths
# ---------------------------------------------------------------------------
log ""
log "${BOLD}5. BullMQ worker queues${RESET}"

QUEUES=("transcript" "subtitle" "export" "search")
QUEUE_ISSUES=0

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "cheggie-redis"; then
    REDIS_PASS=""
    if [[ -f "${APP_DIR}/.env.prod" ]]; then
        REDIS_PASS=$(grep '^REDIS_PASSWORD=' "${APP_DIR}/.env.prod" 2>/dev/null | cut -d= -f2- || echo "")
    fi

    for queue in "${QUEUES[@]}"; do
        WAIT_COUNT=$(timeout "$REDIS_TIMEOUT" docker exec cheggie-redis \
            redis-cli -a "$REDIS_PASS" LLEN "bull:${queue}:wait" 2>/dev/null | tr -d '\r\n' || echo "?")
        ACTIVE_COUNT=$(timeout "$REDIS_TIMEOUT" docker exec cheggie-redis \
            redis-cli -a "$REDIS_PASS" LLEN "bull:${queue}:active" 2>/dev/null | tr -d '\r\n' || echo "?")
        FAILED_COUNT=$(timeout "$REDIS_TIMEOUT" docker exec cheggie-redis \
            redis-cli -a "$REDIS_PASS" ZCARD "bull:${queue}:failed" 2>/dev/null | tr -d '\r\n' || echo "?")

        STATUS_LINE="queue=${queue} | wait=${WAIT_COUNT} active=${ACTIVE_COUNT} failed=${FAILED_COUNT}"

        if [[ "$FAILED_COUNT" != "?" ]] && [[ "$FAILED_COUNT" -gt 10 ]] 2>/dev/null; then
            warn "  ${STATUS_LINE} — HIGH FAILED COUNT"
            mark_warn "queue_${queue}" "${STATUS_LINE}"
            QUEUE_ISSUES=$((QUEUE_ISSUES + 1))
        else
            info "  ${STATUS_LINE}"
            mark_pass "queue_${queue}" "${STATUS_LINE}"
        fi
    done

    if [[ $QUEUE_ISSUES -eq 0 ]]; then
        pass "BullMQ queues: All within normal range"
    else
        warn "BullMQ queues: ${QUEUE_ISSUES} queue(s) have elevated failure counts"
    fi
else
    warn "BullMQ queues: Redis unavailable — cannot check queues"
    for queue in "${QUEUES[@]}"; do
        mark_warn "queue_${queue}" "Redis unavailable"
    done
fi

# ---------------------------------------------------------------------------
# Check 6: Docker container health status
# ---------------------------------------------------------------------------
log ""
log "${BOLD}6. Docker containers${RESET}"

CONTAINERS=(
    "cheggie-app"
    "cheggie-postgres"
    "cheggie-redis"
    "cheggie-nginx"
    "cheggie-worker-transcript"
    "cheggie-worker-subtitle"
    "cheggie-worker-export"
    "cheggie-worker-search"
)

CONTAINER_ISSUES=0

for container in "${CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${container}$"; then
        STATUS=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "unknown")
        HEALTH=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$container" 2>/dev/null || echo "unknown")

        if [[ "$STATUS" == "running" ]]; then
            if [[ "$HEALTH" == "healthy" ]] || [[ "$HEALTH" == "no-healthcheck" ]]; then
                pass "  ${container}: ${STATUS} (${HEALTH})"
                mark_pass "container_${container}" "${STATUS}/${HEALTH}"
            elif [[ "$HEALTH" == "starting" ]]; then
                warn "  ${container}: ${STATUS} (${HEALTH} — still warming up)"
                mark_warn "container_${container}" "${STATUS}/${HEALTH}"
            else
                fail "  ${container}: ${STATUS} (${HEALTH})"
                mark_fail "container_${container}" "${STATUS}/${HEALTH}"
                CONTAINER_ISSUES=$((CONTAINER_ISSUES + 1))
            fi
        else
            fail "  ${container}: ${STATUS} (not running)"
            mark_fail "container_${container}" "${STATUS}"
            CONTAINER_ISSUES=$((CONTAINER_ISSUES + 1))
        fi
    else
        warn "  ${container}: Not found"
        mark_warn "container_${container}" "not found"
    fi
done

# ---------------------------------------------------------------------------
# Check 7: Disk space
# ---------------------------------------------------------------------------
log ""
log "${BOLD}7. Disk space${RESET}"

DISK_USAGE=$(df -h / 2>/dev/null | awk 'NR==2 {print $5}' | tr -d '%')
DISK_INFO=$(df -h / 2>/dev/null | awk 'NR==2 {printf "%s used / %s total (%s%%)", $3, $2, $5}')

if [[ -n "$DISK_USAGE" ]]; then
    if [[ "$DISK_USAGE" -ge 90 ]]; then
        fail "Disk space: CRITICAL — ${DISK_INFO}"
        mark_fail "disk" "${DISK_INFO}"
    elif [[ "$DISK_USAGE" -ge 75 ]]; then
        warn "Disk space: WARNING — ${DISK_INFO}"
        mark_warn "disk" "${DISK_INFO}"
    else
        pass "Disk space: ${DISK_INFO}"
        mark_pass "disk" "${DISK_INFO}"
    fi

    # Check uploads directory specifically
    if [[ -d "${APP_DIR}/uploads" ]]; then
        UPLOAD_SIZE=$(du -sh "${APP_DIR}/uploads" 2>/dev/null | cut -f1 || echo "?")
        info "  Uploads directory: ${UPLOAD_SIZE}"
    fi
else
    warn "Disk space: Could not determine"
    mark_warn "disk" "unavailable"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
log ""
log "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "HEALTH CHECK SUMMARY"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

for check in "${!CHECK_RESULTS[@]}"; do
    result="${CHECK_RESULTS[$check]}"
    case "$result" in
        pass) PASS_COUNT=$((PASS_COUNT + 1)) ;;
        fail) FAIL_COUNT=$((FAIL_COUNT + 1)) ;;
        warn) WARN_COUNT=$((WARN_COUNT + 1)) ;;
    esac
done

if [[ "$JSON_OUTPUT" == true ]]; then
    # JSON output for machine consumption
    echo "{"
    echo "  \"status\": \"${OVERALL_STATUS}\","
    echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    echo "  \"url\": \"${APP_URL}\","
    echo "  \"summary\": {"
    echo "    \"pass\": ${PASS_COUNT},"
    echo "    \"fail\": ${FAIL_COUNT},"
    echo "    \"warn\": ${WARN_COUNT}"
    echo "  },"
    echo "  \"checks\": {"
    first=true
    for check in "${!CHECK_RESULTS[@]}"; do
        [[ "$first" == true ]] || echo ","
        first=false
        printf "    \"%s\": {\"status\": \"%s\", \"detail\": \"%s\"}" \
            "$check" "${CHECK_RESULTS[$check]}" "${CHECK_DETAILS[$check]}"
    done
    echo ""
    echo "  }"
    echo "}"
else
    log ""
    log "  Pass  : ${GREEN}${PASS_COUNT}${RESET}"
    log "  Warn  : ${YELLOW}${WARN_COUNT}${RESET}"
    log "  Fail  : ${RED}${FAIL_COUNT}${RESET}"
    log ""

    if [[ "$OVERALL_STATUS" == "ok" ]]; then
        log "${GREEN}${BOLD}Overall: HEALTHY${RESET}"
    else
        log "${RED}${BOLD}Overall: UNHEALTHY (${FAIL_COUNT} check(s) failed)${RESET}"
    fi
    log ""
fi

# Exit code
if [[ "$OVERALL_STATUS" == "ok" ]]; then
    exit 0
else
    exit 1
fi
