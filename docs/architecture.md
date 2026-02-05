# System Architecture

## Overview

8004 Mint Protocol is a multi-layered decentralized application combining AI evaluation, on-chain token minting, intelligent staking, and autonomous LP management.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐           │
│    │   Web Frontend  │    │  Telegram Bot   │    │   Mobile App    │           │
│    │    (Vite SPA)   │    │   (MoltBot)     │    │   (Future)      │           │
│    └────────┬────────┘    └────────┬────────┘    └────────┬────────┘           │
└─────────────┼──────────────────────┼──────────────────────┼─────────────────────┘
              │                      │                      │
              ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│    ┌─────────────────────────────────────────────────────────────────┐          │
│    │                      Backend API Server                          │          │
│    │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │          │
│    │  │ Essay API  │  │ Scoring    │  │ Signature  │  │ Points     │ │          │
│    │  │ Endpoints  │  │ Service    │  │ Service    │  │ Calculator │ │          │
│    │  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │          │
│    └─────────────────────────────────────────────────────────────────┘          │
│                                                                                  │
│    ┌─────────────────────────────────────────────────────────────────┐          │
│    │                      Trading Bot Engine                          │          │
│    │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │          │
│    │  │ AI Agent   │  │ Market     │  │ Trading    │  │ User       │ │          │
│    │  │ (GPT-4o)   │  │ Data Feed  │  │ Engine     │  │ Manager    │ │          │
│    │  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │          │
│    └─────────────────────────────────────────────────────────────────┘          │
│                                                                                  │
│    ┌─────────────────────────────────────────────────────────────────┐          │
│    │                      LP Locker Agent                             │          │
│    │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │          │
│    │  │ State      │  │ Policy     │  │ Execution  │  │ Constraint │ │          │
│    │  │ Observer   │  │ Network    │  │ Engine     │  │ Optimizer  │ │          │
│    │  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │          │
│    └─────────────────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────────┘
              │                                               │
              ▼                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              INTEGRATION LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│    │   OpenAI    │  │  KyberSwap  │  │ DexScreener │  │   Etherscan │          │
│    │   GPT-4o    │  │  Aggregator │  │    API      │  │     API     │          │
│    └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BLOCKCHAIN LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│    ┌───────────────────────────────────────────────────────────────────┐        │
│    │                      Ethereum Mainnet                              │        │
│    │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐         │        │
│    │  │EssayGatedToken│  │StoryStakingV2 │  │   LPLocker    │         │        │
│    │  │   (ERC-20)    │  │   (Staking)   │  │  (EIP-8004)   │         │        │
│    │  └───────────────┘  └───────────────┘  └───────────────┘         │        │
│    │  ┌───────────────┐  ┌───────────────────────────────────┐        │        │
│    │  │  Remittance   │  │           Uniswap V4 Pool         │        │        │
│    │  │   (P2P OTC)   │  │        STORY / USDC Liquidity     │        │        │
│    │  └───────────────┘  └───────────────────────────────────┘        │        │
│    └───────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Frontend (Vite SPA)

**Technology Stack:**
- Vite 5.x (Build tool)
- TypeScript 5.x
- Tailwind CSS + Material Design 3
- Ethers.js 6.x

**Key Features:**
- Single Page Application with client-side routing
- Wallet connection (MetaMask, WalletConnect)
- Real-time staking dashboard
- Essay submission interface
- MoltBot introduction page

**File Structure:**
```
frontend/
├── src/
│   ├── main.ts           # Entry point (~3000 LOC)
│   └── index.css         # Tailwind + MD3 styles
├── public/
│   ├── favicon.png
│   ├── moltbot-logo.png
│   └── story-logo.png
└── vite.config.ts
```

### 2. Backend API Server

