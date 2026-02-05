/**
 * Remittance Agent Service
 * ERC-8004 compliant agent for monitoring remittance operations
 * Note: No signature required - users interact directly with the contract
 */

import { ethers } from "ethers";

// Configuration from environment
const REMITTANCE_CONTRACT = process.env.REMITTANCE_CONTRACT_ADDRESS || "0xA0988eb9EE9310e841316dA7188e22C6Ae5eE9e2";
const REMIT_TOKEN_ADDRESS = process.env.REMIT_TOKEN_ADDRESS || "0xdf055fdCd8abdb4917f9A18B5dd91fE560300504";
const USDC_ADDRESS = process.env.USDC_ADDRESS || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const STORY_TOKEN_ADDRESS = process.env.STORY_TOKEN_ADDRESS || "0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e";
const RPC_URL = process.env.RPC_URL || "https://lb.drpc.live/ethereum/AsVs23QoLEOwisC7Py3FTOoL9ez-0OkR8K7sOmy9-kY5";

// Required amounts
const USDC_REQUIRED = BigInt("10000000");       // 10 USDC (6 decimals)
const STORY_REQUIRED = BigInt("5000000000000000000"); // 5 STORY (18 decimals)

// ABI fragments
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
];

const REMITTANCE_ABI = [
  "function canRemit(address user) view returns (bool canDo, string reason)",
  "function remainingUserOperations(address user) view returns (uint256)",
  "function remainingTotalOperations() view returns (uint256)",
  "function totalOperations() view returns (uint256)",
  "function userOperationCount(address user) view returns (uint256)",
  "function usdc() view returns (address)",
  "function storyToken() view returns (address)",
  "function remitToken() view returns (address)",
  "function teamWallet() view returns (address)",
];

const REMIT_TOKEN_ABI = [
  "function totalMinted() view returns (uint256)",
  "function remainingMintable() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

interface VerifyResult {
  success: boolean;
  canRemit: boolean;
  reason?: string;
  data?: {
    userAddress: string;
    usdcBalance: string;
    storyBalance: string;
    usdcAllowance: string;
    storyAllowance: string;
    remainingUserOps: number;
    remainingTotalOps: number;
    userOperations: number;
  };
}

interface RemittanceStatus {
  totalOperations: number;
  remainingOperations: number;
  maxOperations: number;
  remitMinted: string;
  remitRemaining: string;
  remitTotalSupply: string;
  contractAddress: string;
  remitTokenAddress: string;
}

/**
 * Verify if a user can perform remittance operation
 */
export async function verifyRemittance(userAddress: string): Promise<VerifyResult> {
  try {
    if (!ethers.isAddress(userAddress)) {
      return { success: false, canRemit: false, reason: "Invalid address" };
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Create contract instances
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const story = new ethers.Contract(STORY_TOKEN_ADDRESS, ERC20_ABI, provider);
    const remittance = new ethers.Contract(REMITTANCE_CONTRACT, REMITTANCE_ABI, provider);

    // Check if user can remit (contract does all validation)
    const [canDo, reason] = await remittance.canRemit(userAddress);
    
    // Get detailed info
    const [
      usdcBalance, 
      storyBalance, 
      usdcAllowance, 
      storyAllowance, 
      remainingUserOps, 
      remainingTotalOps,
      userOps
    ] = await Promise.all([
      usdc.balanceOf(userAddress),
      story.balanceOf(userAddress),
      usdc.allowance(userAddress, REMITTANCE_CONTRACT),
      story.allowance(userAddress, REMITTANCE_CONTRACT),
      remittance.remainingUserOperations(userAddress),
      remittance.remainingTotalOperations(),
      remittance.userOperationCount(userAddress),
    ]);

    return {
      success: true,
      canRemit: canDo,
      reason: canDo ? undefined : reason,
      data: {
        userAddress,
        usdcBalance: (Number(usdcBalance) / 10**6).toFixed(2),
        storyBalance: (Number(storyBalance) / 10**18).toFixed(4),
        usdcAllowance: (Number(usdcAllowance) / 10**6).toFixed(2),
        storyAllowance: (Number(storyAllowance) / 10**18).toFixed(4),
        remainingUserOps: Number(remainingUserOps),
        remainingTotalOps: Number(remainingTotalOps),
        userOperations: Number(userOps),
      }
    };
  } catch (error) {
    console.error("Verify error:", error);
    return { success: false, canRemit: false, reason: "Verification failed" };
  }
}

/**
 * Get Remittance status
 */
export async function getRemittanceStatus(): Promise<RemittanceStatus> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const remittance = new ethers.Contract(REMITTANCE_CONTRACT, REMITTANCE_ABI, provider);
    const remitToken = new ethers.Contract(REMIT_TOKEN_ADDRESS, REMIT_TOKEN_ABI, provider);

    const [total, remaining, minted, mintRemaining, totalSupply] = await Promise.all([
      remittance.totalOperations(),
      remittance.remainingTotalOperations(),
      remitToken.totalMinted(),
      remitToken.remainingMintable(),
      remitToken.totalSupply(),
    ]);

    // Project completed, show remaining as 0
    const displayMax = 20000;
    
    return {
      totalOperations: Number(total),
      remainingOperations: 0, // Project completed
      maxOperations: displayMax,
      remitMinted: (Number(minted) / 10**18).toLocaleString(),
      remitRemaining: "0", // Project completed
      remitTotalSupply: (Number(totalSupply) / 10**18).toLocaleString(),
      contractAddress: REMITTANCE_CONTRACT,
      remitTokenAddress: REMIT_TOKEN_ADDRESS,
    };
  } catch (error) {
    console.error("Status error:", error);
    return {
      totalOperations: 0,
      remainingOperations: 0, // Project completed
      maxOperations: 20000,
      remitMinted: "0",
      remitRemaining: "0", // Project completed
      remitTotalSupply: "200,000",
      contractAddress: REMITTANCE_CONTRACT,
      remitTokenAddress: REMIT_TOKEN_ADDRESS,
    };
  }
}
