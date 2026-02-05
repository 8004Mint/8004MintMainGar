import { ethers } from "ethers";
import axios from "axios";

const RPC_URL = process.env.RPC_URL || "https://lb.drpc.live/ethereum/AsVs23QoLEOwisC7Py3FTOoL9ez-0OkR8K7sOmy9-kY5";
const STORY_TOKEN = process.env.STORY_TOKEN_ADDRESS || "0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e";

const provider = new ethers.JsonRpcProvider(RPC_URL);

export interface MarketData {
  price: number; // STORY price in USD
  priceChange24h: number; // % change in 24h
  volume24h: number; // 24h volume in USD
  liquidity: number; // Total liquidity in USD
  txns24h: { buys: number; sells: number };
  timestamp: number;
}

// Price history for analysis
const priceHistory: { price: number; timestamp: number }[] = [];
const MAX_HISTORY = 1440; // 24 hours at 1 min intervals

// Fetch market data from DexScreener API
export async function getMarketData(): Promise<MarketData | null> {
  try {
    const response = await axios.get(
      `https://api.dexscreener.com/latest/dex/tokens/${STORY_TOKEN}`,
      { timeout: 10000 }
    );

    const pairs = response.data?.pairs;
    if (!pairs || pairs.length === 0) {
      console.error("No pairs found for STORY token");
      return null;
    }

    // Find the main STORY/USDC pool (highest liquidity)
    const mainPair = pairs.reduce((best: any, current: any) => {
      const currentLiq = current.liquidity?.usd || 0;
      const bestLiq = best?.liquidity?.usd || 0;
      return currentLiq > bestLiq ? current : best;
    }, pairs[0]);

    const price = parseFloat(mainPair.priceUsd) || 0;
    const priceChange24h = mainPair.priceChange?.h24 || 0;
    const volume24h = mainPair.volume?.h24 || 0;
    const liquidity = mainPair.liquidity?.usd || 0;
    const txns24h = mainPair.txns?.h24 || { buys: 0, sells: 0 };

    // Store in history
    const now = Date.now();
    priceHistory.push({ price, timestamp: now });
    if (priceHistory.length > MAX_HISTORY) {
      priceHistory.shift();
    }

    return {
      price,
      priceChange24h,
      volume24h,
      liquidity,
      txns24h,
      timestamp: now,
    };
  } catch (e) {
    console.error("Error fetching market data from DexScreener:", e);
    return null;
  }
}

// Get price history for AI analysis
export function getPriceHistory(): { price: number; timestamp: number }[] {
  return [...priceHistory];
}

// Calculate simple RSI
export function calculateRSI(periods: number = 14): number | null {
  if (priceHistory.length < periods + 1) return null;

  const changes: number[] = [];
  for (let i = priceHistory.length - periods; i < priceHistory.length; i++) {
    changes.push(priceHistory[i].price - priceHistory[i - 1].price);
  }

  const gains = changes.filter((c) => c > 0);
  const losses = changes.filter((c) => c < 0).map((c) => Math.abs(c));

  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / periods : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / periods : 0;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Get market summary for AI
export async function getMarketSummary(): Promise<string> {
  const data = await getMarketData();
  if (!data) return "Unable to fetch market data";

  const rsi = calculateRSI();
  
  // Calculate trend from recent prices
  let trend = "neutral";
  if (priceHistory.length >= 10) {
    const recent = priceHistory.slice(-10);
    const oldAvg = recent.slice(0, 5).reduce((a, b) => a + b.price, 0) / 5;
    const newAvg = recent.slice(-5).reduce((a, b) => a + b.price, 0) / 5;
    if (newAvg > oldAvg * 1.02) trend = "upward";
    else if (newAvg < oldAvg * 0.98) trend = "downward";
  }

  return `
STORY Token Market Summary (${new Date().toISOString()}):
- Current Price: $${data.price.toFixed(4)}
- 24h Change: ${data.priceChange24h >= 0 ? "+" : ""}${data.priceChange24h.toFixed(2)}%
- 24h Volume: $${data.volume24h.toLocaleString()}
- Liquidity: $${data.liquidity.toLocaleString()}
- 24h Transactions: ${data.txns24h.buys} buys, ${data.txns24h.sells} sells
- RSI(14): ${rsi !== null ? rsi.toFixed(1) : "Insufficient data"}
- Recent Trend: ${trend}
- Price History Points: ${priceHistory.length}
`.trim();
}

// Get current ETH price
export async function getEthPrice(): Promise<number> {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { timeout: 5000 }
    );
    return response.data.ethereum.usd;
  } catch {
    console.error("Failed to fetch ETH price, using fallback");
    return 2500; // Fallback price
  }
}
