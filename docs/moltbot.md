# 🤖 MoltBot Trading Agent Guide

## Overview

MoltBot is an AI-powered autonomous trading agent for STORY token. It uses GPT-4o to analyze market conditions and execute trades on behalf of users.

**Telegram:** [@MoltStoryBot](https://t.me/MoltStoryBot)

---

## Features

| Feature | Description |
|---------|-------------|
| 🧠 **AI Decision Making** | GPT-4o analyzes market data and makes trading decisions |
| 📊 **Real-Time Data** | DexScreener integration for live price, volume, liquidity |
| 🔄 **Auto Trading** | 1-minute cycle execution with autonomous decisions |
| 💼 **Per-User Wallets** | Isolated HD wallets generated for each user |
| 📈 **Risk Levels** | Conservative, Moderate, or Aggressive strategies |
| 🔐 **Key Export** | Full private key access for user control |

---

## Getting Started

### Step 1: Start the Bot

Open Telegram and search for [@MoltStoryBot](https://t.me/MoltStoryBot) or click the link.

Send `/start` to begin.

### Step 2: Create Your Wallet

```
/create_wallet
```

MoltBot will generate a dedicated Ethereum wallet for your trading.

**Important:** Save your wallet address for deposits.

### Step 3: Fund Your Wallet

Deposit to your wallet address:

| Token | Purpose | Recommended Amount |
|-------|---------|-------------------|
| USDC | Trading capital | $10 - $1,000 |
| ETH | Gas fees | 0.01 - 0.05 ETH |

```
/deposit
```

This command shows your deposit address.

### Step 4: Configure Strategy

```
/config [risk_level]
```

**Risk Levels:**
| Level | Description | Trade Size |
|-------|-------------|------------|
| `conservative` | Smaller positions, less frequent trades | 10-20% of portfolio |
| `moderate` | Balanced approach | 20-40% of portfolio |
| `aggressive` | Larger positions, more frequent trades | 40-60% of portfolio |

**Example:**
```
/config moderate
```

### Step 5: Start Trading

```
/start_trading
```

MoltBot will begin automated trading with 1-minute analysis cycles.

---

## Commands Reference

### Wallet Management

| Command | Description |
|---------|-------------|
| `/create_wallet` | Generate new trading wallet |
| `/export_key` | Export private key (use carefully!) |
| `/deposit` | Show deposit address |
| `/withdraw [address]` | Withdraw all funds to specified address |

### Trading

| Command | Description |
|---------|-------------|
| `/start_trading` | Begin automated trading |
| `/stop_trading` | Pause automated trading |
| `/config [level]` | Set risk level (conservative/moderate/aggressive) |
| `/balance` | Check portfolio balances |

### Market Info

| Command | Description |
|---------|-------------|
| `/price` | Current STORY token price and 24h stats |

### AI Interaction

| Command | Description |
|---------|-------------|
| `/ask [question]` | Ask AI a question about your portfolio or strategy |

---

## How It Works

### Trading Cycle (Every 1 Minute)

```
┌─────────────────────────────────────────────────────────────┐
│                    MoltBot Trading Cycle                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │  Fetch  │───▶│  Get    │───▶│   AI    │───▶│ Execute │  │
│  │ Market  │    │Portfolio│    │ Analyze │    │  Trade  │  │
│  │  Data   │    │  State  │    │& Decide │    │         │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│                                                              │
│  DexScreener:   On-chain:      GPT-4o:       KyberSwap:     │
│  • Price        • STORY bal    • Market      • Best route   │
│  • Volume       • USDC bal     • Risk level  • Execute      │
│  • Liquidity    • ETH bal      • Decision    • Confirm      │
│  • 24h change                  • Explanation                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### AI Decision Process

The AI considers:

1. **Market Conditions**
   - Current price vs 24h average
   - Trading volume trends
   - Liquidity depth
   - Recent price momentum

2. **User Context**
   - Current holdings (STORY, USDC, ETH)
   - Risk level preference
   - Recent trade history

3. **Risk Management**
   - Position sizing based on risk level
   - Maximum allocation limits
   - Gas fee optimization

### Trade Execution

When AI decides to trade:

1. **Quote** - Get best route from KyberSwap
2. **Approve** - Approve token spending if needed
3. **Swap** - Execute the trade
4. **Confirm** - Wait for transaction confirmation
5. **Notify** - Send user detailed explanation

---

## Security

### Wallet Security

- **HD Wallet Generation** - Cryptographically secure random wallets
- **Isolated Storage** - Each user has their own wallet
- **Key Export** - Users can export and backup private keys
- **No Custody** - You control your funds

### Trading Security

- **Slippage Protection** - Max 1% slippage on trades
- **Gas Limits** - Reasonable gas limits to prevent stuck txs
- **Error Handling** - Graceful failure with notifications

### Best Practices

1. **Only deposit what you can afford to lose**
2. **Export and backup your private key**
3. **Start with conservative risk level**
4. **Monitor your trades regularly**

---

## FAQ

### General

**Q: Is this free to use?**
A: Yes, MoltBot is free. You only pay gas fees for trades.

**Q: What tokens does it trade?**
A: STORY token against USDC on Ethereum mainnet.

**Q: How often does it trade?**
A: It analyzes every 1 minute but only trades when AI recommends.

### Wallets

**Q: Can I use my existing wallet?**
A: No, MoltBot generates a dedicated trading wallet for security.

**Q: How do I withdraw my funds?**
A: Use `/withdraw [your_address]` to send all tokens to your wallet.

**Q: What if I lose access to Telegram?**
A: Export your private key with `/export_key` and import into MetaMask.

### Trading

**Q: Can I set specific buy/sell prices?**
A: No, MoltBot uses AI to determine optimal entry/exit points.

**Q: Why isn't it trading?**
A: The AI may decide to HOLD if conditions aren't favorable.

**Q: What exchanges does it use?**
A: KyberSwap aggregator, which routes through Uniswap V4 and other DEXs.

### Technical

**Q: What AI model powers this?**
A: OpenAI GPT-4o for decision making and explanations.

**Q: Where does price data come from?**
A: DexScreener API for real-time DEX data.

---

## Risk Disclaimer

⚠️ **IMPORTANT: Trading cryptocurrencies involves significant risk.**

- **Not Financial Advice** - MoltBot is an experimental tool
- **Potential Loss** - You may lose some or all deposited funds
- **No Guarantees** - Past performance doesn't indicate future results
- **AI Limitations** - AI can make suboptimal decisions
- **Market Risk** - Crypto markets are highly volatile

**Only trade with funds you can afford to lose.**

---

## Support

- **Telegram Group**: [Coming Soon]
- **Twitter**: [@MoltStoryBot](https://twitter.com/MoltStoryBot)
- **Issues**: GitHub Issues

---

## Technical Specifications

| Spec | Value |
|------|-------|
| Trading Pair | STORY/USDC |
| Chain | Ethereum Mainnet |
| AI Model | GPT-4o-mini |
| Cycle Interval | 1 minute |
| Max Slippage | 1% |
| DEX Aggregator | KyberSwap |
| Data Source | DexScreener |
