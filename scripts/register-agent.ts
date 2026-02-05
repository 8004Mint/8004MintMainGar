import { ethers } from "hardhat";

/**
 * Register Agent on deployed IdentityRegistry (calls register(string)).
 * Requires .env: IDENTITY_REGISTRY_ADDRESS, AGENT_REGISTRATION_URI (optional, default API_BASE_PUBLIC + /.well-known/agent-registration.json)
 */
async function main() {
  const identityAddress = process.env.IDENTITY_REGISTRY_ADDRESS;
  if (!identityAddress) {
    throw new Error("IDENTITY_REGISTRY_ADDRESS not set");
  }
  let agentURI = process.env.AGENT_REGISTRATION_URI;
  if (!agentURI && process.env.API_BASE_PUBLIC) {
    agentURI = process.env.API_BASE_PUBLIC.replace(/\/$/, "") + "/.well-known/agent-registration.json";
  }
  if (!agentURI) {
    agentURI = "https://example.com/.well-known/agent-registration.json";
  }

  const identity = await ethers.getContractAt("IdentityRegistry", identityAddress);
  const tx = await identity["register(string)"](agentURI);
  await tx.wait();
  const agentId = 1n;
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const agentRegistry = `eip155:${chainId}:${identityAddress}`;
  console.log("Registered agent, agentId:", agentId.toString());
  console.log("agentURI:", agentURI);
  console.log("agentRegistry:", agentRegistry);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
