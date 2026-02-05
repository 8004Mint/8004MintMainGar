import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Configuration - Remittance Project
  const config = {
    // Existing token addresses (Ethereum Mainnet)
    USDC_ADDRESS: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    // Story Token already deployed on mainnet
    STORY_TOKEN_ADDRESS: "0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e",
    
    // Remittance-specific addresses
    TAX_WALLET: "0x2cbea516428816b70ea0a4f8eebdfd91c822a5b1",   // Receives 1% REMIT transfer tax
    TEAM_WALLET: "0x9d6ef6453d61cfea6864de9b1beaed4cd45f93de",  // Receives 1 USDC per operation
    LP_HOLDER: deployer.address,                                 // Receives 200k REMIT for LP
  };

  console.log("\n📋 Configuration:");
  console.log("  USDC:", config.USDC_ADDRESS);
  console.log("  STORY:", config.STORY_TOKEN_ADDRESS);
  console.log("  Tax Wallet:", config.TAX_WALLET);
  console.log("  Team Wallet:", config.TEAM_WALLET);
  console.log("  LP Holder:", config.LP_HOLDER);

  // Step 1: Deploy REMIT Token
  console.log("\n🚀 Deploying RemitToken...");
  const RemitToken = await ethers.getContractFactory("RemitToken");
  const remitToken = await RemitToken.deploy(
    config.TAX_WALLET,
    config.LP_HOLDER
  );
  await remitToken.waitForDeployment();
  const remitTokenAddress = await remitToken.getAddress();
  console.log("✅ RemitToken deployed to:", remitTokenAddress);

  // Step 2: Deploy Remittance Contract (no agent signer needed)
  console.log("\n🚀 Deploying Remittance...");
  const Remittance = await ethers.getContractFactory("Remittance");
  const remittance = await Remittance.deploy(
    config.USDC_ADDRESS,
    config.STORY_TOKEN_ADDRESS,
    remitTokenAddress,
    config.TEAM_WALLET
  );
  await remittance.waitForDeployment();
  const remittanceAddress = await remittance.getAddress();
  console.log("✅ Remittance deployed to:", remittanceAddress);

  // Step 3: Set Remittance contract in REMIT token
  console.log("\n🔗 Setting Remittance contract in RemitToken...");
  const setTx = await remitToken.setRemittanceContract(remittanceAddress);
  await setTx.wait();
  console.log("✅ Remittance contract set");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📦 DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log("  REMIT Token:", remitTokenAddress);
  console.log("  Remittance:", remittanceAddress);
  console.log("\nToken Info:");
  console.log("  - Total Supply: 1,000,000 REMIT");
  console.log("  - LP Reserve (minted to deployer): 200,000 REMIT");
  console.log("  - Mintable through Remittance: 800,000 REMIT");
  console.log("  - Transfer Tax: 1% (to Tax Wallet)");
  console.log("\nRemittance Info:");
  console.log("  - Cost per operation: 10 USDC + 5 STORY");
  console.log("  - Return per operation: 9 USDC + 10 REMIT");
  console.log("  - Max operations per wallet: 100");
  console.log("  - Max total operations: 80,000");
  console.log("\n⚠️  Next Steps:");
  console.log("  1. Verify contracts on Etherscan");
  console.log("  2. Register Agent on 8004scan");
  console.log("  3. Set up Agent backend signing service");
  console.log("  4. Update frontend with new contract addresses");
  console.log("  5. Add REMIT liquidity on Uniswap");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
