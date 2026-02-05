/**
 * Update Remittance Agent's AgentURI to backend URL
 * Usage: npx hardhat run scripts/set-remittance-agent-uri.ts --network mainnet
 */
import { ethers } from "hardhat";

async function main() {
  // Remittance Agent ID
  const AGENT_ID = 22701;
  
  // Identity Registry contract address
  const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
  
  // New AgentURI - points to backend URL
  const NEW_AGENT_URI = "https://8004mint.com/.well-known/remittance-agent.json";
  
  console.log("=== Update Remittance Agent URI ===");
  console.log("Agent ID:", AGENT_ID);
  console.log("New URI:", NEW_AGENT_URI);
  
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  
  // Identity Registry ABI (ERC-721 + ERC-8004)
  const abi = [
    "function setAgentURI(uint256 agentId, string calldata newAgentURI) external",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function ownerOf(uint256 tokenId) view returns (address)",
  ];
  
  const identity = new ethers.Contract(IDENTITY_REGISTRY, abi, signer);
  
  // Check current owner
  const owner = await identity.ownerOf(AGENT_ID);
  console.log("Agent owner:", owner);
  
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Signer is not the owner of Agent ${AGENT_ID}`);
  }
  
  // Get current URI
  const currentURI = await identity.tokenURI(AGENT_ID);
  console.log("Current URI:", currentURI.substring(0, 100) + "...");
  
  // Update URI
  console.log("\nSending transaction...");
  const tx = await identity.setAgentURI(AGENT_ID, NEW_AGENT_URI);
  console.log("Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Confirmed in block:", receipt?.blockNumber);
  
  // Verify new URI
  const newURI = await identity.tokenURI(AGENT_ID);
  console.log("\n✅ New Agent URI:", newURI);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
