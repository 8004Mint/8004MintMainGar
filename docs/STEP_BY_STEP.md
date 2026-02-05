# Step-by-step: Register Agent on the site first, then deploy contracts

> **Note**: This doc is for **first-time registration or testnet**. For daily deploy use `DEPLOY_SERVER=user@host ./deploy/to-server.sh`; see [DEPLOY.md](DEPLOY.md). Production is mainnet (CHAIN_ID=1); 8004mint.com is deployed on mainnet.

**Order**: Register Agent at [8004scan.io/create](https://www.8004scan.io/create) first, get agentId / agentRegistry, then configure backend, deploy Mint contract, run frontend.

---

## Step 0: Wallet and testnet

1. Install MetaMask (or another EVM wallet).
2. Add the chain supported by 8004scan (e.g. **Sepolia** or 8004 chain).
3. Get test tokens (e.g. Sepolia: https://sepoliafaucet.com) for gas.
4. Note **wallet address** and **private key** (testnet only; never expose mainnet key).

---

## Step 1: Install project deps

From repo root:

```bash
cd /Users/howe/Desktop/8004
npm install
cd frontend && npm install && cd ..
```

No errors = OK.

---

## Step 2: Set backend env vars

```bash
cp .env.example .env
```

Edit `.env` and fill (others can stay empty for now):

| Variable | Description | Example |
|----------|-------------|---------|
| `DEPLOYER_PRIVATE_KEY` | Key for deploying contracts | `0x...` |
| `ISSUER_PRIVATE_KEY` | Key for signing claims (can be same) | `0x...` |
| `ISSUER_ADDRESS` | **Wallet address** for that key | `0x...` |
| `PORT` | Backend port | `3001` |
| `CHAIN_ID` | Must match 8004scan chain (Sepolia = 11155111) | `11155111` |
| `API_BASE_PUBLIC` | Backend public URL (local: `http://localhost:3001`) | `http://localhost:3001` |

**Leave empty for now**: `AGENT_ID`, `AGENT_REGISTRY`, `IDENTITY_REGISTRY_ADDRESS`, `REPUTATION_REGISTRY_ADDRESS`, `CONTRACT_ADDRESS` (fill after Agent registration and Mint deploy).

Save `.env`.

---

## Step 3: Start backend (for registration file URL)

From repo root:

```bash
npm run backend
```

You should see `Backend running on port 3001`.

`http://localhost:3001/.well-known/agent-registration.json` may return 503 or error (normal until `AGENT_ID` / `AGENT_REGISTRY` are set).  
The **registration file URL** to use on 8004scan:

- Local: `http://localhost:3001/.well-known/agent-registration.json` (only from your machine; if 8004scan needs a public URL, deploy backend first).
- Public: `https://your-domain/.well-known/agent-registration.json`

---

## Step 4: Register Agent on 8004scan (do this first)

1. Open **[https://www.8004scan.io/create](https://www.8004scan.io/create)**.
2. **Connect wallet** (same address as in Step 2).
3. Fill the form, e.g.:
   - **Name**: e.g. `Story Scoring Agent`
   - **Description**: e.g. "Scores stories; score ≥60 grants 10 tokens"
   - **Registration URL**: URL from Step 3  
     - Local: `http://localhost:3001/.well-known/agent-registration.json`  
     - If site requires public URL, deploy backend first.
4. Choose the **chain** supported by 8004scan (same as the chain you will deploy Mint on).
5. Submit / confirm tx; creation completes.

---

## Step 5: Note agentId and agentRegistry, write to .env

After registration, on 8004scan detail or tx result you’ll see:

- **agentId** (number, e.g. `1`)
- **agentRegistry** (string, e.g. `eip155:11155111:0x...`)
- Possibly **Identity / Reputation Registry** addresses and **chain ID**

In repo root, edit `.env` and add:

```env
AGENT_ID=1
AGENT_REGISTRY=eip155:11155111:0x...
CHAIN_ID=11155111
```

If the page shows Identity / Reputation addresses, add:

```env
IDENTITY_REGISTRY_ADDRESS=0x...
REPUTATION_REGISTRY_ADDRESS=0x...
```

Save and **restart backend** (Ctrl+C, then `npm run backend`).

Visit `http://localhost:3001/.well-known/agent-registration.json`; you should see JSON with `registrations`, `agentId`, `agentRegistry`.

---

## Step 6: Compile and deploy Mint contract (EssayGatedToken, Story product)

Ensure `.env` has:

- `DEPLOYER_PRIVATE_KEY`, `ISSUER_ADDRESS`
- `RPC_URL`, `CHAIN_ID` (same as 8004scan chain, e.g. Sepolia)

Run (network name depends on 8004scan chain, e.g. sepolia):

```bash
npm run compile
npx hardhat run scripts/deploy.ts --network sepolia
```

Terminal will print the contract address, e.g.:

```
Mint contract (EssayGatedToken) deployed to: 0x...
```

Write it to `.env`:

```env
CONTRACT_ADDRESS=0x...
```

Ensure `ISSUER_PRIVATE_KEY` is set (backend needs it for signing).

---

## Step 7: Start backend again (if you just set CONTRACT_ADDRESS in Step 6)

If backend was stopped, from repo root:

```bash
npm run backend
```

---

## Step 8: Configure and start frontend

```bash
cd frontend
cp .env.example .env.local
```

Edit `frontend/.env.local`:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE` | Backend URL | `http://localhost:3001` |
| `VITE_CONTRACT_ADDRESS` | Mint contract from Step 6 | `0x...` |
| `VITE_REPUTATION_REGISTRY_ADDRESS` | Reputation registry from 8004scan | `0x...` |
| `VITE_AGENT_ID` | agentId from 8004scan | `1` |

Save, then:

```bash
npm run dev
```

Open the URL shown (usually `http://localhost:5173`).

---

## Step 9: Self-test flow

1. **Score**: Enter a story, click "Submit & Score"; you should see score and rationale.
2. **Feedback (optional)**: Click "Submit feedback to Agent (ERC-8004)", connect wallet, confirm; score is written to Reputation.
3. **Claim**: If score ≥60, click "Claim 10 Tokens", connect wallet, confirm; you should receive 10 tokens.

---

## Order summary (register on site first)

| Step | Action |
|------|--------|
| 0 | Wallet + testnet |
| 1 | Install deps |
| 2 | Set `.env` (keys, ISSUER_ADDRESS, PORT, CHAIN_ID, API_BASE_PUBLIC) |
| 3 | Start backend → get "registration file URL" |
| 4 | **Register Agent at 8004scan.io/create**; Registration URL = Step 3 URL |
| 5 | Note agentId, agentRegistry, etc.; write to `.env`; restart backend |
| 6 | Compile and deploy Mint contract; set CONTRACT_ADDRESS in `.env` |
| 7 | Start backend again if needed |
| 8 | Set `frontend/.env.local`; start frontend |
| 9 | Test: score → optional feedback → Claim |

Order is **register on site first, then deploy contracts**. If you get stuck at a step, note the step and error for debugging.
