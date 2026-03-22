# Cheggie Studios — Incident Response Runbook

**Last updated:** 2026-03-22
**App:** cheggiestudios.com
**Server:** Hostinger VPS (Ubuntu 22.04)
**Stack:** Next.js 15 + PostgreSQL 16 + Redis 7 + BullMQ workers

---

## Quick Reference

| Container | Name |
|---|---|
| Next.js app | `cheggie-app` |
| PostgreSQL | `cheggie-postgres` |
| Redis | `cheggie-redis` |
| Transcript worker | `cheggie-worker-transcript` |
| Subtitle worker | `cheggie-worker-subtitle` |
| Export worker | `cheggie-worker-export` |
| Search worker | `cheggie-worker-search` |
| NGINX | `cheggie-nginx` |

```bash
# Shorthand aliases (add to ~/.bashrc on VPS)
alias dc='docker compose -f /opt/cheggie-studios/docker-compose.yml -f /opt/cheggie-studios/docker-compose.prod.yml'
alias dclogs='dc logs --tail=100 -f'
```

---

## 1. Check Worker Status

### Are all workers running?
```bash
docker ps --filter "name=cheggie" --format "table {{.Names}}\t{{.Status}}\t{{.RunningFor}}"
```

### Check a specific worker's recent output
```bash
docker logs cheggie-worker-transcript --tail=50
docker logs cheggie-worker-subtitle --tail=50
docker logs cheggie-worker-export --tail=50
docker logs cheggie-worker-search --tail=50

# Follow live output
docker logs -f cheggie-worker-transcript
```

### Check worker exit codes (why did it crash?)
```bash
docker inspect cheggie-worker-transcript \
  --format='{{.State.Status}} | ExitCode={{.State.ExitCode}} | Error={{.State.Error}}'
```

### Worker is in restart loop?
```bash
# View full restart history
docker events --filter "name=cheggie-worker-transcript" --since=1h

# Check system resources (out of memory?)
docker stats --no-stream
free -h
df -h
```

---

## 2. Check Job Queues (Redis / BullMQ)

### Connect to Redis
```bash
# Get Redis password from .env.prod
REDIS_PASS=$(grep '^REDIS_PASSWORD=' /opt/cheggie-studios/.env.prod | cut -d= -f2-)

# Open Redis CLI
docker exec -it cheggie-redis redis-cli -a "$REDIS_PASS"
```

### Inspect BullMQ queue state inside Redis CLI
```bash
# List all BullMQ queue keys
KEYS bull:*

# Count jobs in each state for the 'transcript' queue
LLEN bull:transcript:wait        # waiting
LLEN bull:transcript:active      # active (being processed)
ZCARD bull:transcript:failed     # failed
ZCARD bull:transcript:completed  # completed (if not auto-deleted)
ZCARD bull:transcript:delayed    # scheduled/delayed

# Do the same for subtitle, export, search queues
LLEN bull:subtitle:wait
LLEN bull:export:wait
LLEN bull:search:wait
```

### Check failed job details
```bash
# List failed job IDs for transcript queue
ZRANGEBYSCORE bull:transcript:failed -inf +inf LIMIT 0 10

# Get job data for a specific job ID (replace <id> with actual job ID)
HGETALL bull:transcript:<id>
```

### Quick queue health one-liner (run from VPS shell)
```bash
REDIS_PASS=$(grep '^REDIS_PASSWORD=' /opt/cheggie-studios/.env.prod | cut -d= -f2-)
for queue in transcript subtitle export search; do
  wait=$(docker exec cheggie-redis redis-cli -a "$REDIS_PASS" LLEN "bull:${queue}:wait" 2>/dev/null)
  active=$(docker exec cheggie-redis redis-cli -a "$REDIS_PASS" LLEN "bull:${queue}:active" 2>/dev/null)
  failed=$(docker exec cheggie-redis redis-cli -a "$REDIS_PASS" ZCARD "bull:${queue}:failed" 2>/dev/null)
  echo "Queue: $queue | wait=$wait active=$active failed=$failed"
done
```

