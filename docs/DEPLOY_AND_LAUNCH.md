# Deploy Agent and Launch the Project

This doc describes how to take deployed contracts and local services **public** so anyone can access your Story and ERC-8004 Agent.

---

## Current state (already done)

- **Ethereum mainnet** deployed:
  - IdentityRegistry, ReputationRegistry, ValidationRegistry
  - EssayGatedToken (Mint contract, Story product)
  - Agent registered (agentId=1), agentURI points to `https://8004mint.com/.well-known/agent-registration.json`
- **Production**: Backend, frontend, MCP deployed on 8004mint.com; daily deploy via `deploy/to-server.sh`; no local frontend/backend testing.

To **launch**, you need: (1) backend publicly reachable; (2) on-chain agentURI pointing to that URL; (3) frontend publicly reachable. See **[docs/DEPLOY.md](DEPLOY.md)** and `deploy/to-server.sh`.

---

## Step 1: Deploy backend to the public

Backend must be reachable 24/7 over **HTTPS** so the Agent registration file can be fetched securely.

### Option A: VPS / cloud (recommended)

1. Get a VPS (e.g. AWS, DigitalOcean), install Node.js 18+.
2. Copy project to server (or Git clone), from repo root:
   ```bash
   npm install --production
   npm run compile   # if needed
   ```
3. Configure `.env` (same as local; important):
   - `API_BASE_PUBLIC=https://your-backend-domain` (no localhost)
   - `PORT=3001` (or your port)
   - Same as local: `ISSUER_PRIVATE_KEY`, `CONTRACT_ADDRESS`, `CHAIN_ID`, `RPC_URL`, `IDENTITY_REGISTRY_ADDRESS`, `AGENT_ID`, `AGENT_REGISTRY`, `PAYMENT_RECIPIENT`, etc.
4. Run with **PM2** or **systemd**, e.g.:
   ```bash
   npx ts-node backend/src/server.ts
   ```
   Or `npm run build` then `node dist/backend/server.js` if you have a build step.
5. Put Nginx/Caddy in front: `https://your-backend-domain` → `http://127.0.0.1:3001`, SSL (Let's Encrypt).

### Option B: Railway / Render / Fly.io

1. Push code to GitHub, deploy from GitHub on the platform.
2. Set **environment variables** from `.env` (secrets for private keys).
3. Start command: `npm run backend` or `npx ts-node backend/src/server.ts` (depending on platform).
4. Use the platform HTTPS URL as **API_BASE_PUBLIC**.

---

## Step 2: Point on-chain Agent agentURI to public URL

If Identity agentId=1 agentURI is still localhost or old URL, set it to your **public backend URL** (e.g. `https://8004mint.com/.well-known/agent-registration.json`).

1. Confirm backend is up and reachable:
   ```text
   https://your-backend-domain/.well-known/agent-registration.json
   ```
2. From project:
   ```bash
   npx hardhat run scripts/set-agent-uri.ts --network mainnet
   ```
   Or call the contract manually:
   - Contract: `IdentityRegistry`, address from `.env` `IDENTITY_REGISTRY_ADDRESS`
   - Method: `setAgentURI(1, "https://your-backend-domain/.well-known/agent-registration.json")`
   - Caller: must be the owner of agentId=1 (the address that called register).

---

## Step 3: Deploy frontend to the public

1. Build locally:
   ```bash
   cd frontend
   npm run build
   ```
2. Deploy `frontend/dist` to static hosting (Vercel / Netlify / Cloudflare Pages / your Nginx).
3. Set **build-time env vars** (platform "Environment Variables"):
   - `VITE_API_BASE` = `https://your-backend-domain` (same as API_BASE_PUBLIC)
   - `VITE_CONTRACT_ADDRESS` = your Mint contract (EssayGatedToken) address
   - `VITE_REPUTATION_REGISTRY_ADDRESS`, `VITE_IDENTITY_REGISTRY_ADDRESS`, `VITE_AGENT_ID`, etc. matching `.env`
4. You get a frontend URL (e.g. `https://your-app.vercel.app`).

---

## Step 4: Pre-launch checklist

- [ ] Backend `https://your-backend-domain/.well-known/agent-registration.json` returns 200; JSON has correct `registrations[0].agentRegistry`, `services`.
- [ ] On-chain `IdentityRegistry.tokenURI(1)` (or equivalent) equals that URL.
- [ ] Frontend talks to backend: open frontend, submit a story, get score, Claim works (if 100 USDC required, pay first then claim).
- [ ] Private keys and secrets only on server/platform secrets, not in Git or frontend code.

---

## set-agent-uri script

Project includes `scripts/set-agent-uri.ts`. Set **API_BASE_PUBLIC** in `.env` (e.g. `https://your-api.com`), then:

```bash
npx hardhat run scripts/set-agent-uri.ts --network mainnet
```

Script calls `IdentityRegistry.setAgentURI(1, "https://your-backend-domain/.well-known/agent-registration.json")`; caller must be owner of agentId=1.

---

## Summary: deploy and launch order

1. **Deploy backend** publicly → get `https://your-backend-domain`.
2. **Update on-chain agentURI** via `IdentityRegistry.setAgentURI(1, "https://your-backend-domain/.well-known/agent-registration.json")`.
3. **Deploy frontend** publicly; set `VITE_API_BASE` to same backend domain.
4. Run the **checklist** to verify registration, frontend–backend, and claim flow.

After that, your Agent is deployed per EIP-8004 and the project is live.