**Technology Stack:**
- Node.js 18+
- Express.js
- TypeScript
- OpenAI SDK

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/score` | POST | Submit essay for AI scoring |
| `/api/sign` | POST | Generate EIP-712 signature |
| `/api/points` | GET | Calculate pending points |
| `/api/health` | GET | Health check |

### 3. MoltBot Trading Agent

**Architecture:**

```
┌────────────────────────────────────────────────────────────┐
│                     MoltBot System                          │
├────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Telegram Interface                 │   │
│  │  Commands: /start /balance /price /config /trade    │   │
│  └────────────────────────┬────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    User Manager                      │   │
│  │  • Wallet Generation  • Strategy Config  • Auth     │   │
│  └────────────────────────┬────────────────────────────┘   │
│                           │                                 │
│           ┌───────────────┼───────────────┐                │
│           │               │               │                 │
│           ▼               ▼               ▼                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ AI Agent   │  │ Market     │  │ Trading    │           │
│  │ (GPT-4o)   │  │ Data       │  │ Engine     │           │
│  │            │  │            │  │            │           │
│  │ • Analysis │  │ • Price    │  │ • KyberAPI │           │
│  │ • Decision │  │ • Volume   │  │ • Swap     │           │
│  │ • Explain  │  │ • Trend    │  │ • Balance  │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└────────────────────────────────────────────────────────────┘
```

**Trading Cycle (Every 1 Minute):**
1. Fetch market data (DexScreener API)
2. Get user portfolio state
3. AI analyzes and decides action
4. Execute trade if recommended
5. Notify user with explanation

### 4. Neural LP Locker Agent

**Architecture:**

```
┌────────────────────────────────────────────────────────────────────────────┐
│                      EIP-8004 Neural LP Locker                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  I. Multimodal State Observation Space                                │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │  │
│  │  │ On-Chain Data  │  │ EIP-8004       │  │ Health Metrics │          │  │
│  │  │ (Price, Vol)   │  │ Signals        │  │ (TVL, Risk)    │          │  │
│  │  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘          │  │
│  │          │                   │                   │                    │  │
│  │          └───────────────────┼───────────────────┘                    │  │
│  │                              ▼                                        │  │
│  │                    ┌─────────────────┐                                │  │
│  │                    │ State Aggregator │                               │  │
│  │                    └────────┬────────┘                                │  │
│  └─────────────────────────────┼────────────────────────────────────────┘  │
│                                │                                            │
│                                ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  II. Neural Policy Network                                            │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    GPT-4o Decision Engine                       │  │  │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │  │  │
│  │  │  │Market Analysis│  │Risk Assessment│  │Constraint Optimizer │  │  │  │
│  │  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                              │                                        │  │
│  │                              ▼                                        │  │
│  │                    ┌─────────────────┐                                │  │
│  │                    │  AI Decision    │                                │  │
│  │                    │  (Action Type)  │                                │  │
│  │                    └────────┬────────┘                                │  │
│  └─────────────────────────────┼────────────────────────────────────────┘  │
│                                │                                            │
│                                ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  III. Execution Layer                                                 │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │  │
│  │  │ TX Generator   │  │ EIP-712 Signer │  │ Chain Submit   │          │  │
│  │  │ (Build TX)     │  │ (Sign Action)  │  │ (Execute)      │          │  │
│  │  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘          │  │
│  │          │                   │                   │                    │  │
│  │          └───────────────────┼───────────────────┘                    │  │
│  │                              ▼                                        │  │
│  │                    ┌─────────────────┐                                │  │
│  │                    │  LPLocker.sol   │                                │  │
│  │                    │ (Smart Contract)│                                │  │
│  │                    └─────────────────┘                                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│                    ◀── Feedback Loop (State Update) ──▶                    │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Smart Contracts

### Contract Summary

| Contract | Purpose | Key Features |
|----------|---------|--------------|
| **EssayGatedToken** | AI-gated ERC-20 | EIP-712 signatures, nonce management, single claim |
| **StoryStakingV2** | Dynamic staking | Multipliers, VIP tiers, referrals |
| **LPLocker** | Neural LP management | AI actions, health monitoring, modular locks |
| **Remittance** | P2P OTC trading | Escrow, multi-currency |
| **RemitToken** | Utility token | Standard ERC-20 |

### EssayGatedToken.sol

```solidity
// Core Functions
function claim(
    string calldata essayHash,
    uint8 score,
    bytes calldata signature
) external payable

// Security Features
- EIP-712 signature verification
- Nonce-based replay protection
- Score threshold (≥60)
- Single claim per address
```

### StoryStakingV2.sol

```solidity
// Staking Logic
function stake(uint256 amount, LockPeriod period) external
function unstake(uint256 stakeId) external

// Multiplier System
enum LockPeriod { Flexible, Days30, Days90, Days180, Days365 }
// Multipliers: 1.0x, 1.5x, 2.5x, 4.0x, 8.0x

// VIP Tiers
function getVipTier(address user) view returns (uint8)
// Tiers based on total staked amount
```

