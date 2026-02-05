import { ethers } from "hardhat";

/**
 * Register Remittance Agent on ERC-8004 Identity Registry
 * 
 * Based on official EIP-8004 specification:
 * https://eips.ethereum.org/EIPS/eip-8004
 * 
 * This script:
 * 1. Registers a new agent on Identity Registry (mints ERC-721)
 * 2. Sets the agent URI to the registration JSON
 * 3. Optionally sets the agent wallet (requires EIP-712 signature)
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Registering Remittance Agent with account:", deployer.address);

  // Configuration - UPDATE BEFORE RUNNING
  const config = {
    // Official ERC-8004 Identity Registry (Ethereum Mainnet)
    // https://github.com/erc-8004/erc-8004-contracts
    IDENTITY_REGISTRY: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    
    // Agent registration URI (must resolve to agent registration JSON)
    AGENT_URI: "https://8004mint.com/.well-known/remittance-agent.json",
  };

  // Official ERC-8004 Identity Registry ABI (per EIP-8004 spec)
  const IDENTITY_ABI = [
    // Registration functions
    "function register(string agentURI) external returns (uint256 agentId)",
    "function register() external returns (uint256 agentId)",
    
    // URI management
    "function setAgentURI(uint256 agentId, string calldata newURI) external",
    "function tokenURI(uint256 tokenId) external view returns (string)",
    
    // Agent wallet (requires EIP-712 signature to set)
    "function getAgentWallet(uint256 agentId) external view returns (address)",
    "function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external",
    
    // Metadata
    "function getMetadata(uint256 agentId, string metadataKey) external view returns (bytes)",
    "function setMetadata(uint256 agentId, string metadataKey, bytes metadataValue) external",
    
    // ERC-721 standard
    "function ownerOf(uint256 tokenId) external view returns (address)",
    "function totalSupply() external view returns (uint256)",
    
    // Events
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
    "event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy)",
  ];

  const identityRegistry = new ethers.Contract(
    config.IDENTITY_REGISTRY,
    IDENTITY_ABI,
    deployer
  );

  console.log("\n📋 Configuration:");
  console.log("  Identity Registry:", config.IDENTITY_REGISTRY);
  console.log("  Agent URI:", config.AGENT_URI);
  console.log("  Owner:", deployer.address);

  // Step 1: Register the agent with URI
  console.log("\n🚀 Registering agent...");
  const registerTx = await identityRegistry["register(string)"](config.AGENT_URI);
  
  console.log("  Tx hash:", registerTx.hash);
  const receipt = await registerTx.wait();
  
  // Get agent ID from Transfer event (ERC-721 mint)
  const transferEvent = receipt.logs.find(
    (log: any) => log.topics[0] === ethers.id("Transfer(address,address,uint256)")
  );
  
  if (!transferEvent) {
    console.error("❌ Could not find Transfer event");
    process.exit(1);
  }
  
  const agentId = BigInt(transferEvent.topics[3]);
  console.log("✅ Agent registered with ID:", agentId.toString());

  // Verify the URI was set
  const storedUri = await identityRegistry.tokenURI(agentId);
  console.log("✅ Agent URI verified:", storedUri);

  // Get initial agent wallet (defaults to owner)
  const agentWallet = await identityRegistry.getAgentWallet(agentId);
  console.log("✅ Agent wallet (default):", agentWallet);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📦 REMITTANCE AGENT REGISTRATION COMPLETE");
  console.log("=".repeat(60));
  console.log("\nAgent Details:");
  console.log("  Agent ID:", agentId.toString());
  console.log("  Owner:", deployer.address);
  console.log("  Agent Wallet:", agentWallet);
  console.log("  URI:", config.AGENT_URI);
  console.log("\n⚠️  Add to .env:");
  console.log(`  REMITTANCE_AGENT_ID=${agentId}`);
  console.log(`  REMITTANCE_AGENT_REGISTRY=eip155:1:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`);
  console.log("\n⚠️  View on 8004scan:");
  console.log(`  https://www.8004scan.io/agents/ethereum/${agentId}`);
  console.log("\n💡 Note: To change the agent wallet, you need to call setAgentWallet()");
  console.log("   with an EIP-712 signature proving control of the new wallet.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
