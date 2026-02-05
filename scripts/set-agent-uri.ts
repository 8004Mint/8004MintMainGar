/**
 * Update on-chain Agent agentURI to public URL (for launch).
 * Usage: set API_BASE_PUBLIC=https://your-backend-domain in .env
 * Then: npx hardhat run scripts/set-agent-uri.ts --network mainnet
 */
import { ethers } from "hardhat";

async function main() {
  const identityAddress = process.env.IDENTITY_REGISTRY_ADDRESS;
  if (!identityAddress) throw new Error("IDENTITY_REGISTRY_ADDRESS not set");
  const base = process.env.API_BASE_PUBLIC || "";
  if (!base) throw new Error("API_BASE_PUBLIC not set (e.g. https://your-api.com)");
  const agentURI = base.replace(/\/$/, "") + "/.well-known/agent-registration.json";

  const identity = await ethers.getContractAt("IdentityRegistry", identityAddress);
  const tx = await identity.setAgentURI(1, agentURI);
  await tx.wait();
  console.log("agentURI set to:", agentURI);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