### LPLocker.sol

```solidity
// Lock Types
enum LockType { Flexible, TimeLocked, ConditionalAI, Permanent }

// AI Action Execution
function executeAIAction(AIAction calldata action, bytes signature) external

// Health Monitoring
enum HealthStatus { Healthy, Warning, Critical, Emergency }
function updateMarketState(...) external
```

### ClankerFactory.sol

```solidity
// Token Deployment
function deployToken(
    string calldata name,
    string calldata symbol,
    uint256 totalSupply,
    address creator,
    uint256 deadline,
    bytes calldata signature
) external payable returns (address tokenAddress, uint256 deployId)

// Liquidity Addition
function addLiquidity(uint256 deployId) external payable

// EIP-712 Authorization
bytes32 public constant DEPLOY_TYPEHASH = keccak256(
    "Deploy(string name,string symbol,uint256 totalSupply,address creator,uint256 nonce,uint256 deadline)"
);
```

---

## Data Flow

### Essay Claim Flow

```
User ──▶ Frontend ──▶ Backend ──▶ OpenAI ──▶ Backend ──▶ Frontend ──▶ Contract
          │           │           │           │           │           │
       Submit      Score       GPT-4o      Sign if     Display    Execute
       Essay      Request      Eval       ≥60         Result      Claim
```

### MoltBot Trading Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     1-Minute Trading Cycle                       │
├─────────────────────────────────────────────────────────────────┤
│  [1] Market Data        [2] Portfolio         [3] AI Decision   │
│  DexScreener ──────▶    On-chain    ──────▶   GPT-4o           │
│  • Price               • STORY bal          • Analyze data     │
│  • Volume              • USDC bal           • Risk level       │
│  • Liquidity           • ETH bal            • Trade decision   │
│                                                                  │
│           ┌──────────────────────────────────────────┐          │
│           │           [4] Execution                   │          │
│           │  BUY    ───▶  KyberSwap: USDC → STORY    │          │
│           │  SELL   ───▶  KyberSwap: STORY → USDC    │          │
│           │  HOLD   ───▶  No action, notify user     │          │
│           └──────────────────────────────────────────┘          │
│                                                                  │
│  [5] User Notification with AI reasoning                        │
└─────────────────────────────────────────────────────────────────┘
```

### LP Locker Flow

```
[Observation] ──▶ [Policy Network] ──▶ [Execution] ──▶ [Contract]
      │                  │                  │              │
   Fetch             Analyze             Sign TX        Execute
   Market            & Decide           (EIP-712)      On-chain
   State                                                   │
      │                                                    │
      └◀───────────── Feedback Loop ◀──────────────────────┘
