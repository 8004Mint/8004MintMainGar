/**
 * Set address as excluded from tax (for Uniswap Router, LP pools, etc.)
 * 
 * Usage: DEPLOYER_PRIVATE_KEY=0x... ADDRESS=0x... npx hardhat run scripts/exclude-from-tax.ts --network mainnet
 */
import { ethers } from "hardhat";

async function main() {
  const REMIT_TOKEN = "0xdf055fdCd8abdb4917f9A18B5dd91fE560300504";
  
  // Uniswap V2 Router (Mainnet)
  const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  // Uniswap V3 SwapRouter
  const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
  // Uniswap Universal Router
  const UNIVERSAL_ROUTER = "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD";
  
  // Target address to exclude from tax (can be passed via env var, or use default Router)
  const targetAddress = process.env.ADDRESS || UNISWAP_V2_ROUTER;
  
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  
  const abi = [
    "function setExcludedFromTax(address account, bool excluded) external",
    "function isExcludedFromTax(address) view returns (bool)",
    "function owner() view returns (address)",
  ];
  
  const remitToken = new ethers.Contract(REMIT_TOKEN, abi, signer);
  
  // Check current status
  const isExcluded = await remitToken.isExcludedFromTax(targetAddress);
  console.log("Address:", targetAddress);
  console.log("Currently excluded from tax:", isExcluded);
  
  if (isExcluded) {
    console.log("✅ Already excluded, no action needed");
    return;
  }
  
  // Set as tax excluded
  console.log("\n🔧 Setting as excluded from tax...");
  const tx = await remitToken.setExcludedFromTax(targetAddress, true);
  console.log("Tx:", tx.hash);
  await tx.wait();
  
  // Verify
  const newStatus = await remitToken.isExcludedFromTax(targetAddress);
  console.log("✅ Now excluded from tax:", newStatus);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
