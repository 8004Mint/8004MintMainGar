/**
 * Re-register Remittance Agent (using URL as AgentURI)
 * Usage: DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/register-remittance-agent-v2.ts --network mainnet
 */
import { ethers } from "hardhat";

async function main() {
  // Identity Registry contract address
  const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
  
  // AgentURI - points directly to backend URL
  const AGENT_URI = "https://8004mint.com/.well-known/remittance-agent.json";
  
  console.log("=== Register New Remittance Agent ===");
  console.log("Agent URI:", AGENT_URI);
  
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  
  // Get balance
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  // Identity Registry ABI
  const abi = [
    "function registerAgent(string calldata agentURI) external returns (uint256)",
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  ];
  
  const identity = new ethers.Contract(IDENTITY_REGISTRY, abi, signer);
  
  // Register Agent
  console.log("\nSending transaction...");
  const tx = await identity.registerAgent(AGENT_URI);
  console.log("Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Confirmed in block:", receipt?.blockNumber);
  
  // Get new Agent ID from Transfer event
  const transferEvent = receipt?.logs.find((log: any) => {
    try {
      const parsed = identity.interface.parseLog({ topics: log.topics as string[], data: log.data });
      return parsed?.name === "Transfer";
    } catch {
      return false;
    }
  });
  
  if (transferEvent) {
    const parsed = identity.interface.parseLog({ topics: transferEvent.topics as string[], data: transferEvent.data });
    const newAgentId = parsed?.args[2];
    console.log("\n✅ New Agent ID:", newAgentId.toString());
    console.log("View on 8004scan: https://8004scan.io/agent/" + newAgentId.toString());
  }
  
  console.log("\n=== Registration Complete ===");
  console.log("Please update REMITTANCE_AGENT_ID in backend/.env to the new Agent ID");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
