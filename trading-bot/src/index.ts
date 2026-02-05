import "dotenv/config";
import { Telegraf, Markup } from "telegraf";
import * as cron from "node-cron";
import {
  getUser,
  createUser,
  updateUserStrategy,
  getActiveUsers,
  touchUser,
} from "./user-manager";
import { getMarketData, getMarketSummary } from "./market-data";
import { analyzeAndDecide, explainTrade, chatWithAI } from "./ai-agent";
import { getPortfolioBalance, buyStory, sellStory, withdrawAll } from "./trading-engine";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// === Bot Commands ===

bot.start(async (ctx) => {
  const chatId = ctx.chat.id;
  const user = getUser(chatId);

  if (user) {
    // User already has wallet
    await ctx.reply(
`Welcome back! 👋

Your wallet: ${user.wallet.address}
Trading: ${user.strategy.enabled ? "✅ Active" : "❌ Inactive"}

Commands:
/balance - Check balance
/price - STORY price
/export_key - Export private key
/start_trading - Start AI trading`
    );
  } else {
    // New user - show intro, don't create wallet yet
    await ctx.reply(
`🤖 Welcome to Story AI Trading Bot!

I can automatically trade STORY tokens for you on Uniswap V4 using AI.

To get started:
1. /create_wallet - Create a new trading wallet
2. Deposit USDC + ETH to your wallet
3. /config - Set your trading strategy
4. /start_trading - Enable AI auto-trading

Commands:
/create_wallet - Create trading wallet
/price - Check STORY price
/ask - Ask AI questions

⚠️ This bot trades real money. Start small!`
    );
  }
});

// Create wallet command
bot.command("create_wallet", async (ctx) => {
  const chatId = ctx.chat.id;
  const username = ctx.from?.username;

  let user = getUser(chatId);

  if (user) {
    await ctx.reply(
`You already have a wallet:
${user.wallet.address}

Use /export_key to view your private key.`
    );
    return;
  }

  // Create new wallet
  user = createUser(chatId, username);

  await ctx.reply(
`✅ Wallet Created!

Your trading wallet address:
${user.wallet.address}

IMPORTANT:
• Use /export_key to backup your private key
• Send USDC (for buying STORY) + ETH (for gas) to this address
• Only send from Ethereum mainnet!

Next steps:
/export_key - Backup your private key (do this first!)
/deposit - Show deposit address
/config - Configure trading strategy`
  );
});

// Export private key
bot.command("export_key", async (ctx) => {
  const user = getUser(ctx.chat.id);
  if (!user) {
    return ctx.reply("You don't have a wallet yet. Use /create_wallet first.");
  }

  // Send in a separate message that can be deleted
  await ctx.reply(
`⚠️ PRIVATE KEY - KEEP SECRET!

${user.wallet.privateKey}

⚠️ WARNING:
• Anyone with this key can steal your funds
• Save it securely and delete this message
• Never share it with anyone

Wallet address: ${user.wallet.address}`
  );
});

bot.command("balance", async (ctx) => {
  const user = getUser(ctx.chat.id);
  if (!user) {
    return ctx.reply("You don't have a wallet yet. Use /create_wallet first.");
  }

  try {
    await ctx.reply("Fetching balance...");
    const balance = await getPortfolioBalance(user);

    await ctx.reply(
`💰 Your Portfolio

Wallet: ${user.wallet.address}

Balances:
• STORY: ${balance.storyBalance.toFixed(2)} (~$${balance.storyValueUsd.toFixed(2)})
• USDC: ${balance.usdcBalance.toFixed(2)} (for buying)
• ETH: ${balance.ethBalance.toFixed(6)} (for gas)

Total Value: $${balance.totalValueUsd.toFixed(2)}

Trading: ${user.strategy.enabled ? "✅ Active" : "❌ Inactive"}
Risk Level: ${user.strategy.riskLevel}`
    );
  } catch (e) {
    await ctx.reply("Error fetching balance. Please try again.");
  }
});

bot.command("price", async (ctx) => {
  try {
    const data = await getMarketData();
    if (!data) {
      return ctx.reply("Unable to fetch price data.");
    }
    await ctx.reply(
`📊 STORY Market Data

Price: $${data.price.toFixed(4)}
24h Change: ${data.priceChange24h >= 0 ? "+" : ""}${data.priceChange24h.toFixed(2)}%
24h Volume: $${data.volume24h.toLocaleString()}
Liquidity: $${data.liquidity.toLocaleString()}
Transactions: ${data.txns24h.buys} buys / ${data.txns24h.sells} sells`
    );
  } catch (e) {
    await ctx.reply("Error fetching price data.");
  }
});

bot.command("deposit", async (ctx) => {
  const user = getUser(ctx.chat.id);
  if (!user) {
    return ctx.reply("You don't have a wallet yet. Use /create_wallet first.");
  }

  await ctx.reply(
`📥 Deposit to Your Trading Wallet

Send to this address:
${user.wallet.address}

You need:
• USDC - for buying STORY
• ETH - for gas fees (~0.01 ETH)

⚠️ Only send from Ethereum mainnet!`
  );
});

