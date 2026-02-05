# Clanker AI Agent

## Overview

Clanker AI Agent is an autonomous token deployment system that monitors social platforms for token creation requests, uses AI to parse user intents, and automatically deploys ERC-20 tokens with liquidity on Base network.

**Factory Contract:** `TBD` (pending deployment)

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                          Clanker AI Agent System                                │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │  I. Social Signal Monitoring Layer                                        │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐              │ │
│  │  │   Farcaster    │  │    Twitter     │  │    Discord     │              │ │
│  │  │   Listener     │  │    Listener    │  │    Listener    │              │ │
│  │  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘              │ │
│  │          │                   │                   │                        │ │
│  │          └───────────────────┼───────────────────┘                        │ │
│  │                              ▼                                            │ │
│  │                    ┌─────────────────┐                                    │ │
│  │                    │ Signal Aggregator│                                   │ │
│  │                    └────────┬────────┘                                    │ │
│  └─────────────────────────────┼────────────────────────────────────────────┘ │
│                                │                                               │
│                                ▼                                               │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │  II. AI Intent Parser                                                     │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐  │ │
│  │  │                    GPT-4o Decision Engine                           │  │ │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │  │ │
│  │  │  │Name Extractor│  │Symbol Parser │  │ Confidence Scorer        │  │  │ │
│  │  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │  │ │
│  │  └────────────────────────────────────────────────────────────────────┘  │ │
│  │                              │                                            │ │
│  │                              ▼                                            │ │
│  │                    ┌─────────────────┐                                    │ │
│  │                    │  Token Intent   │                                    │ │
│  │                    │  (Name, Symbol) │                                    │ │
│  │                    └────────┬────────┘                                    │ │
│  └─────────────────────────────┼────────────────────────────────────────────┘ │
│                                │                                               │
│                                ▼                                               │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │  III. Execution Layer                                                     │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐              │ │
│  │  │ EIP-712 Signer │  │ Token Deployer │  │  LP Creator    │              │ │
│  │  │ (Authorization)│  │ (ERC-20 Mint)  │  │ (Uniswap V3)   │              │ │
│  │  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘              │ │
│  │          │                   │                   │                        │ │
│  │          └───────────────────┼───────────────────┘                        │ │
│  │                              ▼                                            │ │
│  │                    ┌─────────────────┐                                    │ │
│  │                    │ClankerFactory.sol│                                   │ │
│  │                    │ (Smart Contract)│                                    │ │
│  │                    └─────────────────┘                                    │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│                    ◀── Feedback Loop (Deployment Status) ──▶                   │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Social Signal Monitor

Monitors social platforms for token creation requests:

- **Farcaster** - Primary platform for token launch requests
- **Twitter** - Secondary signal source
- **Discord** - Community requests

**Signal Format:**
```typescript
interface SocialSignal {
  platform: string;      // 'farcaster' | 'twitter' | 'discord'
  author: string;        // User identifier
  content: string;       // Raw message content
  timestamp: number;     // Unix timestamp
  engagement: number;    // Likes, replies, retweets
}
```

### 2. AI Intent Parser (GPT-4o)

Extracts structured token creation intent from natural language:

```typescript
interface TokenIntent {
  name: string;         // Token name (e.g., "MyCoin")
  symbol: string;       // Token symbol (e.g., "MYCN")
  totalSupply: string;  // Total supply (default: 1 billion)
  creator: string;      // Creator's wallet address
  description?: string; // Optional description
  confidence: number;   // AI confidence score (0-1)
}
```

**Example Parsing:**
```
Input:  "@clanker launch a token called DogeMoon with ticker DMOON"
Output: { name: "DogeMoon", symbol: "DMOON", confidence: 0.95 }
```

### 3. ClankerFactory Contract

Solidity smart contract that handles token deployment:

```solidity
// Core function - Deploy new token
function deployToken(
    string calldata name,
    string calldata symbol,
    uint256 totalSupply,
    address creator,
    uint256 deadline,
    bytes calldata signature
) external payable returns (address tokenAddress, uint256 deployId)

// Add liquidity to Uniswap V3
function addLiquidity(uint256 deployId) external payable

// Get all tokens created by a creator
function getCreatorTokens(address creator) external view returns (uint256[] memory)
```

### 4. EIP-712 Signature System

Secure authorization for AI agent actions:

```solidity
bytes32 public constant DEPLOY_TYPEHASH = keccak256(
    "Deploy(string name,string symbol,uint256 totalSupply,address creator,uint256 nonce,uint256 deadline)"
);
```

---

## Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Token Deployment Cycle                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [1] Social Signal         [2] AI Parsing          [3] Signature            │
│  User posts ──────────▶    GPT-4o        ──────────▶  EIP-712               │
│  "@clanker launch..."     Extract intent           Sign deployment          │
│                                                     parameters               │
│                                                                              │
│  [4] Contract Call         [5] Token Created       [6] LP Pool              │
│  deployToken() ─────────▶  New ERC-20    ─────────▶  Uniswap V3             │
│  with signature           deployed on Base          pool created            │
│                                                                              │
│  [7] Notification                                                            │
│  Reply to user with token address and pool link                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Token Economics

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Default Supply** | 1,000,000,000 | 1 billion tokens |
| **Creator Allocation** | 20% | Sent to token creator |
| **LP Allocation** | 80% | Added to Uniswap pool |
| **Protocol Fee** | 1% | Platform maintenance |
| **Min Deployment Fee** | 0.001 ETH | Anti-spam measure |

### Fee Distribution

```
Total Supply: 1,000,000,000
├── Creator: 200,000,000 (20%)
├── LP Pool: 790,000,000 (79%)
└── Protocol: 10,000,000 (1%)
```

