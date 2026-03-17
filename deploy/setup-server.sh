#!/bin/bash
# ============================================
# Setup VPS for Vibe Coder deployment
# Run this ONCE on a fresh Ubuntu 24.04 + Docker VPS
# Usage: ssh root@187.127.97.113 'bash -s' < deploy/setup-server.sh
# ============================================

set -euo pipefail

echo "=== Vibe Coder — VPS Setup ==="

# 1. Update system
echo "→ Updating system..."
apt update && apt upgrade -y

# 2. Verify Docker is installed (pre-installed on Hostinger)
echo "→ Checking Docker..."
docker --version || { echo "ERROR: Docker not found"; exit 1; }
docker compose version || { echo "ERROR: Docker Compose not found"; exit 1; }

# 3. Create deploy user (more secure than root)
echo "→ Creating deploy user..."
if ! id "deploy" &>/dev/null; then
  adduser --disabled-password --gecos "" deploy
  usermod -aG docker deploy
  mkdir -p /home/deploy/.ssh
  cp /root/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null || true
  chown -R deploy:deploy /home/deploy/.ssh
  chmod 700 /home/deploy/.ssh
  chmod 600 /home/deploy/.ssh/authorized_keys 2>/dev/null || true
  echo "deploy ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/deploy
  echo "✓ User 'deploy' created"
else
  echo "✓ User 'deploy' already exists"
fi

# 4. Install Git
echo "→ Installing Git..."
apt install -y git

# 5. Setup project directory
echo "→ Setting up project directory..."
mkdir -p /opt/vibe-coder
chown deploy:deploy /opt/vibe-coder

# 6. Setup firewall (UFW)
echo "→ Configuring firewall..."
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw --force enable
echo "✓ Firewall enabled (SSH only)"

# 7. Setup fail2ban
echo "→ Installing fail2ban..."
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
echo "✓ fail2ban active"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Add your SSH key to the 'deploy' user:"
echo "   ssh-copy-id deploy@187.127.97.113"
echo ""
echo "2. Clone the repo on the server:"
echo "   ssh deploy@187.127.97.113"
echo "   cd /opt/vibe-coder"
echo "   git clone git@github.com:YOUR_USER/vibe-coder.git ."
echo ""
echo "3. Create .env file:"
echo "   nano /opt/vibe-coder/.env"
echo ""
echo "4. First deploy:"
echo "   docker compose -f docker-compose.prod.yml up -d --build"
