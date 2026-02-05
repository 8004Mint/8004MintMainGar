import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

// Official 8004scan Identity Registry
const IDENTITY_REGISTRY = "0x8004A169f766658735B1f6CD2a91F7d8e539a432";
const AGENT_ID = 14645;

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  // Identity Registry ABI (only need setAgentWallet method)
  const abi = [
    "function setAgentWallet(uint256 agentId, address wallet) external",
    "function getAgentWallet(uint256 agentId) external view returns (address)"
  ];

  const registry = new ethers.Contract(IDENTITY_REGISTRY, abi, signer);

  // Set agentWallet to signer address
  console.log(`Setting agentWallet for Agent #${AGENT_ID} to ${signer.address}...`);
  const tx = await registry.setAgentWallet(AGENT_ID, signer.address);
  console.log("Transaction:", tx.hash);
  await tx.wait();
  console.log("Done!");

  // Verify
  const wallet = await registry.getAgentWallet(AGENT_ID);
  console.log("agentWallet:", wallet);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