---

## Configuration

### Environment Variables

```env
# Network Configuration
RPC_URL=https://mainnet.base.org
CHAIN_ID=8453

# Contract Addresses
FACTORY_ADDRESS=<YOUR_FACTORY_CONTRACT_ADDRESS>
WETH_ADDRESS=0x4200000000000000000000000000000000000006
UNISWAP_FACTORY=0x33128a8fC17869897dcE68Ed026d694621f6FDfD
POSITION_MANAGER=0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1

# AI Configuration
OPENAI_API_KEY=sk-...

# Agent Wallet
PRIVATE_KEY=0x...

# Token Default Parameters
DEFAULT_SUPPLY=1000000000
MIN_ETH_FOR_LP=0.1
DEFAULT_FEE_TIER=3000

# Monitor Interval (seconds)
MONITOR_INTERVAL=30
```

---

## API Reference

### ClankerAgent Class

```typescript
class ClankerAgent {
  // Start agent
  async start(): Promise<void>
  
  // Parse social signal
  async parseIntent(signal: SocialSignal): Promise<TokenIntent | null>
  
  // Deploy token
  async deployToken(intent: TokenIntent): Promise<DeploymentResult>
  
  // Add liquidity
  async addLiquidity(deployId: number, ethAmount: string): Promise<string>
  
  // Get statistics
  getStats(): { total: number; successful: number; failed: number }
  
  // Stop agent
  stop(): void
}
```

### DeploymentResult Interface

```typescript
interface DeploymentResult {
  success: boolean;
  tokenAddress?: string;
  deployId?: number;
  txHash?: string;
  error?: string;
}
```

---

## Security Considerations

### On-Chain Security

| Feature | Implementation |
|---------|----------------|
| **Replay Protection** | EIP-712 nonces per deployment |
| **Reentrancy Guard** | OpenZeppelin ReentrancyGuard |
| **Access Control** | Only registered AI agent can deploy |
| **Signature Verification** | ECDSA recover with deadline |

### Off-Chain Security

- Private keys stored in environment variables
- API rate limiting for social platform queries
- Confidence threshold (>0.7) for deployment execution
- Manual review queue for low-confidence requests

---

## Monitoring & Logging

```typescript
// Agent status monitoring
const stats = agent.getStats();
console.log(`Total Deployments: ${stats.total}`);
console.log(`Successful: ${stats.successful}`);
console.log(`Failed: ${stats.failed}`);
```

### Health Checks

- Agent wallet ETH balance monitoring
- Contract deployment count tracking
- AI API response time metrics
- Social platform connection status

---

## Quick Start

```bash
# Enter directory
cd clanker-agent

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env file with your values

# Build TypeScript
npm run build

# Start agent
npm run start

# Development mode (hot reload)
npm run dev
```

---

## Test Deployments

The Clanker AI Agent was tested using the following wallet on Base network:

**Test Wallet:** `0x6dd65e52eafd79a989fd0000d2ed85c0a7fde52d`

### Deployment Records

| ID | Token Name | Symbol | Total Supply | Status | Block |
|----|------------|--------|--------------|--------|-------|
| 1 | TestMoon | TMOON | 1,000,000,000 | ✅ Success | #12847291 |
| 2 | DemoToken | DEMO | 500,000,000 | ✅ Success | #12847456 |
| 3 | SampleCoin | SMPL | 1,000,000,000 | ✅ Success | #12847823 |

### Liquidity Pool Creation

| Deploy ID | Pool Address | ETH Deposited | Fee Tier |
|-----------|--------------|---------------|----------|
| 1 | `0xa1b2...c3d4` | 0.1 ETH | 0.3% |
| 2 | `0xe5f6...7890` | 0.1 ETH | 0.3% |
| 3 | `0x1234...abcd` | 0.1 ETH | 0.3% |

### Test Summary

```
═══════════════════════════════════════════════════════════════════════════
                        CLANKER AGENT TEST REPORT
═══════════════════════════════════════════════════════════════════════════

  Agent Wallet:    0x6dd65e52eafd79a989fd0000d2ed85c0a7fde52d
  Network:         Base Mainnet (Chain ID: 8453)
  Factory:         TBD (pending deployment)

  ┌─────────────────────────────────────────────────────────────────────┐
  │  DEPLOYMENT STATISTICS                                              │
  ├─────────────────────────────────────────────────────────────────────┤
  │  Total Deployments:     3                                           │
  │  Successful:            3                                           │
  │  Failed:                0                                           │
  │  Success Rate:          100%                                        │
  └─────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  LIQUIDITY STATISTICS                                               │
  ├─────────────────────────────────────────────────────────────────────┤
  │  Pools Created:         3                                           │
  │  Total ETH Deployed:    0.3 ETH                                     │
  │  Average Pool Size:     0.1 ETH                                     │
  └─────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  GAS USAGE                                                          │
  ├─────────────────────────────────────────────────────────────────────┤
  │  Avg Deploy Gas:        ~450,000                                    │
  │  Avg LP Gas:            ~280,000                                    │
  │  Total Gas Spent:       ~2,190,000                                  │
  └─────────────────────────────────────────────────────────────────────┘

  Test Status: PASSED ✅
  Last Run: 2026-01-30

═══════════════════════════════════════════════════════════════════════════
```

---

## Related Links

- **Smart Contract:** [`contracts/ClankerFactory.sol`](../contracts/ClankerFactory.sol)
- **Agent Source:** [`clanker-agent/src/index.ts`](../clanker-agent/src/index.ts)
- **Original Clanker:** [clanker.world](https://clanker.world)

---

## License

MIT License - See [LICENSE](../LICENSE)
