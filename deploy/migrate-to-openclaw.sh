#!/bin/bash
set -euo pipefail

# =============================================================
# Migration AssistMe → OpenClaw
# Execute sur le VPS: bash deploy/migrate-to-openclaw.sh
# =============================================================

DEPLOY_DIR="/opt/assistme"
OPENCLAW_HOME="/home/deploy/.openclaw"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[openclaw]${NC} $1"; }
warn() { echo -e "${YELLOW}[openclaw]${NC} $1"; }
err() { echo -e "${RED}[openclaw]${NC} $1"; exit 1; }

# --- Pre-checks ---
log "=== Migration vers OpenClaw ==="
log "Etape 1/6 — Pre-checks"

[ -d "$DEPLOY_DIR" ] || err "Repertoire $DEPLOY_DIR introuvable"
[ -f "$DEPLOY_DIR/.env" ] || err "Fichier .env introuvable"
[ -d "$DEPLOY_DIR/openclaw" ] || err "Dossier openclaw/ introuvable — git pull d'abord"

# --- Install Node 22 ---
log "Etape 2/6 — Node 22"

if command -v node &>/dev/null; then
  NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VERSION" -ge 22 ]; then
    log "Node $(node --version) deja installe"
  else
    warn "Node $(node --version) trop ancien, installation de Node 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi
else
  log "Installation de Node 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

node --version
log "Node OK: $(node --version)"

# --- Install OpenClaw ---
log "Etape 3/6 — OpenClaw"

if command -v openclaw &>/dev/null; then
  log "OpenClaw deja installe: $(openclaw --version 2>/dev/null || echo 'version inconnue')"
  log "Mise a jour..."
fi
sudo npm install -g openclaw@latest
log "OpenClaw installe: $(openclaw --version)"

# --- Setup openclaw config ---
log "Etape 4/6 — Configuration"

# Symlink ~/.openclaw -> /opt/assistme/openclaw
if [ -L "$OPENCLAW_HOME" ]; then
  log "Symlink $OPENCLAW_HOME existe deja"
elif [ -d "$OPENCLAW_HOME" ]; then
  warn "$OPENCLAW_HOME existe deja (pas un symlink), backup..."
  mv "$OPENCLAW_HOME" "${OPENCLAW_HOME}.bak.$(date +%s)"
  ln -s "$DEPLOY_DIR/openclaw" "$OPENCLAW_HOME"
else
  ln -s "$DEPLOY_DIR/openclaw" "$OPENCLAW_HOME"
fi
log "Symlink: $OPENCLAW_HOME -> $DEPLOY_DIR/openclaw"

# Install extension dependencies
cd "$DEPLOY_DIR/openclaw/extensions/supabase-tools"
npm install --omit=dev
log "Extension supabase-tools deps installees"

# Source env vars for openclaw config validation
set -a
source "$DEPLOY_DIR/.env"
set +a

# Validate config
openclaw config validate && log "Config valide" || warn "Config invalide — verifier manuellement"

# --- Stop old bots ---
log "Etape 5/6 — Arret des anciens bots"
cd "$DEPLOY_DIR"

docker compose -f docker-compose.prod.yml stop bot-telegram bot-telegram-public bot-discord 2>/dev/null || true
docker compose -f docker-compose.prod.yml rm -f bot-telegram bot-telegram-public bot-discord 2>/dev/null || true
log "Anciens bots arretes (redis + embedding-server conserves)"

# Wait for Telegram to release the tokens
sleep 3

# --- Start OpenClaw gateway ---
log "Etape 6/6 — Demarrage OpenClaw gateway"

# Create systemd user service
mkdir -p /home/deploy/.config/systemd/user

cat > /home/deploy/.config/systemd/user/openclaw-gateway.service << 'SYSTEMD'
[Unit]
Description=OpenClaw Gateway
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/assistme
EnvironmentFile=/opt/assistme/.env
ExecStart=/usr/bin/openclaw gateway run --port 18789 --bind loopback --force
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=TZ=Asia/Bangkok

[Install]
WantedBy=default.target
SYSTEMD

# Enable lingering so user services run without login
sudo loginctl enable-linger deploy 2>/dev/null || true

# Reload and start
systemctl --user daemon-reload
systemctl --user enable openclaw-gateway
systemctl --user start openclaw-gateway

sleep 5

if systemctl --user is-active openclaw-gateway &>/dev/null; then
  log "=== OpenClaw gateway RUNNING ==="
  systemctl --user status openclaw-gateway --no-pager | head -15
else
  err "Gateway failed to start. Logs: journalctl --user -u openclaw-gateway -n 50"
fi

log ""
log "=== Migration terminee ==="
log "Telegram admin  → agent copilote"
log "Telegram public → agent public"
log "Discord         → agent formateur"
log ""
log "Commandes utiles:"
log "  systemctl --user status openclaw-gateway"
log "  systemctl --user restart openclaw-gateway"
log "  journalctl --user -u openclaw-gateway -f"
log ""
log "Pour revenir en arriere:"
log "  systemctl --user stop openclaw-gateway"
log "  cd /opt/assistme && docker compose -f docker-compose.prod.yml up -d"
