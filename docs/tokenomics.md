# 📈 Tokenomics

## STORY Token Overview

**STORY** is an AI-gated ERC-20 token that can only be minted by users who submit quality content evaluated by machine learning models.

---

## Token Specifications

| Property | Value |
|----------|-------|
| **Name** | STORY |
| **Symbol** | STORY |
| **Decimals** | 18 |
| **Total Supply** | 1,000,000 STORY |
| **Chain** | Ethereum Mainnet |
| **Contract** | `0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e` |
| **Standard** | ERC-20 + EIP-712 |

---

## Distribution

```
┌─────────────────────────────────────────────────────────────┐
│                   STORY Token Distribution                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │               Initial Liquidity (40%)                 │  │
│   │                    400,000 STORY                      │  │
│   │        Deployed to Uniswap V4 STORY/USDC Pool        │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │               User Claims (60%)                       │  │
│   │                    600,000 STORY                      │  │
│   │        Available through AI-gated claiming            │  │
│   │        100 STORY per successful submission            │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Distribution Breakdown:
█████████████████░░░░░░░░░░░░░░░░░░░░░░░  40% - Liquidity Pool
░░░░░░░░░░░░░░░░░██████████████████████  60% - User Claims
```

---

## Claiming Mechanism

### Requirements

1. **Submit Original Content** - Write an essay or creative piece
2. **AI Evaluation** - GPT-4o scores the submission (0-100)
3. **Minimum Score** - Must achieve ≥60 to qualify
4. **Claim Fee** - 10 USDC per claim (covers gas + protocol fee)
5. **One-Time Claim** - Each wallet can only claim once

### Claim Process Flow

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│   User     │───▶│  Submit    │───▶│    AI      │───▶│   Score    │
│  Writes    │    │   Essay    │    │  Scoring   │    │   ≥ 60?    │
└────────────┘    └────────────┘    └────────────┘    └─────┬──────┘
                                                            │
                                                      ┌─────┴─────┐
                                                      │           │
                                                      ▼           ▼
                                                    [YES]       [NO]
                                                      │           │
                                                      ▼           ▼
                                                ┌──────────┐ ┌──────────┐
                                                │ Generate │ │  Reject  │
                                                │Signature │ │  Claim   │
                                                └────┬─────┘ └──────────┘
                                                     │
                                                     ▼
                                                ┌──────────┐
                                                │ On-chain │
                                                │  Claim   │
                                                │ 100 STORY│
                                                └──────────┘
```

### Signature Verification (EIP-712)

The claiming process uses EIP-712 typed data signatures for security:

```solidity
struct ClaimData {
    address claimer;      // User's wallet address
    string essayHash;     // Keccak256 hash of essay content
    uint8 score;          // AI-assigned score (0-100)
    uint256 nonce;        // Replay protection
}
```

---

## Staking System

### Overview

STORY holders can stake their tokens to earn points that convert to future rewards. The staking system features:

- **Dynamic Multipliers** - Lock longer for higher rewards
- **VIP Tiers** - Stake more for bonus points
- **Referral System** - Earn from referred stakers
- **Per-Second Accrual** - Points calculated precisely

### Lock Period Multipliers

| Lock Period | Multiplier | Early Unlock Penalty |
|-------------|------------|----------------------|
| Flexible (7d min) | 1.0x | None |
| 30 Days | 1.5x | 50% of earned points |
| 90 Days | 2.5x | 50% of earned points |
| 180 Days | 4.0x | 50% of earned points |
| 365 Days | 8.0x | 50% of earned points |

```
Multiplier Growth:
Flexible: █░░░░░░░░░  1.0x
30 Days:  █▓░░░░░░░░  1.5x
90 Days:  ██▓░░░░░░░  2.5x
180 Days: ████░░░░░░  4.0x
365 Days: ████████░░  8.0x
```

### VIP Tiers

| Tier | Min Stake | Bonus | Total Multiplier (365d) |
|------|-----------|-------|-------------------------|
| None | 0 | 0% | 8.0x |
| Bronze | 1,000 | +10% | 8.8x |
| Silver | 5,000 | +20% | 9.6x |
| Gold | 10,000 | +35% | 10.8x |
| Platinum | 25,000 | +50% | 12.0x |
| Diamond | 50,000 | +75% | 14.0x |

### Points Calculation

```
Points Per Second = (Staked Amount × Base Rate × Lock Multiplier × VIP Multiplier) / PRECISION