---

## 3. Restart Workers

### Restart a single worker
```bash
docker restart cheggie-worker-transcript
docker restart cheggie-worker-subtitle
docker restart cheggie-worker-export
docker restart cheggie-worker-search
```

### Restart all workers at once
```bash
docker restart \
  cheggie-worker-transcript \
  cheggie-worker-subtitle \
  cheggie-worker-export \
  cheggie-worker-search
```

### Hard stop and start (use when restart doesn't work)
```bash
cd /opt/cheggie-studios

docker compose -f docker-compose.yml -f docker-compose.prod.yml stop \
  worker-transcript worker-subtitle worker-export worker-search

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d \
  worker-transcript worker-subtitle worker-export worker-search
```

### Rebuild and restart workers (after code change)
```bash
cd /opt/cheggie-studios
docker compose -f docker-compose.yml -f docker-compose.prod.yml build \
  worker-transcript worker-subtitle worker-export worker-search

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d \
  worker-transcript worker-subtitle worker-export worker-search
```

---

## 4. Check Database Connections

### Is Postgres running and healthy?
```bash
docker exec cheggie-postgres pg_isready -U postgres -d cheggie_studios
# Expected: /var/run/postgresql:5432 - accepting connections
```

### How many connections are active?
```bash
docker exec -it cheggie-postgres psql -U postgres -d cheggie_studios -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

### What queries are running? (long-running query detection)
```bash
docker exec -it cheggie-postgres psql -U postgres -d cheggie_studios -c \
  "SELECT pid, now() - query_start AS duration, state, left(query, 80) AS query
   FROM pg_stat_activity
   WHERE state != 'idle' AND query_start IS NOT NULL
   ORDER BY duration DESC
   LIMIT 20;"
```

### Kill a stuck query
```bash
# Terminate gracefully
docker exec cheggie-postgres psql -U postgres -d cheggie_studios -c \
  "SELECT pg_terminate_backend(<pid>);"
```

### Check table sizes (storage issues)
```bash
docker exec -it cheggie-postgres psql -U postgres -d cheggie_studios -c \
  "SELECT tablename,
          pg_size_pretty(pg_total_relation_size(tablename::regclass)) AS size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(tablename::regclass) DESC
   LIMIT 20;"
```

### Connection pool exhausted?
```bash
# Check max_connections setting
docker exec cheggie-postgres psql -U postgres -c "SHOW max_connections;"

# Current connection count by application
docker exec -it cheggie-postgres psql -U postgres -d cheggie_studios -c \
  "SELECT application_name, count(*) FROM pg_stat_activity GROUP BY application_name;"
```

---

## 5. View Logs

### App logs
```bash
docker logs cheggie-app --tail=100
docker logs -f cheggie-app          # follow live
docker logs cheggie-app --since=1h  # last hour
docker logs cheggie-app --since=30m 2>&1 | grep ERROR
```

### NGINX access / error logs
```bash
# Access log (all requests)
tail -f /var/log/nginx/cheggie-access.log

# Error log (5xx, config errors)
tail -f /var/log/nginx/cheggie-error.log

# Filter 5xx errors in the last 500 lines
tail -500 /var/log/nginx/cheggie-access.log | awk '$9 >= 500'
```

### All containers at once
```bash
cd /opt/cheggie-studios
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs \
  --tail=50 --no-log-prefix \
  app worker-transcript worker-subtitle worker-export worker-search \
  2>&1 | less
```

### System logs (OOM killer, disk errors)
```bash
# Check if any process was OOM-killed
dmesg -T | grep -i "out of memory\|oom\|killed process" | tail -20

