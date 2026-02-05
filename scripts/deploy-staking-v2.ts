import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Story Token address (mainnet)
  const STORY_TOKEN_ADDRESS = "0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e";

  // Deploy contract
  const StoryStakingV2 = await ethers.getContractFactory("StoryStakingV2");
  const staking = await StoryStakingV2.deploy(STORY_TOKEN_ADDRESS);
  await staking.waitForDeployment();

  const stakingAddress = await staking.getAddress();
  console.log("StoryStakingV2 deployed to:", stakingAddress);

  // Output verification command
  console.log("\n--- Etherscan Verification ---");
  console.log(`npx hardhat verify --network mainnet ${stakingAddress} "${STORY_TOKEN_ADDRESS}"`);

  // Output contract info
  console.log("\n--- Contract Info ---");
  console.log("Features:");
  console.log("  - Per-second point calculation");
  console.log("  - Dynamic multiplier: +0.1x every 30 days (max +2.0x)");
  console.log("  - VIP levels: Bronze/Silver/Gold/Diamond");
  console.log("  - Referral rewards: 10% of referee's points");
  console.log("  - Early withdrawal penalty: up to 10% tokens burned + 50% points");
  console.log("  - Pausable for emergencies");
  
  console.log("\nLock Periods:");
  console.log("  - 7 days (Flexible): 1.0x");
  console.log("  - 30 days: 1.5x");
  console.log("  - 90 days: 2.5x");
  console.log("  - 180 days: 4.0x");
  console.log("  - 365 days: 8.0x");
  
  console.log("\nVIP Levels:");
  console.log("  - Bronze: 0 STORY (base)");
  console.log("  - Silver: 10,000 STORY cumulative (+0.2x)");
  console.log("  - Gold: 50,000 STORY cumulative (+0.5x)");
  console.log("  - Diamond: 100,000 STORY cumulative (+1.0x)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
