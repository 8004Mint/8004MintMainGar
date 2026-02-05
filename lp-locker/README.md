# EIP-8004 Neural LP Locker Agent

<p align="center">
  <img src="./architecture.svg" alt="EIP-8004 Neural Locking Flow" width="100%">
</p>

AI-powered autonomous liquidity provider token locking system with dynamic risk management and real-time market analysis.

---

## Overview

The Neural LP Locker is an advanced DeFi infrastructure component that uses AI decision-making to dynamically manage LP token locks based on market conditions. Built on the EIP-8004 standard, it provides:

- **Autonomous Operation** - AI agent makes lock/unlock decisions without manual intervention
- **Risk Management** - Health status monitoring with automatic safety measures
- **Constraint Optimization** - Ensures all actions comply with configurable safety bounds
- **On-chain Verification** - EIP-712 signatures for secure AI action execution

---

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │  I. Observation  │────▶│   II. Agent     │────▶│ III. Execution  │       │
│  │     Space        │     │     Core        │     │     Layer       │       │
│  │                  │     │                 │     │                 │       │
│  │  state-observer  │     │ ai-policy-net   │     │ execution-engine│       │
│  │       .ts        │     │      .ts        │     │      .ts        │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│           ▲                                               │                  │
│           │                                               │                  │
│           └───────────── Feedback Loop ◀──────────────────┘                  │
│                        (State Update)                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Module Mapping

| Component | File | Description |
|-----------|------|-------------|
| **State Observation** | `state-observer.ts` | Aggregates market data, on-chain signals, health metrics |
| **Policy Network** | `ai-policy-network.ts` | GPT-4o decision engine with constraint optimization |
| **Execution Engine** | `execution-engine.ts` | Transaction building, signing, and submission |
| **Smart Contract** | `LPLocker.sol` | On-chain lock management with AI action verification |
| **Orchestrator** | `index.ts` | Main loop coordinating all modules |

---

## Components

### 1. State Observer

Collects and fuses multimodal market data:

**Market Data Vector ($m_t$)**
- Price, 24h change, volume, liquidity
- Buy/sell pressure ratio
- Transaction counts

**Modular Signals ($e_t$)**
- Total locked amount
- Active locks by type
- Pending unlocks
- Average lock duration

**Health Metrics ($r_t$)**
- TVL (Total Value Locked)
- Volatility index
- Concentration risk
- Network congestion

### 2. AI Policy Network

GPT-4o powered decision engine:

**Inputs:**
- Fused market state
- Active lock records
- Constraint configuration

**Outputs:**
```typescript
interface AIDecision {
  action: ActionType;      // Lock | Unlock | ExtendLock | EmergencyUnlock
  lockId?: number;
  amount?: bigint;
  duration?: number;
  confidence: number;      // 0-1
  reasoning: string;       // Audit trail
  riskAssessment: string;  // LOW | MEDIUM | HIGH | CRITICAL
}
```

**Constraint Optimization:**
- Maximum unlock ratio per action
- Minimum lock duration
- Gas price limits
- Cooldown periods

### 3. Execution Engine

Handles blockchain interaction:

- EIP-712 signature generation
- Gas optimization
- Transaction submission
- State synchronization

### 4. Smart Contract (LPLocker.sol)

**Lock Types:**

| Type | Description | Unlock Condition |
|------|-------------|------------------|
| `Flexible` | Unlock anytime | Immediate (with penalty) |
| `TimeLocked` | Fixed duration | After expiry |
| `ConditionalAI` | AI-controlled | AI action required |
| `Permanent` | Irreversible | Never |

**Health Status:**

| Status | Trigger | Actions Allowed |
|--------|---------|-----------------|
| Healthy | Normal | All |
| Warning | Elevated risk | All (caution) |
| Critical | High risk | Unlock, Emergency |
| Emergency | Severe | Emergency only, auto-pause |

---

## Quick Start

### Installation

```bash
cd lp-locker
npm install
```

### Configuration

```bash
cp .env.example .env
```

Edit `.env`:
```env
RPC_URL=https://eth.llamarpc.com
LP_LOCKER_ADDRESS=0x...
LP_TOKEN_ADDRESS=0x...
DEXSCREENER_PAIR_ID=0x...
OPENAI_API_KEY=sk-...
PRIVATE_KEY=0x...
```

### Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

---

## Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `RPC_URL` | Ethereum RPC endpoint | - |
| `LP_LOCKER_ADDRESS` | Deployed contract address | - |
| `LP_TOKEN_ADDRESS` | LP token to manage | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `PRIVATE_KEY` | Agent wallet private key | - |
| `DEXSCREENER_PAIR_ID` | DEX pair for market data | - |
| `AI_MODEL` | OpenAI model | `gpt-4o-mini` |
| `CYCLE_INTERVAL` | Decision cycle (cron) | `*/5 * * * *` |
| `MAX_UNLOCK_RATIO` | Max unlock per action | `0.1` (10%) |
| `MAX_GAS_PRICE` | Skip if gas exceeds | `100` Gwei |
| `MIN_LOCK_DURATION` | Minimum lock time | `86400` (1 day) |

---

## Decision Cycle

Every cycle (default 5 minutes):

```
1. [Observation] Fetch market state from all sources
   ├── DexScreener API (price, volume, liquidity)
   ├── On-chain queries (lock records)
   └── Derived metrics (volatility, risk scores)

2. [Analysis] AI analyzes state
   ├── Market trend analysis
   ├── Risk assessment
   └── Constraint compliance check

3. [Decision] Generate optimal action
   ├── Action type (Lock/Unlock/Extend/Emergency)
   ├── Parameters (amount, duration)
   └── Confidence score

4. [Execution] If approved, execute on-chain
   ├── Build transaction
   ├── Sign with EIP-712
   └── Submit and monitor

5. [Feedback] State updates for next cycle
```

---

## Safety Features

### Constraint Optimization Module

```typescript
interface ConstraintConfig {
  maxUnlockRatio: 0.1;      // Max 10% unlock per action
  minLockDuration: 86400;    // Min 1 day lock
  maxGasPrice: 100;          // Skip if gas > 100 Gwei
  emergencyThreshold: 2;     // Critical health status
  cooldownPeriod: 300;       // 5 min between actions
}
```

### Automatic Protections

- **Low Confidence Skip** - Actions with < 60% confidence are not executed
- **Gas Price Check** - High gas triggers automatic HOLD
- **Emergency Pause** - Contract pauses when health is Emergency
- **Cooldown Enforcement** - Prevents action spam

---

## Logging

```
═══════════════════════════════════════════════════════════════
          EIP-8004 Neural LP Locker Agent Starting
═══════════════════════════════════════════════════════════════
Wallet: 0x...
LP Locker: 0x...
AI Model: gpt-4o-mini
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────┐
│  Cycle #1 - 2026-01-30T12:00:00.000Z                   │
└─────────────────────────────────────────────────────────┘

[Phase I] Observing state...
  • Price: $0.001234
  • 24h Change: +5.2%
  • TVL: $15,000
  • Health: Healthy
  • Active Locks: 12

[Phase II] AI analyzing...
  • Action: Lock
  • Confidence: 85.0%
  • Risk: LOW
  • Reasoning: Bullish market conditions with increasing volume...

[Phase III] Executing action...
  ✓ Success! TX: 0xabc...
  • Block: 19234567
  • Gas Used: 145000

[Cycle] Completed in 2340ms
```

---

## API Reference

### StateObserver

```typescript
const observer = new StateObserver(config);
const state: FusedState = await observer.getFusedState();
```

### AIPolicyNetwork

```typescript
const policy = new AIPolicyNetwork(config);
const decision: AIDecision = await policy.analyzeAndDecide(state, activeLocks);
```

### ExecutionEngine

```typescript
const engine = new ExecutionEngine(config);
const result: ExecutionResult = await engine.executeDecision(decision, state);
```

---

## Security

- **Private Keys** - Never committed, stored in `.env`
- **EIP-712 Signatures** - All AI actions cryptographically signed
- **Audit Trail** - All decisions logged with reasoning
- **Access Control** - Contract functions protected by ownership
- **Emergency Circuit** - Auto-pause in critical conditions

---

## Files

```
lp-locker/
├── src/
│   ├── index.ts              # Main orchestrator
│   ├── state-observer.ts     # Market data aggregation
│   ├── ai-policy-network.ts  # GPT-4o decision engine
│   └── execution-engine.ts   # On-chain execution
├── architecture.svg          # System diagram
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## License

MIT License - see [LICENSE](../LICENSE)