bot.command("config", async (ctx) => {
  const user = getUser(ctx.chat.id);
  if (!user) {
    return ctx.reply("You don't have a wallet yet. Use /create_wallet first.");
  }

  await ctx.reply(
`⚙️ Configure Your Strategy

Current Settings:
• Risk Level: ${user.strategy.riskLevel}
• Max Position: $${user.strategy.maxPositionUsd}

Select your risk level:`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("🐢 Conservative", "risk_conservative"),
        Markup.button.callback("⚖️ Moderate", "risk_moderate"),
        Markup.button.callback("🚀 Aggressive", "risk_aggressive"),
      ],
    ])
  );
});

// Risk level callbacks
bot.action("risk_conservative", async (ctx) => {
  updateUserStrategy(ctx.chat!.id, { riskLevel: "conservative" });
  await ctx.answerCbQuery("Risk set to Conservative");
  await ctx.reply("✅ Risk level: Conservative\n\nI'll only trade on very clear signals.\n\nNow send a number to set max position (e.g., 100 for $100):");
});

bot.action("risk_moderate", async (ctx) => {
  updateUserStrategy(ctx.chat!.id, { riskLevel: "moderate" });
  await ctx.answerCbQuery("Risk set to Moderate");
  await ctx.reply("✅ Risk level: Moderate\n\nI'll balance opportunities and risk.\n\nNow send a number to set max position (e.g., 100 for $100):");
});

bot.action("risk_aggressive", async (ctx) => {
  updateUserStrategy(ctx.chat!.id, { riskLevel: "aggressive" });
  await ctx.answerCbQuery("Risk set to Aggressive");
  await ctx.reply("✅ Risk level: Aggressive\n\nI'll seek higher returns.\n\nNow send a number to set max position (e.g., 100 for $100):");
});

bot.command("start_trading", async (ctx) => {
  const user = getUser(ctx.chat.id);
  if (!user) {
    return ctx.reply("You don't have a wallet yet. Use /create_wallet first.");
  }

  const balance = await getPortfolioBalance(user);
  if (balance.usdcBalance < 1 && balance.storyBalance < 1) {
    return ctx.reply("⚠️ You need USDC or STORY to start trading.\n\nUse /deposit to get your wallet address.");
  }

  updateUserStrategy(ctx.chat.id, { enabled: true });

  await ctx.reply(
`🚀 AI Trading Activated!

I'm now monitoring the market for you.

Settings:
• Risk: ${user.strategy.riskLevel}
• Max Position: $${user.strategy.maxPositionUsd}

I'll notify you when I make trades. Use /stop_trading to disable.`
  );
});

bot.command("stop_trading", async (ctx) => {
  const user = getUser(ctx.chat.id);
  if (!user) {
    return ctx.reply("You don't have a wallet yet.");
  }
  updateUserStrategy(ctx.chat.id, { enabled: false });
  await ctx.reply("⏹️ Trading Stopped\n\nI won't make any automated trades. Use /start_trading to resume.");
});

bot.command("withdraw", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);
  const toAddress = args[0];

  const user = getUser(ctx.chat.id);
  if (!user) {
    return ctx.reply("You don't have a wallet yet. Use /create_wallet first.");
  }

  if (!toAddress || !toAddress.startsWith("0x") || toAddress.length !== 42) {
    return ctx.reply("Usage: /withdraw <address>\n\nExample: /withdraw 0x1234...abcd");
  }

  await ctx.reply(
`⚠️ Confirm Withdrawal

Withdraw ALL funds to:
${toAddress}

Are you sure?`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Yes", `withdraw_${toAddress}`),
        Markup.button.callback("❌ Cancel", "cancel_withdraw"),
      ],
    ])
  );
});

bot.action(/withdraw_(.+)/, async (ctx) => {
  const toAddress = ctx.match[1];
  const user = getUser(ctx.chat!.id);
  if (!user) return;

  await ctx.answerCbQuery("Processing...");
  await ctx.reply("Processing withdrawal...");

  const result = await withdrawAll(user, toAddress);

  if (result.success) {
    let msg = "✅ Withdrawal Complete\n\n";
    if (result.storyTxHash) msg += `STORY TX: ${result.storyTxHash}\n`;
    if (result.usdcTxHash) msg += `USDC TX: ${result.usdcTxHash}\n`;
    if (result.ethTxHash) msg += `ETH TX: ${result.ethTxHash}`;
    await ctx.reply(msg);
  } else {
    await ctx.reply(`❌ Withdrawal failed: ${result.error}`);
  }
});

bot.action("cancel_withdraw", async (ctx) => {
  await ctx.answerCbQuery("Cancelled");
  await ctx.reply("Withdrawal cancelled.");
});

