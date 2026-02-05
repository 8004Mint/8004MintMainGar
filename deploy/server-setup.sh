#!/bin/bash
# Run on server: install deps, build frontend, start PM2 (backend + MCP HTTP)
# Usage: from /opt/8004 run bash server-setup.sh
# Prereqs: .env configured, Node.js, npm, PM2 installed

set -e
cd /opt/8004

echo "[1/5] Installing root deps..."
npm install

echo "[2/5] Installing frontend deps and building..."
cd frontend && npm install && npm run build && cd ..

echo "[3/5] Installing and building MCP..."
cd mcp && npm install && npm run build && cd ..

echo "[4/5] Starting backend + MCP HTTP (PM2)..."
pm2 delete 8004-backend 2>/dev/null || true
pm2 delete 8004-mcp 2>/dev/null || true
# Uses deploy/ecosystem.config.cjs (BACKEND_URL set to https://8004mint.com)
pm2 start /opt/8004/deploy/ecosystem.config.cjs

pm2 save
echo "Done. Check: pm2 status"