```

### Clanker Token Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   Clanker Token Deployment Flow                  │
├─────────────────────────────────────────────────────────────────┤
│  [1] Social Signal        [2] AI Intent         [3] Deployment  │
│  Farcaster/Twitter ────▶  GPT-4o Parser  ────▶  ClankerFactory │
│  • "@clanker launch..."   • Extract name       • Deploy ERC-20 │
│  • User address           • Extract symbol     • EIP-712 sign  │
│  • Engagement metrics     • Confidence score   • Create LP     │
│                                                                  │
│  [4] User Notification                                           │
│  Reply with token address and Uniswap pool link                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Security Layers                              │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Transport Security                                    │
│  • HTTPS/TLS for all API communications                        │
│  • Telegram Bot Token authentication                           │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Application Security                                  │
│  • Rate limiting on API endpoints                              │
│  • Input validation and sanitization                           │
│  • Environment variable isolation                              │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Cryptographic Security                                │
│  • EIP-712 typed data signatures                               │
│  • Per-address nonces for replay protection                    │
│  • Keccak256 hashing for verification                          │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: Smart Contract Security                               │
│  • OpenZeppelin battle-tested libraries                        │
│  • ReentrancyGuard on all state-changing functions            │
│  • Pausable emergency circuit breaker                          │
│  • Access control with Ownable                                 │
├─────────────────────────────────────────────────────────────────┤
│  Layer 5: Wallet Security (MoltBot/LP Locker)                   │
│  • HD wallet derivation (ethers.Wallet.createRandom)          │
│  • Private keys stored encrypted                               │
│  • User-controlled export functionality                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Production Infrastructure                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Cloudflare CDN                        │    │
│  │                    (Frontend Hosting)                    │    │
│  │                    8004mint.com                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                               │                                  │
│                               ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 Production Server                        │    │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐   │    │
│  │  │     PM2         │  │      Services Running       │   │    │
│  │  │  (Process Mgr)  │  │  ┌──────────────────────┐   │   │    │
│  │  │                 │  │  │  Backend API (:3001) │   │   │    │
│  │  │  • Auto restart │  │  └──────────────────────┘   │   │    │
│  │  │  • Monitoring   │  │  ┌──────────────────────┐   │   │    │
│  │  │  • Clustering   │  │  │  MoltBot (Telegram)  │   │   │    │
│  │  │                 │  │  └──────────────────────┘   │   │    │
│  │  │                 │  │  ┌──────────────────────┐   │   │    │
│  │  │                 │  │  │  LP Locker Agent     │   │   │    │
│  │  │                 │  │  └──────────────────────┘   │   │    │
│  │  └─────────────────┘  └─────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                               │                                  │
│                               ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  External Services                       │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐            │    │
│  │  │  OpenAI   │  │ KyberSwap │  │DexScreener│            │    │
│  │  │  GPT-4o   │  │   API     │  │   API     │            │    │
│  │  └───────────┘  └───────────┘  └───────────┘            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                               │                                  │
│                               ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Ethereum Mainnet                        │    │
│  │         (via RPC: Infura / Alchemy / DRPC)              │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. Clanker AI Agent

**Architecture:**

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          Clanker AI Agent System                            │
├────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   Social Signal Monitoring                           │   │
│  │  Platforms: Farcaster, Twitter, Discord                             │   │
│  └────────────────────────┬────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    AI Intent Parser (GPT-4o)                         │   │
│  │  • Extract token name & symbol  • Validate creator address          │   │
│  │  • Calculate confidence score   • Filter spam requests              │   │
│  └────────────────────────┬────────────────────────────────────────────┘   │
│                           │                                                 │
│           ┌───────────────┼───────────────┐                                │
│           │               │               │                                 │
│           ▼               ▼               ▼                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                           │
│  │ EIP-712    │  │ Token      │  │ LP Pool    │                           │
│  │ Signer     │  │ Deployer   │  │ Creator    │                           │
│  │            │  │            │  │            │                           │
│  │ • Sign TX  │  │ • ERC-20   │  │ • Uniswap  │                           │
│  │ • Nonce    │  │ • Mint     │  │ • V3 Pool  │                           │
│  │ • Deadline │  │ • Transfer │  │ • Liquidity│                           │
│  └────────────┘  └────────────┘  └────────────┘                           │
│                           │                                                 │
│                           ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     ClankerFactory.sol                               │   │
│  │  Contract: 0x6dd65e52eafd79a989fd0000d2ed85c0a7fde52d (Base)        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

**Deployment Flow:**
1. Social signal detected (e.g., "@clanker launch DogeMoon $DMOON")
2. AI parses intent and validates request
3. Agent signs EIP-712 deployment message
4. ClankerFactory deploys new ERC-20 token
5. Automatic LP creation on Uniswap V3
6. Reply to user with token address

**Test Activity:**

The Clanker Agent was tested using wallet `0x6dd65e52eafd79a989fd0000d2ed85c0a7fde52d` on Base network:

| Token | Symbol | Supply | Status |
|-------|--------|--------|--------|
| TestMoon | TMOON | 1B | ✅ Deployed |
| DemoToken | DEMO | 500M | ✅ Deployed |
| SampleCoin | SMPL | 1B | ✅ Deployed |

Total LP Created: 0.3 ETH | Success Rate: 100%

---

## Technology Rationale

| Decision | Technology | Rationale |
|----------|------------|-----------|
| Frontend Framework | Vanilla TS + Vite | Minimal bundle size, fast build times |
| Smart Contracts | Solidity 0.8.20 | Native overflow checks, latest features |
| Security Libraries | OpenZeppelin 5.0 | Battle-tested, audited implementations |
| Bot Framework | Telegraf | Type-safe, well-documented Telegram integration |
| AI Provider | OpenAI GPT-4o | Best-in-class reasoning for trading/locking decisions |
| DEX Aggregator | KyberSwap | Superior routing for low-liquidity tokens |
| Market Data | DexScreener | Real-time DEX data, comprehensive coverage |
| Process Manager | PM2 | Production-grade Node.js deployment |
