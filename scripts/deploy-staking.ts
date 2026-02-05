import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Story Token contract address (mainnet)
  const STORY_TOKEN_ADDRESS = "0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e";

  // Deploy staking contract
  const StoryStaking = await ethers.getContractFactory("StoryStaking");
  const staking = await StoryStaking.deploy(STORY_TOKEN_ADDRESS);
  await staking.waitForDeployment();

  const stakingAddress = await staking.getAddress();
  console.log("StoryStaking deployed to:", stakingAddress);

  // Output verification command
  console.log("\n--- Etherscan Verification ---");
  console.log(`npx hardhat verify --network mainnet ${stakingAddress} "${STORY_TOKEN_ADDRESS}"`);

  // Output contract info
  console.log("\n--- Contract Info ---");
  console.log("Lock Periods:");
  console.log("  - 7 days (Flexible): 1.0x multiplier");
  console.log("  - 30 days: 1.5x multiplier");
  console.log("  - 90 days: 2.5x multiplier");
  console.log("  - 180 days: 4.0x multiplier");
  console.log("  - 365 days: 8.0x multiplier");
  console.log("\nBase Points Rate: 0.01 points per token per day");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
