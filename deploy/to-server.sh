#!/bin/bash
# One-shot deploy: rsync to /opt/8004, install deps, build, restart PM2 on server.
# Usage: from repo root: DEPLOY_SERVER=user@72.62.116.172 ./deploy/to-server.sh
# Does not overwrite server .env, frontend/.env.local, frontend/.env.production.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

DEPLOY_SERVER="${DEPLOY_SERVER:-}"
if [ -z "$DEPLOY_SERVER" ]; then
  echo "Usage: DEPLOY_SERVER=user@host ./deploy/to-server.sh"
  echo "Example: DEPLOY_SERVER=root@72.62.116.172 ./deploy/to-server.sh"
  exit 1
fi

REMOTE_DIR="/opt/8004"
echo "Deploying to $DEPLOY_SERVER:$REMOTE_DIR ..."

# Optional: SSHPASS=password for non-interactive login (do not commit password)
SSH_CMD="ssh"
RSYNC_SSH="ssh"
if [ -n "${SSHPASS:-}" ]; then
  if ! command -v sshpass &>/dev/null; then
    echo "SSHPASS set but sshpass not found. Install: brew install sshpass"
    exit 1
  fi
  SSH_CMD="sshpass -e ssh -o StrictHostKeyChecking=accept-new"
  RSYNC_SSH="sshpass -e ssh -o StrictHostKeyChecking=accept-new"
fi

rsync -avz --delete \
  --exclude=node_modules \
  --exclude=frontend/node_modules \
  --exclude=mcp/node_modules \
  --exclude=.git \
  --exclude=.env \
  --exclude=frontend/.env \
  --exclude=frontend/.env.local \
  --exclude=frontend/.env.production \
  -e "$RSYNC_SSH" \
  ./ "$DEPLOY_SERVER:$REMOTE_DIR/"

echo "Running server-setup.sh on server..."
$SSH_CMD "$DEPLOY_SERVER" "cd $REMOTE_DIR && bash deploy/server-setup.sh"

echo "Done. Check: https://8004mint.com"
