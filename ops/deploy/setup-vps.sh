#!/usr/bin/env bash
# =============================================================================
# Cheggie Studios — One-Time VPS Setup Script
# Target: Hostinger VPS, Ubuntu 22.04 LTS
#
# Run this ONCE as root on a fresh VPS before first deployment.
#
# What this does:
#   1. System update
#   2. Install Docker Engine + Docker Compose v2
#   3. Install NGINX
#   4. Install Certbot (Let's Encrypt)
#   5. Create 'cheggie' app user with Docker group access
#   6. Configure UFW firewall (allow 22, 80, 443 only)
#   7. Create app directories with correct permissions
#   8. Configure swap space (2GB)
#   9. Setup log rotation for app logs
#  10. Configure system limits (file descriptors, etc.)
#  11. Install useful CLI tools (htop, jq, curl, unzip)
#  12. Harden SSH (disable root login, disable password auth)
#  13. Clone app repository (prompts for repo URL)
#
# Usage:
#   curl -sSL https://cheggiestudios.com/setup.sh | sudo bash
#   # or:
#   sudo bash ops/deploy/setup-vps.sh
# =============================================================================

set -euo pipefail
IFS=$'\n\t'

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
APP_USER="cheggie"
APP_DIR="/opt/cheggie-studios"
UPLOAD_DIR="${APP_DIR}/uploads"
BACKUP_DIR="${APP_DIR}/backups"
LOG_DIR="/var/log/cheggie-studios"
SWAP_SIZE="2G"
DOMAIN="cheggiestudios.com"
REPO_URL="${REPO_URL:-}"  # Set via env or prompted below

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
step()    { echo -e "\n${CYAN}${BOLD}━━━ $* ━━━${RESET}"; }

# ---------------------------------------------------------------------------
# Root check
# ---------------------------------------------------------------------------
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root."
    error "Usage: sudo bash ops/deploy/setup-vps.sh"
    exit 1
fi

# ---------------------------------------------------------------------------
# OS check
# ---------------------------------------------------------------------------
if ! grep -qi "ubuntu" /etc/os-release 2>/dev/null; then
    warn "This script is optimised for Ubuntu 22.04. Proceeding anyway..."
fi

echo ""
echo -e "${CYAN}${BOLD}"
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║   CHEGGIE STUDIOS — VPS SETUP                 ║"
echo "  ║   Hostinger VPS / Ubuntu 22.04                ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo -e "${RESET}"
echo -e "  Time : $(date)"
echo -e "  Host : $(hostname)"
echo ""

# ---------------------------------------------------------------------------
# Step 1: System update
# ---------------------------------------------------------------------------
step "1/13 — SYSTEM UPDATE"

export DEBIAN_FRONTEND=noninteractive

log "Updating package lists..."
apt-get update -y 2>&1

log "Upgrading installed packages..."
apt-get upgrade -y \
    -o Dpkg::Options::="--force-confdef" \
    -o Dpkg::Options::="--force-confold" \
    2>&1

log "Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    jq \
    htop \
    iotop \
    net-tools \
    dnsutils \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    apt-transport-https \
    logrotate \
    fail2ban \
    ufw \
    2>&1

success "System updated."

# ---------------------------------------------------------------------------
# Step 2: Install Docker Engine + Docker Compose v2
# ---------------------------------------------------------------------------
step "2/13 — DOCKER"

if command -v docker &>/dev/null; then
    DOCKER_VER=$(docker --version)
    warn "Docker already installed: ${DOCKER_VER}"
else
    log "Adding Docker GPG key and repository..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list

    apt-get update -y 2>&1

    log "Installing Docker Engine..."
    apt-get install -y \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin \
        2>&1

    systemctl enable docker
    systemctl start docker

    success "Docker installed: $(docker --version)"
    success "Docker Compose installed: $(docker compose version)"
fi

# Configure Docker daemon (log rotation, storage driver)
log "Configuring Docker daemon..."
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  },
  "storage-driver": "overlay2",
  "live-restore": true
}
EOF

systemctl reload docker 2>/dev/null || systemctl restart docker
success "Docker daemon configured."

# ---------------------------------------------------------------------------
# Step 3: Install NGINX
# ---------------------------------------------------------------------------
step "3/13 — NGINX"

if command -v nginx &>/dev/null; then
    warn "NGINX already installed: $(nginx -v 2>&1)"
else
    log "Installing NGINX..."
    apt-get install -y nginx 2>&1
    systemctl enable nginx
    systemctl start nginx
    success "NGINX installed: $(nginx -v 2>&1)"
fi

# Remove default site
rm -f /etc/nginx/sites-enabled/default
success "NGINX ready."

