# Deploy to 72.62.116.172 (8004mint.com)

Deploy the Story project (backend, frontend, MCP HTTP) to the server and bind domain 8004mint.com.

---

## Prerequisites

- Domain **8004mint.com** resolves to **72.62.116.172** (A record).
- SSH access to the server (user may be root / ubuntu, etc.).

---

## 1. Daily deploy (recommended)

After code changes, **deploy to server** from your machine; no need to build or run frontend/backend locally. From **repo root**:

```bash
DEPLOY_SERVER=root@72.62.116.172 ./deploy/to-server.sh
```

(Replace `root@72.62.116.172` with your SSH user@host; optional `SSHPASS=password` for non-interactive login.)

Script rsyncs code to `/opt/8004` and runs `deploy/server-setup.sh` on the server (install deps, build frontend and mcp, PM2 restart). **Does not overwrite** server `.env`, `frontend/.env.production` (or `.env.local`); change those on the server when contracts or env change.

---

## 2. Server environment (first time)

After SSH (as root or with sudo):

```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Nginx
apt-get update && apt-get install -y nginx

# PM2
npm install -g pm2
```

---

## 3. Upload code and install (optional; daily use to-server.sh)

**`deploy/to-server.sh`** handles upload and install. To upload manually from your machine (replace USER with SSH user):

```bash
cd /Users/howe/Desktop/8004
rsync -avz --exclude=node_modules --exclude=frontend/node_modules --exclude=mcp/node_modules --exclude=.git -e ssh ./ USER@72.62.116.172:/opt/8004/
```

Or Git clone on the server. Then on the **server** run `bash deploy/server-setup.sh`.

---

## 4. Configure .env (server)

On the server, edit `/opt/8004/.env` (copy from .env.example):

```bash
cd /opt/8004
cp .env.example .env
nano .env
```

Important:

- `API_BASE_PUBLIC=https://8004mint.com`
- `PORT=3001`
- `CHAIN_ID`, `RPC_URL`, `CONTRACT_ADDRESS`, `ISSUER_PRIVATE_KEY`, `IDENTITY_REGISTRY_ADDRESS`, `AGENT_ID`, `AGENT_REGISTRY` same as local/contracts
- Optional: `PAYMENT_RECIPIENT`, `OPENAI_API_KEY`

---

## 5. Frontend build (done by server-setup.sh)

`deploy/server-setup.sh` runs `cd frontend && npm install && npm run build`. Before that, configure **`/opt/8004/frontend/.env.production`** (or `.env.local`) with at least:

- `VITE_API_BASE=https://8004mint.com`
- `VITE_CONTRACT_ADDRESS=` your Mint contract (EssayGatedToken) address
- `VITE_REPUTATION_REGISTRY_ADDRESS`, `VITE_IDENTITY_REGISTRY_ADDRESS`, `VITE_AGENT_ID=1`, `VITE_CHAIN_ID=1`

---

## 6. PM2: backend + MCP HTTP

On the server (use project ecosystem to start both):

```bash
cd /opt/8004
pm2 start deploy/ecosystem.config.cjs
pm2 save && pm2 startup
```

Or start manually:

```bash
cd /opt/8004
pm2 start "npx ts-node backend/src/server.ts" --name 8004-backend --cwd /opt/8004
pm2 start "node dist/http.js" --name 8004-mcp --cwd /opt/8004/mcp -- --env BACKEND_URL=https://8004mint.com
pm2 save && pm2 startup
```

MCP must have `BACKEND_URL=https://8004mint.com` so `/score` requests go through Nginx to the backend.

---

## 7. Nginx

Create site config (replace default or new vhost):

```bash
nano /etc/nginx/sites-available/8004mint.com
```

Copy from **`deploy/nginx-fliporacle.conf`**; adjust `server_name`, `root`, `ssl_certificate` if needed (Certbot often fills SSL paths).

Enable and reload:

```bash
ln -sf /etc/nginx/sites-available/8004mint.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 8. HTTPS (Let's Encrypt)

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d 8004mint.com
```

Choose redirect HTTP→HTTPS when prompted. Reload Nginx and open `https://8004mint.com`.

---

## 9. Agent Step 2: Service URL

- **Service URL**: `https://8004mint.com/mcp`
- **Tools**: `score_story`
- Prompts / Resources: empty.

---

## 10. Checklist

- [ ] `https://8004mint.com` serves the frontend
- [ ] `https://8004mint.com/score` accepts POST (e.g. curl)
- [ ] `https://8004mint.com/.well-known/agent-registration.json` returns 200
- [ ] `https://8004mint.com/mcp` is the MCP endpoint (for Agent registration)
- [ ] On-chain agentURI is `https://8004mint.com/.well-known/agent-registration.json` (see DEPLOY_AND_LAUNCH.md)

---

**Note**: When contracts or env change, update **on the server**: `/opt/8004/.env` (e.g. `CONTRACT_ADDRESS`) and `/opt/8004/frontend/.env.production` (e.g. `VITE_CONTRACT_ADDRESS`), then redeploy/rebuild so frontend uses the right config.

---

## One-shot install/restart (server-setup.sh)

On the **server** (code already at `/opt/8004`, `.env` set, Node.js and PM2 installed):

```bash
cd /opt/8004
bash deploy/server-setup.sh
```

Script: install root + frontend + mcp deps → build frontend and mcp → start/restart backend and MCP HTTP via `deploy/ecosystem.config.cjs`. Ensure `/opt/8004` path and `.env` / frontend env are correct before running.
