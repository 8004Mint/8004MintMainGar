import OpenAI from "openai";
import { UserConfig } from "./user-manager";
import { getMarketSummary, getMarketData, getPriceHistory } from "./market-data";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TradeDecision {
  action: "buy" | "sell" | "hold";
  amount?: number; // In USD for buy, in tokens for sell
  confidence: number; // 0-100
  reasoning: string;
  urgency: "low" | "medium" | "high";
}

export interface PortfolioState {
  storyBalance: number; // STORY tokens
  usdcBalance: number; // USDC balance
  ethBalance: number; // ETH balance
  usdValue: number; // Total portfolio value in USD
  avgBuyPrice?: number; // Average buy price
}

// System prompt for the AI trading agent
const SYSTEM_PROMPT = `You are an AI trading agent specialized in trading the STORY token on Ethereum mainnet.

STORY is an ERC-20 token traded on Uniswap V4, primarily paired with USDC.
Current main pool: STORY/USDC with ~$120k liquidity.

Your role is to analyze market conditions and make trading decisions for users based on their risk preferences.

Risk Levels:
- Conservative: Only trade on very clear signals, prioritize capital preservation, max 20% of position per trade
- Moderate: Balance between opportunities and risk, 30-50% of position per trade allowed
- Aggressive: Seek higher returns, willing to take larger positions, up to 80% per trade

You have access to:
- Current price and 24h change
- Trading volume and liquidity
- Buy/sell transaction counts
- RSI indicator
- Price trend analysis
- User's current portfolio (STORY, USDC, ETH)

Your response MUST be valid JSON with this exact structure:
{
  "action": "buy" | "sell" | "hold",
  "amount": number (USD for buy, percentage of holdings for sell, 0 for hold),
  "confidence": number (0-100),
  "reasoning": "Brief explanation",
  "urgency": "low" | "medium" | "high"
}

Rules:
1. Never recommend buying if there's not enough USDC balance
2. Never recommend selling more than the user owns
3. Be conservative with confidence scores - only high confidence (>70) for clear signals
4. Consider liquidity (~$120k) - don't recommend trades that would significantly impact price (max $5k per trade)
5. For "hold", set amount to 0
6. Be concise but informative in reasoning
7. Buy with USDC, sell for USDC`;

// Analyze market and make decision for a user
export async function analyzeAndDecide(
  user: UserConfig,
  portfolio: PortfolioState
): Promise<TradeDecision> {
  try {
    const marketSummary = await getMarketSummary();
    const marketData = await getMarketData();
    const priceHistory = getPriceHistory();

    // Calculate trend from recent prices
    let trend = "neutral";
    if (priceHistory.length >= 10) {
      const recent = priceHistory.slice(-10);
      const oldAvg = recent.slice(0, 5).reduce((a, b) => a + b.price, 0) / 5;
      const newAvg = recent.slice(-5).reduce((a, b) => a + b.price, 0) / 5;
      if (newAvg > oldAvg * 1.02) trend = "upward";
      else if (newAvg < oldAvg * 0.98) trend = "downward";
    }

    const userPrompt = `
Market Data:
${marketSummary}
Recent Trend: ${trend}

User Profile:
- Risk Level: ${user.strategy.riskLevel}
- Max Position: $${user.strategy.maxPositionUsd}
- Target: ${user.strategy.targetDescription || "Low buy high sell"}

Current Portfolio:
- STORY Balance: ${portfolio.storyBalance.toFixed(2)} tokens (~$${(portfolio.storyBalance * (marketData?.price || 0)).toFixed(2)})
- USDC Balance: ${portfolio.usdcBalance?.toFixed(2) || 0} USDC (available for buying)
- ETH Balance: ${portfolio.ethBalance.toFixed(6)} ETH (for gas fees)
- Total Portfolio Value: $${portfolio.usdValue.toFixed(2)}
${portfolio.avgBuyPrice ? `- Average Buy Price: $${portfolio.avgBuyPrice.toFixed(4)}` : ""}

Current STORY Price: $${marketData?.price.toFixed(4) || "unknown"}

Based on this data, what trading action should be taken? Respond with JSON only.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || "";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }

    const decision = JSON.parse(jsonMatch[0]) as TradeDecision;

    // Validate decision
    if (!["buy", "sell", "hold"].includes(decision.action)) {
      decision.action = "hold";
    }
    decision.confidence = Math.min(100, Math.max(0, decision.confidence || 0));
    decision.amount = decision.amount || 0;

    return decision;
  } catch (e) {
    console.error("AI decision error:", e);
    return {
      action: "hold",
      amount: 0,
      confidence: 0,
      reasoning: "Error analyzing market data, holding position",
      urgency: "low",
    };
  }
}

// Generate human-readable trade explanation
export async function explainTrade(
  action: "buy" | "sell",
  amount: number,
  price: number,
  reasoning: string
): Promise<string> {
  const emoji = action === "buy" ? "🟢" : "🔴";
  const verb = action === "buy" ? "Bought" : "Sold";

  return `${emoji} **${verb} STORY**

Amount: ${action === "buy" ? `$${amount.toFixed(2)}` : `${amount.toFixed(2)} STORY`}
Price: $${price.toFixed(6)}

**Why?**
${reasoning}`;
}

// Chat with AI about market/strategy (for user questions)
export async function chatWithAI(
  userMessage: string,
  portfolio?: PortfolioState
): Promise<string> {
  try {
    const marketSummary = await getMarketSummary();

    const systemPrompt = `You are a helpful AI trading assistant for STORY token. 
Be concise and informative. You can discuss market conditions, explain your trading strategy, 
and answer questions about the bot.

Current market data:
${marketSummary}

${portfolio ? `User's portfolio: ${portfolio.storyBalance.toFixed(2)} STORY, ${portfolio.ethBalance.toFixed(6)} ETH` : ""}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content || "Sorry, I couldn't process that.";
  } catch (e) {
    console.error("Chat error:", e);
    return "Sorry, I'm having trouble responding right now.";
  }
}
