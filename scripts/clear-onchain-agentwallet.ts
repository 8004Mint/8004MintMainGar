import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

// Official 8004scan Identity Registry
const IDENTITY_REGISTRY = "0x8004A169f766658735B1f6CD2a91F7d8e539a432";
const AGENT_ID = 14645;

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  // Identity Registry ABI
  const abi = [
    "function setMetadata(uint256 tokenId, string calldata key, bytes calldata value) external"
  ];

  const registry = new ethers.Contract(IDENTITY_REGISTRY, abi, signer);

  // Clear agentWallet on-chain metadata (set to empty)
  console.log(`Clearing agentWallet on-chain metadata for Agent #${AGENT_ID}...`);
  const tx = await registry.setMetadata(AGENT_ID, "agentWallet", "0x");
  console.log("Transaction:", tx.hash);
  await tx.wait();
  console.log("Done! agentWallet cleared from on-chain metadata.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
