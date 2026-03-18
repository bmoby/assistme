#!/bin/bash
set -euo pipefail

# =============================================================
# Migration AssistMe → OpenClaw (Docker)
# Execute sur le VPS: bash deploy/migrate-to-openclaw.sh
# =============================================================

DEPLOY_DIR="/opt/assistme"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[openclaw]${NC} $1"; }
err() { echo -e "${RED}[openclaw]${NC} $1"; exit 1; }

log "=== Migration vers OpenClaw (Docker) ==="

# --- Pre-checks ---
log "1/4 — Pre-checks"
[ -d "$DEPLOY_DIR" ] || err "$DEPLOY_DIR introuvable"
[ -f "$DEPLOY_DIR/.env" ] || err ".env introuvable"
[ -f "$DEPLOY_DIR/docker-compose.openclaw.yml" ] || err "docker-compose.openclaw.yml introuvable — git pull d'abord"
[ -d "$DEPLOY_DIR/openclaw" ] || err "dossier openclaw/ introuvable"
command -v docker &>/dev/null || err "Docker non installe"
log "OK"

# --- Stop old bots ---
log "2/4 — Arret des anciens bots Docker"
docker compose -f "$DEPLOY_DIR/docker-compose.prod.yml" stop bot-telegram bot-telegram-public bot-discord 2>/dev/null || true
docker compose -f "$DEPLOY_DIR/docker-compose.prod.yml" rm -f bot-telegram bot-telegram-public bot-discord 2>/dev/null || true

# Kill any nohup openclaw process
pkill -9 -f "openclaw gateway" 2>/dev/null || true
sleep 3
log "Anciens bots arretes"

# --- Fix permissions ---
log "3/4 — Permissions"
chown -R 1000:1000 "$DEPLOY_DIR/openclaw" 2>/dev/null || true
log "OK"

# --- Start OpenClaw via Docker ---
log "4/4 — Demarrage OpenClaw gateway"
cd "$DEPLOY_DIR"
docker compose -f docker-compose.openclaw.yml up -d
sleep 15

if docker compose -f docker-compose.openclaw.yml ps openclaw-gateway | grep -q "Up\|running"; then
  log "=== OpenClaw gateway RUNNING ==="
  docker compose -f docker-compose.openclaw.yml logs --tail 20 openclaw-gateway
else
  err "Gateway failed. Logs: docker compose -f docker-compose.openclaw.yml logs openclaw-gateway"
fi

log ""
log "=== Migration terminee ==="
log ""
log "Commandes utiles:"
log "  docker compose -f docker-compose.openclaw.yml logs -f openclaw-gateway"
log "  docker compose -f docker-compose.openclaw.yml restart openclaw-gateway"
log "  docker compose -f docker-compose.openclaw.yml ps"
log ""
log "Rollback:"
log "  docker compose -f docker-compose.openclaw.yml down openclaw-gateway"
log "  docker compose -f docker-compose.prod.yml up -d bot-telegram bot-telegram-public bot-discord"