# ---------------------------------------------------------------------------
# Step 4: Install Certbot (Let's Encrypt)
# ---------------------------------------------------------------------------
step "4/13 — CERTBOT"

if command -v certbot &>/dev/null; then
    warn "Certbot already installed: $(certbot --version)"
else
    log "Installing Certbot with NGINX plugin..."
    apt-get install -y certbot python3-certbot-nginx 2>&1
    success "Certbot installed: $(certbot --version)"
fi

# Setup Certbot auto-renewal cron (twice daily, standard practice)
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    success "Certbot auto-renewal cron added."
else
    warn "Certbot auto-renewal cron already set."
fi

# ---------------------------------------------------------------------------
# Step 5: Create app user
# ---------------------------------------------------------------------------
step "5/13 — APP USER"

if id "$APP_USER" &>/dev/null; then
    warn "User '${APP_USER}' already exists."
else
    log "Creating user: ${APP_USER}..."
    useradd -m -s /bin/bash "$APP_USER"
    success "User '${APP_USER}' created."
fi

# Add to docker group (allows running docker without sudo)
usermod -aG docker "$APP_USER"
success "User '${APP_USER}' added to docker group."

# Add SSH authorized_keys if deploying from CI/CD
mkdir -p "/home/${APP_USER}/.ssh"
chmod 700 "/home/${APP_USER}/.ssh"
touch "/home/${APP_USER}/.ssh/authorized_keys"
chmod 600 "/home/${APP_USER}/.ssh/authorized_keys"
chown -R "${APP_USER}:${APP_USER}" "/home/${APP_USER}/.ssh"
warn "Add your SSH public key to /home/${APP_USER}/.ssh/authorized_keys"

# ---------------------------------------------------------------------------
# Step 6: Configure UFW firewall
# ---------------------------------------------------------------------------
step "6/13 — FIREWALL (UFW)"

log "Configuring UFW firewall..."

# Reset to defaults
ufw --force reset 2>/dev/null || true

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (critical — do this first to avoid lockout)
ufw allow 22/tcp comment "SSH"

# Allow HTTP and HTTPS (NGINX)
ufw allow 80/tcp  comment "HTTP"
ufw allow 443/tcp comment "HTTPS"

# Enable UFW
ufw --force enable

ufw status verbose
success "UFW firewall configured (22, 80, 443 only)."

# ---------------------------------------------------------------------------
# Step 7: Create app directories
# ---------------------------------------------------------------------------
step "7/13 — DIRECTORIES"

log "Creating app directory structure..."

mkdir -p "$APP_DIR"
mkdir -p "$UPLOAD_DIR"
mkdir -p "$BACKUP_DIR"
mkdir -p "$LOG_DIR"
mkdir -p /var/www/certbot

# Correct ownership
chown -R "${APP_USER}:${APP_USER}" "$APP_DIR"
chown -R "${APP_USER}:${APP_USER}" "$LOG_DIR"
chmod 755 "$APP_DIR"
chmod 750 "$UPLOAD_DIR"
chmod 750 "$BACKUP_DIR"

success "Directories created:"
ls -la "$APP_DIR"

# ---------------------------------------------------------------------------
# Step 8: Configure swap space
# ---------------------------------------------------------------------------
step "8/13 — SWAP"

if swapon --show | grep -q "/swapfile"; then
    warn "Swap already configured: $(free -h | grep Swap)"
else
    log "Creating ${SWAP_SIZE} swap file..."
    fallocate -l "$SWAP_SIZE" /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile

    # Persist swap across reboots
    if ! grep -q "/swapfile" /etc/fstab; then
        echo "/swapfile none swap sw 0 0" >> /etc/fstab
    fi

    # Tune swappiness for server workload (prefer RAM, use swap only when needed)
    sysctl vm.swappiness=10
    echo "vm.swappiness=10" >> /etc/sysctl.d/99-cheggie.conf

    success "Swap configured: $(free -h | grep Swap)"
fi

# ---------------------------------------------------------------------------
# Step 9: Configure log rotation
# ---------------------------------------------------------------------------
step "9/13 — LOG ROTATION"

log "Setting up log rotation for app logs..."
cat > /etc/logrotate.d/cheggie-studios <<EOF
${LOG_DIR}/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ${APP_USER} adm
    sharedscripts
    postrotate
        docker kill --signal=USR1 cheggie-nginx 2>/dev/null || true
    endscript
}

