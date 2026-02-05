# Story AI Trading Bot 🤖

An AI-powered autonomous trading bot for STORY token on Ethereum mainnet. Built with Moltbot-style decision making.

## Features

- 🧠 **AI Decision Making** - Uses GPT-4 to analyze market conditions and decide when to trade
- 💬 **Telegram Interface** - Easy to use, chat-based interaction
- 🔐 **Per-user Wallets** - Each user gets a dedicated trading wallet
- 📊 **Market Analysis** - Real-time price, liquidity, RSI tracking
- ⚙️ **Customizable Strategy** - Choose risk level (conservative/moderate/aggressive)
- 🔄 **Auto Trading** - 24/7 automated trading based on AI decisions

## How It Works

1. User starts the bot and gets a dedicated wallet
2. User deposits ETH to the wallet
3. User configures their risk preference
4. AI monitors market every 5 minutes
5. When AI sees opportunity (high confidence), it executes trades
6. User gets notified with reasoning for each trade

## Setup

### 1. Create Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow prompts
3. Save the bot token

### 2. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create API key
3. Ensure you have credits/billing set up

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OPENAI_API_KEY=your_openai_api_key
```

### 4. Run the Bot

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Create wallet & see instructions |
| `/balance` | Check your portfolio |
| `/price` | Current STORY market data |
| `/deposit` | Get deposit address |
| `/config` | Configure trading strategy |
| `/start_trading` | Enable AI auto-trading |
| `/stop_trading` | Disable auto-trading |
| `/withdraw <addr>` | Withdraw all funds |
| `/ask <question>` | Ask AI anything |

## AI Trading Logic

The AI analyzes:
- Current price and recent trend
- RSI indicator (overbought/oversold)
- User's risk preference
- Current portfolio composition

Risk Levels:
- **Conservative**: Only trades on very clear signals, max 20% per trade
- **Moderate**: Balanced approach, 30-50% per trade
- **Aggressive**: Seeks higher returns, up to 80% per trade

## Deployment

For production deployment with PM2:

```bash
npm run build
pm2 start dist/index.js --name story-trading-bot
```

## Security Notes

- Each user's wallet private key is stored locally
- Consider encrypting keys in production
- Users should only deposit what they're willing to risk
- Bot never has access to user's external wallets

## Tech Stack

- **Bot Framework**: Telegraf (Telegram)
- **AI**: OpenAI GPT-4o-mini
- **Blockchain**: Ethers.js
- **DEX**: Uniswap V2 Router
- **Language**: TypeScript

## License

ISC
