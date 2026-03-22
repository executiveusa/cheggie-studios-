# Cheggie Studios — Deployment Guide

**Last updated:** 2026-03-22
**Target:** Hostinger VPS (Ubuntu 22.04) · Self-hosted · Docker Compose

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [First Deployment — VPS Setup](#2-first-deployment--vps-setup)
3. [SSL Certificate (Let's Encrypt)](#3-ssl-certificate-lets-encrypt)
4. [Environment Variables Checklist](#4-environment-variables-checklist)
5. [Running Database Migrations](#5-running-database-migrations)
6. [Seeding Demo Data](#6-seeding-demo-data)
7. [Starting All Services](#7-starting-all-services)
8. [Smoke Testing](#8-smoke-testing)
9. [Subsequent Deployments](#9-subsequent-deployments)
10. [Monitoring Setup (Sentry)](#10-monitoring-setup-sentry)
11. [Hostinger VPS Notes](#11-hostinger-vps-notes)
12. [KulaFi Notes](#12-kulafi-notes)

---

## 1. Prerequisites

### Local machine
- Git
- SSH access to the VPS
- (Optional) Docker + Docker Compose for local builds

### VPS requirements
- Hostinger KVM VPS, minimum: **4 vCPU, 8GB RAM, 100GB SSD**
  - Recommended for production with video uploads: **8 vCPU, 16GB RAM**
- Ubuntu 22.04 LTS (fresh install preferred)
- Public IPv4 address
- Domain `cheggiestudios.com` pointed to the VPS IP

### DNS setup (before SSL)
Point these records at the VPS IP before running Certbot:

| Type | Name | Value |
|---|---|---|
| A | `cheggiestudios.com` | `<VPS_IP>` |
| A | `www.cheggiestudios.com` | `<VPS_IP>` |
| AAAA | `cheggiestudios.com` | `<VPS_IPv6>` (if available) |

Allow 5–30 minutes for DNS propagation. Verify with:
```bash
dig +short cheggiestudios.com A
```

---

## 2. First Deployment — VPS Setup

### 2a. SSH into the VPS as root
```bash
ssh root@<VPS_IP>
```

### 2b. Clone the repository
```bash
git clone https://github.com/YOUR_ORG/cheggie-studios.git /opt/cheggie-studios
cd /opt/cheggie-studios
```

### 2c. Run the VPS setup script
This is a **one-time** script. It installs Docker, NGINX, Certbot, creates the app user, configures UFW, sets up swap, and hardens SSH.

```bash
sudo bash ops/deploy/setup-vps.sh
```

Expected duration: 3–8 minutes.

After it completes:
- User `cheggie` is created and added to the `docker` group
- UFW allows ports 22, 80, 443 only
- 2GB swap is configured
- `/opt/cheggie-studios/uploads` and `/opt/cheggie-studios/backups` are created

### 2d. Add SSH key for the cheggie user (for CI/CD)
```bash
# On your local machine, copy your public key
ssh-copy-id -i ~/.ssh/id_ed25519.pub cheggie@<VPS_IP>

# Or manually:
echo "YOUR_PUBLIC_KEY" >> /home/cheggie/.ssh/authorized_keys
```

---

## 3. SSL Certificate (Let's Encrypt)

> DNS must be propagated before this step.

### 3a. Obtain the certificate
```bash
# Run as root on VPS
certbot certonly --nginx \
  -d cheggiestudios.com \
  -d www.cheggiestudios.com \
  --agree-tos \
  --email admin@cheggiestudios.com \
  --non-interactive
```

### 3b. Download recommended TLS parameters
```bash
# Only needed once — downloads ssl-dhparams.pem and options-ssl-nginx.conf
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
  > /etc/letsencrypt/options-ssl-nginx.conf

openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
```

### 3c. Install NGINX config
```bash
cp /opt/cheggie-studios/ops/nginx/cheggie-studios.conf /etc/nginx/conf.d/

# Validate
nginx -t

# Reload
systemctl reload nginx
```

### 3d. Verify SSL
```bash
curl -I https://cheggiestudios.com/api/health
# Expected: HTTP/2 200
```

### 3e. Auto-renewal (already configured by setup-vps.sh)
```bash
# Verify cron entry exists
crontab -l | grep certbot

# Test renewal dry-run
certbot renew --dry-run
```

---

## 4. Environment Variables Checklist

Create `/opt/cheggie-studios/.env.prod` from `.env.example`:

```bash
cp /opt/cheggie-studios/.env.example /opt/cheggie-studios/.env.prod
nano /opt/cheggie-studios/.env.prod
```

### Required variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@postgres:5432/cheggie_studios` |
| `POSTGRES_USER` | Postgres username | `cheggie_prod` |
| `POSTGRES_PASSWORD` | Postgres password (strong!) | (use `openssl rand -base64 32`) |
| `POSTGRES_DB` | Database name | `cheggie_studios` |
| `REDIS_URL` | Redis connection string | `redis://:password@redis:6379` |
| `REDIS_PASSWORD` | Redis auth password | (use `openssl rand -base64 32`) |
| `NEXTAUTH_SECRET` | Auth.js session secret | (use `openssl rand -base64 64`) |
| `NEXTAUTH_URL` | Canonical app URL | `https://cheggiestudios.com` |
| `OPENAI_API_KEY` | OpenAI Whisper + GPT key | `sk-...` |

### OAuth providers (at least one required)

| Variable | Description |
|---|---|
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `AUTH_GITHUB_ID` | GitHub OAuth app ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth app secret |

### Optional — Storage

| Variable | Description |
|---|---|
| `STORAGE_PROVIDER` | `local` or `s3` (default: `local`) |
| `AWS_ACCESS_KEY_ID` | S3/R2 access key |
| `AWS_SECRET_ACCESS_KEY` | S3/R2 secret key |
| `AWS_REGION` | S3 region |
| `AWS_S3_BUCKET` | Bucket name |
| `CLOUDFLARE_R2_ENDPOINT` | R2 endpoint URL |

### Optional — Monitoring

| Variable | Description |
|---|---|
| `SENTRY_DSN` | Sentry project DSN |
| `SENTRY_ORG` | Sentry org slug |
| `SENTRY_PROJECT` | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | Token for source map uploads |

### Generate secrets quickly
```bash
# NEXTAUTH_SECRET
openssl rand -base64 64 | tr -d '\n'

# POSTGRES_PASSWORD
openssl rand -base64 32 | tr -d '+/=' | head -c 32

# REDIS_PASSWORD
openssl rand -base64 32 | tr -d '+/=' | head -c 32
```

### Secure the .env.prod file
```bash
chmod 600 /opt/cheggie-studios/.env.prod
chown cheggie:cheggie /opt/cheggie-studios/.env.prod
```

---

## 5. Running Database Migrations

### First-time setup (creates all tables)
```bash
cd /opt/cheggie-studios

# Option A: Via the migrate.sh helper
bash scripts/migrate.sh prod

# Option B: Directly via Docker Compose
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm \
  --env-file .env.prod \
  app \
  sh -c "npx prisma migrate deploy"
```

### Subsequent deployments
The `deploy.sh` script runs `prisma migrate deploy` automatically before restarting services. No manual step needed.

### Check migration status
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm \
  --env-file .env.prod \
  app \
  sh -c "npx prisma migrate status"
```

### Emergency: reset migrations (DESTRUCTIVE — dev only)
```bash
# NEVER run this in production
npx prisma migrate reset
```

---

## 6. Seeding Demo Data

Populate the database with sample projects and transcripts for demos/testing.

```bash
cd /opt/cheggie-studios
bash scripts/seed-demo.sh
```

This creates:
- 1 demo user (`demo@cheggiestudios.com`)
- 3 sample projects with pre-generated transcripts
- Sample subtitle tracks (SRT + VTT)

> Note: Seeding is idempotent — safe to run multiple times.

---

## 7. Starting All Services

### First start
```bash
cd /opt/cheggie-studios

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Watch the startup logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f --tail=50
```

### Verify all containers are running
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Expected output:
```
NAMES                         STATUS                   PORTS
cheggie-nginx                 Up 2 minutes (healthy)   0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
cheggie-app                   Up 2 minutes (healthy)   3000/tcp
cheggie-worker-transcript     Up 2 minutes
cheggie-worker-subtitle       Up 2 minutes
cheggie-worker-export         Up 2 minutes
cheggie-worker-search         Up 2 minutes
cheggie-postgres              Up 2 minutes (healthy)   5432/tcp
cheggie-redis                 Up 2 minutes (healthy)   6379/tcp
```

---

## 8. Smoke Testing

Run these checks after every deployment.

### Health endpoint
```bash
curl -s https://cheggiestudios.com/api/health | jq .
# Expected: { "status": "ok", "db": "connected", "redis": "connected" }
```

### Full health check script
```bash
bash /opt/cheggie-studios/ops/monitoring/health-check.sh
```

### Manual checks
1. Load `https://cheggiestudios.com` — landing page loads
2. Sign in with Google OAuth
3. Create a new project
4. Upload a short audio/video file (< 5MB for smoke test)
5. Verify transcript job is queued and processes
6. Download an exported SRT file

### Check NGINX is serving SSL correctly
```bash
curl -vI https://cheggiestudios.com 2>&1 | grep -E "(SSL|HTTP|TLS|subject|issuer)"
```

### Verify security headers
```bash
curl -sI https://cheggiestudios.com | grep -E "(Strict-Transport|X-Frame|X-Content|Content-Security)"
```

---

## 9. Subsequent Deployments

Once the VPS is set up and SSL is in place, all future deployments are one command:

```bash
cd /opt/cheggie-studios
bash ops/deploy/deploy.sh
```

Or deploy a specific branch:
```bash
bash ops/deploy/deploy.sh --branch release/v1.2.0
```

Skip image rebuild (config-only change):
```bash
bash ops/deploy/deploy.sh --skip-build
```

Skip migrations (rare):
```bash
bash ops/deploy/deploy.sh --no-migrate
```

---

## 10. Monitoring Setup (Sentry)

### 10a. Create Sentry project
1. Go to [sentry.io](https://sentry.io) → New Project → Next.js
2. Copy the DSN
3. Add to `.env.prod`:
   ```
   SENTRY_DSN=https://xxx@oyyy.ingest.sentry.io/zzz
   SENTRY_ORG=cheggie-studios
   SENTRY_PROJECT=cheggie-studios
   SENTRY_AUTH_TOKEN=sntrys_...
   ```

### 10b. Source maps upload
Source maps are automatically uploaded during `pnpm build` when `SENTRY_AUTH_TOKEN` is set. The `tunnelRoute: '/monitoring'` in `next.config.ts` routes browser error reports through the app to avoid ad-blocker interference.

### 10c. Set up alerts
Recommended Sentry alert rules:
- **High error rate**: > 10 errors/min → email + Slack
- **New issue**: any new issue in `production` env → Slack
- **Performance**: P95 > 3s on `/api/upload` → email

### 10d. Uptime monitoring
Set up an external uptime monitor (Betterstack, UptimeRobot, etc.) against:
- `https://cheggiestudios.com/api/health` — every 1 minute
- Alert if HTTP status != 200 or response time > 5s

---

## 11. Hostinger VPS Notes

### Hostinger-specific gotchas

1. **IPv6**: Hostinger KVM VPS has IPv6 disabled by default. Check with `ip -6 addr`. The NGINX config binds to both `listen 80` and `listen [::]:80` — if IPv6 is unavailable, NGINX will log a warning but still work.

2. **Outbound port 25 (SMTP)**: Hostinger blocks port 25 on new VPS instances. Use SendGrid, Resend, or AWS SES for transactional email via the API (not raw SMTP).

3. **Firewall reset on OS reinstall**: Hostinger's VPS panel has a built-in firewall in addition to UFW. If you use the Hostinger control panel firewall, ensure it allows 22, 80, 443. The UFW configuration in `setup-vps.sh` applies at the OS level.

4. **VPS snapshots**: Use Hostinger's snapshot feature before major migrations. Navigate to VPS → Backups in the Hostinger hPanel.

5. **DNS propagation**: Hostinger's DNS can take up to 24h to propagate globally. Use `dig +short @8.8.8.8 cheggiestudios.com` to check Google's DNS.

6. **Bandwidth limits**: Check your Hostinger plan's monthly transfer limit. Video uploads/downloads are bandwidth-intensive. Consider Cloudflare proxying (orange cloud) to reduce origin bandwidth.

### Resource tuning for Hostinger VPS

For the **Business** plan (4 vCPU, 8GB RAM):
- PostgreSQL `max_connections`: 100 (default is fine)
- Redis `maxmemory`: 256MB (set in `docker-compose.prod.yml`)
- Node.js workers: 1 instance each is sufficient for < 100 concurrent users

For the **Enterprise** plan (8 vCPU, 16GB RAM):
- Increase transcript worker replicas to 2–3 for faster throughput
- Increase PostgreSQL `max_connections` to 200

---

## 12. KulaFi Notes

If deploying via KulaFi's infrastructure:

1. **Container orchestration**: KulaFi may use their own container management layer on top of Docker. The `docker-compose.prod.yml` file should still work but check if their platform wraps Docker Compose commands.

2. **Persistent volumes**: Ensure KulaFi's volume mounts persist across container restarts. Verify with `docker volume ls` after a restart.

3. **Networking**: KulaFi might use a different internal networking scheme. If containers cannot resolve each other by service name (e.g., `app` cannot reach `postgres`), ensure all services share the same Docker network (`cheggie` bridge).

4. **SSL**: If KulaFi provides SSL termination at their load balancer, you can skip the NGINX SSL config. Update `NEXTAUTH_URL` and `next.config.ts` security headers accordingly. The app needs `X-Forwarded-Proto: https` to be set by the upstream proxy.

5. **Port mapping**: In a KulaFi environment, adjust the NGINX ports if their platform provides a different port mapping scheme.

6. **Secrets management**: KulaFi may have a secrets vault. If available, inject secrets via their mechanism rather than `.env.prod` files on disk.