/var/log/nginx/cheggie-*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        /bin/kill -USR1 \$(cat /var/run/nginx.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
EOF

success "Log rotation configured."

# ---------------------------------------------------------------------------
# Step 10: System limits
# ---------------------------------------------------------------------------
step "10/13 — SYSTEM LIMITS"

log "Configuring system limits for Node.js workloads..."

# Increase file descriptor limits
cat >> /etc/security/limits.conf <<EOF

# Cheggie Studios — increased limits for Node.js + Postgres
${APP_USER} soft nofile 65536
${APP_USER} hard nofile 65536
root soft nofile 65536
root hard nofile 65536
EOF

# Kernel network tuning for high-throughput proxy
cat > /etc/sysctl.d/99-cheggie.conf <<EOF
# Network performance
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 8096
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_tw_reuse = 1

# Memory
vm.swappiness = 10
vm.overcommit_memory = 1

# File watchers (needed for Next.js hot reload in dev)
fs.inotify.max_user_watches = 524288
EOF

sysctl --system 2>/dev/null | grep -E "(net|vm|fs)" | head -10 || true
success "System limits configured."

# ---------------------------------------------------------------------------
# Step 11: Configure fail2ban for SSH protection
# ---------------------------------------------------------------------------
step "11/13 — FAIL2BAN"

if systemctl is-active --quiet fail2ban; then
    warn "fail2ban already running."
else
    cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5
backend  = systemd

[sshd]
enabled  = true
port     = ssh
logpath  = %(sshd_log)s
maxretry = 3
bantime  = 86400
EOF

    systemctl enable fail2ban
    systemctl restart fail2ban
    success "fail2ban configured (SSH: max 3 retries, ban 24h)."
fi

# ---------------------------------------------------------------------------
# Step 12: SSH hardening
# ---------------------------------------------------------------------------
step "12/13 — SSH HARDENING"

SSHD_CONFIG="/etc/ssh/sshd_config"
BACKUP_CONFIG="${SSHD_CONFIG}.bak.$(date +%Y%m%d)"

log "Backing up sshd_config to ${BACKUP_CONFIG}..."
cp "$SSHD_CONFIG" "$BACKUP_CONFIG"

# Apply hardening settings
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin prohibit-password/' "$SSHD_CONFIG"
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CONFIG"
sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' "$SSHD_CONFIG"
sed -i 's/^#*X11Forwarding.*/X11Forwarding no/' "$SSHD_CONFIG"
sed -i 's/^#*MaxAuthTries.*/MaxAuthTries 3/' "$SSHD_CONFIG"

# Test config before reloading
if sshd -t 2>/dev/null; then
    systemctl reload sshd
    success "SSH hardened (root login: key-only, password auth: disabled)."
else
    warn "sshd config test failed — reverting to backup."
    cp "$BACKUP_CONFIG" "$SSHD_CONFIG"
fi

# ---------------------------------------------------------------------------
# Step 13: Clone repository (optional)
# ---------------------------------------------------------------------------
step "13/13 — CLONE REPOSITORY"

if [[ -z "$REPO_URL" ]]; then
    echo ""
    read -rp "  Enter Git repository URL (leave blank to skip): " REPO_URL
fi

if [[ -n "$REPO_URL" ]]; then
    if [[ -d "${APP_DIR}/.git" ]]; then
        warn "Repository already cloned at ${APP_DIR}. Pulling latest..."
        cd "$APP_DIR"
        sudo -u "$APP_USER" git pull origin main 2>&1 || true
    else
        log "Cloning ${REPO_URL} → ${APP_DIR}..."
        sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR" 2>&1
        success "Repository cloned."
    fi
else
    warn "Skipping repository clone. Clone manually to ${APP_DIR}."
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}"
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║   VPS SETUP COMPLETE                          ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo -e "${RESET}"
echo ""
echo -e "  App user  : ${APP_USER}"
echo -e "  App dir   : ${APP_DIR}"
echo -e "  Uploads   : ${UPLOAD_DIR}"
echo -e "  Backups   : ${BACKUP_DIR}"
echo ""
echo -e "${CYAN}Next steps:${RESET}"
echo "  1. Add your SSH public key to /home/${APP_USER}/.ssh/authorized_keys"
echo "  2. Copy .env.prod to ${APP_DIR}/.env.prod"
echo "  3. Obtain SSL certificate:"
echo "     certbot certonly --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo "  4. Copy NGINX config:"
echo "     cp ${APP_DIR}/ops/nginx/cheggie-studios.conf /etc/nginx/conf.d/"
echo "     nginx -t && systemctl reload nginx"
echo "  5. Run deployment:"
echo "     cd ${APP_DIR} && bash ops/deploy/deploy.sh"
echo ""
echo -e "  Firewall status:"
ufw status numbered
echo ""