bot.command("ask", async (ctx) => {
  const question = ctx.message.text.replace("/ask", "").trim();
  if (!question) {
    return ctx.reply("Usage: /ask <question>\n\nExample: /ask What's your trading strategy?");
  }

  const user = getUser(ctx.chat.id);
  let portfolio;
  if (user) {
    const balance = await getPortfolioBalance(user);
    portfolio = {
      storyBalance: balance.storyBalance,
      usdcBalance: balance.usdcBalance,
      ethBalance: balance.ethBalance,
      usdValue: balance.totalValueUsd,
    };
  }

  await ctx.reply("🤔 Thinking...");
  const response = await chatWithAI(question, portfolio);
  await ctx.reply(response);
});

// Handle text messages
bot.on("text", async (ctx) => {
  const text = ctx.message.text;
  const user = getUser(ctx.chat.id);
  
  // If no wallet, prompt to create one
  if (!user) {
    await ctx.reply("You don't have a wallet yet. Use /create_wallet to get started.");
    return;
  }

  touchUser(ctx.chat.id);

  // Check if it's a number (setting max position)
  const num = parseFloat(text);
  if (!isNaN(num) && num > 0 && num <= 100000) {
    updateUserStrategy(ctx.chat.id, { maxPositionUsd: num });
    await ctx.reply(`✅ Max position set to $${num}\n\nYour strategy is configured! Use /start_trading to begin.`);
    return;
  }

  // Otherwise, treat as chat with AI
  const portfolio = await getPortfolioBalance(user);
  const response = await chatWithAI(text, {
    storyBalance: portfolio.storyBalance,
    usdcBalance: portfolio.usdcBalance,
    ethBalance: portfolio.ethBalance,
    usdValue: portfolio.totalValueUsd,
  });
  await ctx.reply(response);
});

// === AI Trading Loop ===

async function runTradingCycle() {
  const activeUsers = getActiveUsers();
  console.log(`[${new Date().toISOString()}] Trading cycle for ${activeUsers.length} users`);

  for (const user of activeUsers) {
    try {
      const portfolio = await getPortfolioBalance(user);
      if (portfolio.totalValueUsd < 1) continue;

      const decision = await analyzeAndDecide(user, {
        storyBalance: portfolio.storyBalance,
        usdcBalance: portfolio.usdcBalance,
        ethBalance: portfolio.ethBalance,
        usdValue: portfolio.totalValueUsd,
      });

      console.log(`User ${user.chatId}: ${decision.action} (${decision.confidence}%)`);

      if (decision.confidence < 60 || decision.action === "hold") continue;

      const marketData = await getMarketData();
      if (!marketData) continue;

      let result;
      if (decision.action === "buy" && decision.amount && decision.amount > 0) {
        const buyAmount = Math.min(decision.amount, user.strategy.maxPositionUsd);
        result = await buyStory(user, buyAmount);

        if (result.success) {
          const explanation = await explainTrade("buy", buyAmount, result.price, decision.reasoning);
          await bot.telegram.sendMessage(user.chatId, explanation);
          await bot.telegram.sendMessage(user.chatId, `TX: https://etherscan.io/tx/${result.txHash}`);
        }
      } else if (decision.action === "sell" && decision.amount && decision.amount > 0) {
        const sellAmount = (portfolio.storyBalance * decision.amount) / 100;
        if (sellAmount > 0) {
          result = await sellStory(user, sellAmount);

          if (result.success) {
            const explanation = await explainTrade("sell", sellAmount, result.price, decision.reasoning);
            await bot.telegram.sendMessage(user.chatId, explanation);
            await bot.telegram.sendMessage(user.chatId, `TX: https://etherscan.io/tx/${result.txHash}`);
          }
        }
      }

      if (result && !result.success) {
        console.error(`Trade failed for ${user.chatId}:`, result.error);
      }
    } catch (e) {
      console.error(`Error for user ${user.chatId}:`, e);
    }
  }
}

// Run every 1 minute
cron.schedule("* * * * *", runTradingCycle);

// === Start Bot ===

console.log("🤖 Story AI Trading Bot starting...");

// Set bot commands menu
bot.telegram.setMyCommands([
  { command: "start", description: "🏠 Start / Main menu" },
  { command: "create_wallet", description: "🔐 Create trading wallet" },
  { command: "balance", description: "💰 Check your balance" },
  { command: "price", description: "📊 STORY price & market data" },
  { command: "deposit", description: "📥 Get deposit address" },
  { command: "config", description: "⚙️ Configure trading strategy" },
  { command: "start_trading", description: "🚀 Enable AI auto-trading" },
  { command: "stop_trading", description: "⏹️ Disable auto-trading" },
  { command: "export_key", description: "🔑 Export private key" },
  { command: "withdraw", description: "💸 Withdraw funds" },
  { command: "ask", description: "🤖 Ask AI a question" },
]);

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

console.log("✅ Bot is running!");
