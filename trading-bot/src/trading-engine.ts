import { ethers } from "ethers";
import axios from "axios";
import { UserConfig } from "./user-manager";
import { getMarketData, getEthPrice } from "./market-data";

const RPC_URL = process.env.RPC_URL || "https://lb.drpc.live/ethereum/AsVs23QoLEOwisC7Py3FTOoL9ez-0OkR8K7sOmy9-kY5";
const STORY_TOKEN = process.env.STORY_TOKEN_ADDRESS || "0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e";
const USDC_ADDRESS = process.env.USDC_ADDRESS || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH = process.env.WETH_ADDRESS || "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

// KyberSwap API (supports Uniswap V4 and multiple DEXs)
const KYBER_API = "https://aggregator-api.kyberswap.com/ethereum/api/v1";

const provider = new ethers.JsonRpcProvider(RPC_URL);

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

export interface TradeResult {
  success: boolean;
  txHash?: string;
  amountIn: number;
  amountOut: number;
  price: number;
  error?: string;
}

export interface PortfolioBalance {
  storyBalance: number;
  usdcBalance: number;
  ethBalance: number;
  storyValueUsd: number;
  totalValueUsd: number;
}

// Get user portfolio balance
export async function getPortfolioBalance(user: UserConfig): Promise<PortfolioBalance> {
  const wallet = new ethers.Wallet(user.wallet.privateKey, provider);
  const storyToken = new ethers.Contract(STORY_TOKEN, ERC20_ABI, provider);
  const usdcToken = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);

  const [ethBalanceWei, storyBalanceWei, usdcBalanceWei, marketData, ethPrice] = await Promise.all([
    provider.getBalance(wallet.address),
    storyToken.balanceOf(wallet.address),
    usdcToken.balanceOf(wallet.address),
    getMarketData(),
    getEthPrice(),
  ]);

  const ethBalance = Number(ethers.formatEther(ethBalanceWei));
  const storyBalance = Number(ethers.formatEther(storyBalanceWei));
  const usdcBalance = Number(ethers.formatUnits(usdcBalanceWei, 6));

  const storyPrice = marketData?.price || 0;
  const storyValueUsd = storyBalance * storyPrice;
  const ethValueUsd = ethBalance * ethPrice;

  return {
    storyBalance,
    usdcBalance,
    ethBalance,
    storyValueUsd,
    totalValueUsd: storyValueUsd + usdcBalance + ethValueUsd,
  };
}

// Get route from KyberSwap
async function getKyberRoute(
  tokenIn: string,
  tokenOut: string,
  amountIn: string
): Promise<any> {
  try {
    const url = `${KYBER_API}/routes?tokenIn=${tokenIn}&tokenOut=${tokenOut}&amountIn=${amountIn}`;
    const response = await axios.get(url, { timeout: 15000 });
    return response.data?.data?.routeSummary || null;
  } catch (e: any) {
    console.error("KyberSwap route error:", e.response?.data || e.message);
    return null;
  }
}

// Build KyberSwap transaction
async function buildKyberSwap(
  routeSummary: any,
  sender: string,
  recipient: string,
  slippage: number = 50 // 0.5% = 50 bps
): Promise<any> {
  try {
    const response = await axios.post(
      `${KYBER_API}/route/build`,
      {
        routeSummary,
        sender,
        recipient,
        slippageTolerance: slippage,
      },
      { timeout: 15000 }
    );
    return response.data?.data || null;
  } catch (e: any) {
    console.error("KyberSwap build error:", e.response?.data || e.message);
    return null;
  }
}

