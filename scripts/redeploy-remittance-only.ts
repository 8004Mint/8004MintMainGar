import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Existing contract addresses
  const REMIT_TOKEN_ADDRESS = "0xdE6a9277784d192fd79DfEfd2B1eEb14aEE7be25";
  
  const config = {
    USDC_ADDRESS: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    STORY_TOKEN_ADDRESS: "0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e",
    TEAM_WALLET: "0x9d6ef6453d61cfea6864de9b1beaed4cd45f93de",
  };

  console.log("\n📋 Configuration:");
  console.log("  USDC:", config.USDC_ADDRESS);
  console.log("  STORY:", config.STORY_TOKEN_ADDRESS);
  console.log("  REMIT Token:", REMIT_TOKEN_ADDRESS);
  console.log("  Team Wallet:", config.TEAM_WALLET);

  // Step 1: Deploy new Remittance Contract (no agent signer)
  console.log("\n🚀 Deploying new Remittance (no signature required)...");
  const Remittance = await ethers.getContractFactory("Remittance");
  const remittance = await Remittance.deploy(
    config.USDC_ADDRESS,
    config.STORY_TOKEN_ADDRESS,
    REMIT_TOKEN_ADDRESS,
    config.TEAM_WALLET
  );
  await remittance.waitForDeployment();
  const remittanceAddress = await remittance.getAddress();
  console.log("✅ New Remittance deployed to:", remittanceAddress);

  // Step 2: Update RemitToken to use new Remittance contract
  console.log("\n🔗 Updating RemitToken to use new Remittance contract...");
  const RemitToken = await ethers.getContractFactory("RemitToken");
  const remitToken = RemitToken.attach(REMIT_TOKEN_ADDRESS);
  const setTx = await remitToken.setRemittanceContract(remittanceAddress);
  await setTx.wait();
  console.log("✅ RemitToken updated");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📦 REDEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log("  REMIT Token:", REMIT_TOKEN_ADDRESS, "(unchanged)");
  console.log("  Remittance (NEW):", remittanceAddress);
  console.log("\n⚠️  Old Remittance contract is now obsolete:");
  console.log("  Old: 0x7970e2c7e9E64fCAe72c26Fd84F3BEF6f9D052e5");
  console.log("\n✅ New contract does NOT require agent signature!");
  console.log("   Users can call remit() directly after approving tokens.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
