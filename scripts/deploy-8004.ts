import { ethers } from "hardhat";

/**
 * Deploy ERC-8004 registries and register Story scoring Agent.
 * Outputs: IdentityRegistry, ReputationRegistry, ValidationRegistry addresses and agentId.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const baseAgentURI = process.env.AGENT_REGISTRATION_URI || "https://example.com/.well-known/agent-registration.json";

  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identity = await IdentityRegistry.deploy("ERC8004 Identity", "ERC8004-ID");
  await identity.waitForDeployment();
  const identityAddress = await identity.getAddress();
  console.log("IdentityRegistry:", identityAddress);

  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const reputation = await ReputationRegistry.deploy();
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  await reputation.initialize(identityAddress);
  console.log("ReputationRegistry:", reputationAddress);

  const ValidationRegistry = await ethers.getContractFactory("ValidationRegistry");
  const validation = await ValidationRegistry.deploy();
  await validation.waitForDeployment();
  const validationAddress = await validation.getAddress();
  await validation.initialize(identityAddress);
  console.log("ValidationRegistry:", validationAddress);

  await identity["register(string)"](baseAgentURI);
  const agentId = 1n;
  console.log("Registered essay-scoring agent, agentId:", agentId.toString());

  const agentRegistry = `eip155:${chainId}:${identityAddress}`;
  console.log("agentRegistry:", agentRegistry);
  console.log("\n--- .env ---");
  console.log("IDENTITY_REGISTRY_ADDRESS=" + identityAddress);
  console.log("REPUTATION_REGISTRY_ADDRESS=" + reputationAddress);
  console.log("VALIDATION_REGISTRY_ADDRESS=" + validationAddress);
  console.log("AGENT_ID=" + agentId.toString());
  console.log("AGENT_REGISTRY=" + agentRegistry);
  console.log("CHAIN_ID=" + chainId.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