// Buy STORY (using USDC)
export async function buyStory(
  user: UserConfig,
  amountUsd: number,
  slippagePct: number = 5
): Promise<TradeResult> {
  try {
    const wallet = new ethers.Wallet(user.wallet.privateKey, provider);
    const usdcToken = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);

    const usdcAmount = Math.floor(amountUsd * 1e6);
    const usdcAmountStr = usdcAmount.toString();

    // Check USDC balance
    const balance = await usdcToken.balanceOf(wallet.address);
    if (balance < BigInt(usdcAmount)) {
      return {
        success: false,
        amountIn: 0,
        amountOut: 0,
        price: 0,
        error: `Insufficient USDC balance. Have: ${Number(balance) / 1e6} USDC, Need: ${amountUsd} USDC`,
      };
    }

    // Get KyberSwap route
    console.log(`Getting KyberSwap route: ${amountUsd} USDC -> STORY...`);
    const route = await getKyberRoute(USDC_ADDRESS, STORY_TOKEN, usdcAmountStr);
    if (!route) {
      return { success: false, amountIn: 0, amountOut: 0, price: 0, error: "No route found on KyberSwap" };
    }

    console.log(`Route found: ~${Number(route.amountOut) / 1e18} STORY, gas: $${route.gasUsd}`);

    // Build transaction
    const slippageBps = slippagePct * 100; // 5% = 500 bps
    const swapData = await buildKyberSwap(route, wallet.address, wallet.address, slippageBps);
    if (!swapData) {
      return { success: false, amountIn: 0, amountOut: 0, price: 0, error: "Failed to build swap transaction" };
    }

    // Approve Router
    const routerAddress = swapData.routerAddress;
    const allowance = await usdcToken.allowance(wallet.address, routerAddress);
    if (allowance < BigInt(usdcAmount)) {
      console.log("Approving USDC for KyberSwap Router...");
      const approveTx = await usdcToken.approve(routerAddress, ethers.MaxUint256);
      await approveTx.wait();
      console.log("Approved!");
    }

    // Execute transaction
    console.log(`Executing swap: ${amountUsd} USDC -> ~${Number(route.amountOut) / 1e18} STORY`);

    const tx = await wallet.sendTransaction({
      to: routerAddress,
      data: swapData.data,
      value: swapData.value || "0",
      gasLimit: Math.ceil(Number(route.gas) * 1.5),
    });

    console.log(`TX sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`TX confirmed!`);

    const amountOut = Number(route.amountOut) / 1e18;
    const price = amountUsd / amountOut;

    return {
      success: true,
      txHash: receipt?.hash || tx.hash,
      amountIn: amountUsd,
      amountOut,
      price,
    };
  } catch (e: any) {
    console.error("Buy error:", e);
    return {
      success: false,
      amountIn: 0,
      amountOut: 0,
      price: 0,
      error: e.message || "Unknown error",
    };
  }
}

// Sell STORY (convert to USDC)
export async function sellStory(
  user: UserConfig,
  storyAmount: number,
  slippagePct: number = 5
): Promise<TradeResult> {
  try {
    const wallet = new ethers.Wallet(user.wallet.privateKey, provider);
    const storyToken = new ethers.Contract(STORY_TOKEN, ERC20_ABI, wallet);

    const storyAmountWei = ethers.parseEther(storyAmount.toString());

    // Check STORY balance
    const balance = await storyToken.balanceOf(wallet.address);
    if (balance < storyAmountWei) {
      return {
        success: false,
        amountIn: 0,
        amountOut: 0,
        price: 0,
        error: `Insufficient STORY balance. Have: ${ethers.formatEther(balance)}, Need: ${storyAmount}`,
      };
    }

    // Get KyberSwap route
    console.log(`Getting KyberSwap route: ${storyAmount} STORY -> USDC...`);
    const route = await getKyberRoute(STORY_TOKEN, USDC_ADDRESS, storyAmountWei.toString());
    if (!route) {
      return { success: false, amountIn: 0, amountOut: 0, price: 0, error: "No route found on KyberSwap" };
    }

    console.log(`Route found: ~${Number(route.amountOut) / 1e6} USDC`);

    // Build transaction
    const slippageBps = slippagePct * 100;
    const swapData = await buildKyberSwap(route, wallet.address, wallet.address, slippageBps);
    if (!swapData) {
      return { success: false, amountIn: 0, amountOut: 0, price: 0, error: "Failed to build swap transaction" };
    }

    // Approve Router
    const routerAddress = swapData.routerAddress;
    const allowance = await storyToken.allowance(wallet.address, routerAddress);
    if (allowance < storyAmountWei) {
      console.log("Approving STORY for KyberSwap Router...");
      const approveTx = await storyToken.approve(routerAddress, ethers.MaxUint256);
      await approveTx.wait();
      console.log("Approved!");
    }

    // Execute transaction
    console.log(`Executing swap: ${storyAmount} STORY -> ~${Number(route.amountOut) / 1e6} USDC`);

    const tx = await wallet.sendTransaction({
      to: routerAddress,
      data: swapData.data,
      value: swapData.value || "0",
      gasLimit: Math.ceil(Number(route.gas) * 1.5),
    });

    console.log(`TX sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`TX confirmed!`);

    const amountOutUsdc = Number(route.amountOut) / 1e6;
    const price = amountOutUsdc / storyAmount;

    return {
      success: true,
      txHash: receipt?.hash || tx.hash,
      amountIn: storyAmount,
      amountOut: amountOutUsdc,
      price,
    };
  } catch (e: any) {
    console.error("Sell error:", e);
    return {
      success: false,
      amountIn: 0,
      amountOut: 0,
      price: 0,
      error: e.message || "Unknown error",
    };
  }
}

// Withdraw all funds to external address
export async function withdrawAll(user: UserConfig, toAddress: string): Promise<{
  success: boolean;
  storyTxHash?: string;
  usdcTxHash?: string;
  ethTxHash?: string;
  error?: string;
}> {
  try {
    const wallet = new ethers.Wallet(user.wallet.privateKey, provider);
    const storyToken = new ethers.Contract(STORY_TOKEN, ERC20_ABI, wallet);
    const usdcToken = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);

    const results: { storyTxHash?: string; usdcTxHash?: string; ethTxHash?: string } = {};

    // Transfer STORY
    const storyBalance = await storyToken.balanceOf(wallet.address);
    if (storyBalance > 0n) {
      const tx = await storyToken.transfer(toAddress, storyBalance);
      const receipt = await tx.wait();
      results.storyTxHash = receipt?.hash || tx.hash;
    }

    // Transfer USDC
    const usdcBalance = await usdcToken.balanceOf(wallet.address);
    if (usdcBalance > 0n) {
      const tx = await usdcToken.transfer(toAddress, usdcBalance);
      const receipt = await tx.wait();
      results.usdcTxHash = receipt?.hash || tx.hash;
    }

    // Transfer ETH (keep some for gas)
    const ethBalance = await provider.getBalance(wallet.address);
    const gasReserve = ethers.parseEther("0.001");
    if (ethBalance > gasReserve) {
      const sendAmount = ethBalance - gasReserve;
      const tx = await wallet.sendTransaction({
        to: toAddress,
        value: sendAmount,
      });
      const receipt = await tx.wait();
      results.ethTxHash = receipt?.hash || tx.hash;
    }

    return { success: true, ...results };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
