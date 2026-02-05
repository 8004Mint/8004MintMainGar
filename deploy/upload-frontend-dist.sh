#!/bin/bash
# Pack frontend dist and upload to server, extract to /opt/8004/frontend/dist
# Usage: from repo root: DEPLOY_SERVER=root@72.62.116.172 [SSHPASS=pass] ./deploy/upload-frontend-dist.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

DEPLOY_SERVER="${DEPLOY_SERVER:-}"
if [ -z "$DEPLOY_SERVER" ]; then
  echo "Usage: DEPLOY_SERVER=user@host ./deploy/upload-frontend-dist.sh"
  exit 1
fi

echo "[1/3] Building frontend..."
cd frontend && npm run build && cd ..

echo "[2/3] Packing frontend/dist into zip..."
rm -f frontend-dist.zip
(cd frontend/dist && zip -r "$ROOT_DIR/frontend-dist.zip" .)

echo "[3/3] Uploading zip and extracting on server..."
SSH_OPTS="-o StrictHostKeyChecking=accept-new"
SCP_CMD="scp $SSH_OPTS"
SSH_CMD="ssh $SSH_OPTS"
if [ -n "${SSHPASS:-}" ]; then
  command -v sshpass &>/dev/null || { echo "Install sshpass (e.g. brew install sshpass) to use SSHPASS"; exit 1; }
  SCP_CMD="sshpass -e scp $SSH_OPTS"
  SSH_CMD="sshpass -e ssh $SSH_OPTS"
fi

$SCP_CMD frontend-dist.zip "$DEPLOY_SERVER:/tmp/"
$SSH_CMD "$DEPLOY_SERVER" "cd /opt/8004/frontend && rm -rf dist.old && mv dist dist.old 2>/dev/null || true && mkdir dist && unzip -o /tmp/frontend-dist.zip -d dist && rm -f /tmp/frontend-dist.zip && echo Done."

echo "Frontend updated at https://8004mint.com"