# Disk usage
df -h
du -sh /opt/cheggie-studios/uploads/* 2>/dev/null | sort -rh | head -10
```

---

## 6. Rollback Deployment

### Automatic rollback (using the deploy script)
```bash
cd /opt/cheggie-studios
bash ops/deploy/deploy.sh --rollback
```

### Manual rollback to a specific git commit
```bash
cd /opt/cheggie-studios

# Find the commit you want to roll back to
git log --oneline -20

# Hard rollback to commit (replace <hash> with actual hash)
git checkout <hash>

# Rebuild and restart
docker compose -f docker-compose.yml -f docker-compose.prod.yml build app \
  worker-transcript worker-subtitle worker-export worker-search
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Rollback the database (restore from backup)
```bash
# List available backups
ls -lh /opt/cheggie-studios/backups/

# Restore from a specific backup (DESTRUCTIVE — stops app first)
BACKUP_FILE="/opt/cheggie-studios/backups/db_backup_20260322_140000.sql.gz"

# 1. Stop app and workers to prevent writes during restore
docker stop cheggie-app cheggie-worker-transcript cheggie-worker-subtitle \
  cheggie-worker-export cheggie-worker-search

# 2. Restore
gunzip -c "$BACKUP_FILE" | docker exec -i cheggie-postgres \
  psql -U postgres cheggie_studios

# 3. Restart services
docker start cheggie-app cheggie-worker-transcript cheggie-worker-subtitle \
  cheggie-worker-export cheggie-worker-search
```

---

## 7. Clear Stuck Jobs

### Clear all failed jobs from a queue
```bash
REDIS_PASS=$(grep '^REDIS_PASSWORD=' /opt/cheggie-studios/.env.prod | cut -d= -f2-)

# Clear failed jobs (replace 'transcript' with the queue name)
docker exec cheggie-redis redis-cli -a "$REDIS_PASS" \
  ZREMRANGEBYSCORE bull:transcript:failed -inf +inf

# Confirm
docker exec cheggie-redis redis-cli -a "$REDIS_PASS" \
  ZCARD bull:transcript:failed
```

### Remove a specific stuck job by ID
```bash
REDIS_PASS=$(grep '^REDIS_PASSWORD=' /opt/cheggie-studios/.env.prod | cut -d= -f2-)
JOB_ID="<job-id>"
QUEUE="transcript"

# Remove from active list (if stuck in active state)
docker exec cheggie-redis redis-cli -a "$REDIS_PASS" \
  LREM "bull:${QUEUE}:active" 0 "$JOB_ID"

# Remove job hash
docker exec cheggie-redis redis-cli -a "$REDIS_PASS" \
  DEL "bull:${QUEUE}:${JOB_ID}"
```

### Move all failed jobs back to waiting (retry all)
```bash
# This requires using BullMQ's retryJobs API — run via a one-off Node script
docker exec cheggie-app node -e "
  const { Queue } = require('bullmq');
  const queue = new Queue('transcript', {
    connection: { host: 'redis', port: 6379 }
  });
  queue.retryJobs({ state: 'failed' }).then(() => {
    console.log('All failed jobs retried.');
    process.exit(0);
  });
"
```

### Nuclear option: drain an entire queue
```bash
# WARNING: This permanently deletes all waiting + failed jobs in the queue.
REDIS_PASS=$(grep '^REDIS_PASSWORD=' /opt/cheggie-studios/.env.prod | cut -d= -f2-)
QUEUE="transcript"

docker exec cheggie-redis redis-cli -a "$REDIS_PASS" \
  EVAL "return redis.call('del', unpack(redis.call('keys', 'bull:${QUEUE}:*')))" 0
```

---

## 8. Emergency Contacts & Escalation

| Severity | Action |
|---|---|
| App down (5xx) | Check NGINX → app container → app logs → restart app |
| Workers stalled | Restart workers → check Redis → clear stuck jobs |
| DB down | Check postgres container → check disk space → restore from backup |
| Redis down | Check redis container → restart redis → workers will reconnect automatically |
| Full outage | Run `bash ops/deploy/deploy.sh --rollback` |
| Disk full | Clear old uploads, old logs, old Docker images (`docker system prune`) |

### Free disk space quickly
```bash
# Remove unused Docker images, stopped containers, dangling volumes
docker system prune -f

# Remove all unused images (more aggressive)
docker image prune -a -f

# Check what's using space
du -sh /opt/cheggie-studios/uploads/
du -sh /var/lib/docker/
```