Where:
- Base Rate = 1 (1 point per token per second baseline)
- Lock Multiplier = [1.0, 1.5, 2.5, 4.0, 8.0] based on lock period
- VIP Multiplier = [1.0, 1.1, 1.2, 1.35, 1.5, 1.75] based on tier
- PRECISION = 10^18
```

**Example Calculation:**

```
User stakes 10,000 STORY for 365 days (Gold tier)

Base: 10,000 tokens
Lock Multiplier: 8.0x (365 days)
VIP Multiplier: 1.35x (Gold tier)

Points per second = 10,000 × 1 × 8.0 × 1.35 / 10^18
                  = 108,000 / 10^18 points per second

Per day: 108,000 × 86,400 = 9,331,200,000 points
Per year: ~3.4 × 10^12 points
```

### Referral Program

| Level | Bonus | Description |
|-------|-------|-------------|
| Direct Referral | 5% | Of referee's earned points |

```
Referrer receives 5% of all points earned by their referees
Referral link: https://8004mint.com/story?ref=YOUR_ADDRESS
```

---

## Utility & Value Proposition

### Current Utility

1. **Staking Rewards** - Earn points for future airdrops
2. **Governance (Planned)** - Vote on protocol decisions
3. **Fee Discounts (Planned)** - Reduced claiming fees
4. **Premium Features** - Access to exclusive content

### Value Drivers

```
┌─────────────────────────────────────────────────────────────┐
│                    Value Accrual Model                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐        ┌────────────────┐               │
│  │   Supply Cap   │        │  Claim Fees    │               │
│  │   1,000,000    │───────▶│  Treasury      │               │
│  │   Fixed        │        │  Accumulation  │               │
│  └────────────────┘        └────────────────┘               │
│          │                          │                        │
│          ▼                          ▼                        │
│  ┌────────────────┐        ┌────────────────┐               │
│  │   Scarcity     │        │   Buyback &    │               │
│  │   As claims    │        │   LP Rewards   │               │
│  │   decrease     │        │   (Future)     │               │
│  └────────────────┘        └────────────────┘               │
│          │                          │                        │
│          └──────────┬───────────────┘                        │
│                     ▼                                        │
│            ┌────────────────┐                                │
│            │   Price Floor  │                                │
│            │   Support      │                                │
│            └────────────────┘                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Trading Information

### Market Data

| Metric | Value |
|--------|-------|
| **DEX** | Uniswap V4 |
| **Pair** | STORY/USDC |
| **Initial Liquidity** | $20,000+ |

### Trading Resources

- **DexScreener**: [View Chart](https://dexscreener.com/ethereum/0xdc94e8ab22d66bcc9b0bdb5e48711fb12cbea74e)
- **Uniswap**: [Trade](https://app.uniswap.org/swap?outputCurrency=0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e)
- **MoltBot**: [Automated Trading](https://t.me/MoltStoryBot)

---

## Contract Security

### Access Controls

| Function | Access | Description |
|----------|--------|-------------|
| `claim()` | Public | Anyone with valid signature |
| `stake()` | Public | Any STORY holder |
| `unstake()` | Public | Stake owner only |
| `pause()` | Owner | Emergency circuit breaker |
| `setSigner()` | Owner | Update signing authority |

### Safety Features

- ✅ Max supply enforced (cannot exceed 1M)
- ✅ Single claim per address
- ✅ EIP-712 signature verification
- ✅ Nonce-based replay protection
- ✅ ReentrancyGuard on all external calls

---

## Future Roadmap

```
Q1 2026                Q2 2026                Q3 2026
┌──────────┐           ┌──────────┐           ┌──────────┐
│ ✅ Launch │           │ 🔄 DAO    │           │ 🔮 Cross │
│ ✅ Staking│           │   Vote   │           │   Chain  │
│ ✅ MoltBot│           │ 🔄 Fee   │           │ 🔮 L2    │
│          │           │   Share  │           │   Deploy │
└──────────┘           └──────────┘           └──────────┘
```

---

## Disclaimer

*STORY token is an experimental protocol. Token prices can be volatile. Only invest what you can afford to lose. This document is for informational purposes only and does not constitute financial advice.*
