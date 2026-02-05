import { run } from "hardhat";

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("Set CONTRACT_ADDRESS in .env");
    process.exit(1);
  }

  const issuerAddress = process.env.ISSUER_ADDRESS;
  if (!issuerAddress) {
    console.error("Set ISSUER_ADDRESS in .env (same as deploy)");
    process.exit(1);
  }

  await run("verify:verify", {
    address: contractAddress,
    constructorArguments: ["Essay Pass Token", "EPASS", issuerAddress],
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
