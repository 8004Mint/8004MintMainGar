import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying DualNFT404 with account:", deployer.address);

  const STORY_TOKEN = process.env.STORY_TOKEN_ADDRESS || "0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e";
  const BASE_URI = process.env.DUALNFT_BASE_URI || "ipfs://bafybeicfhlcssgs5amjomfqsa4hatcn64z44uzspz73ncjd555t2za57qq/";

  console.log("STORY Token:", STORY_TOKEN);
  console.log("Base URI:", BASE_URI);

  const DualNFT404 = await ethers.getContractFactory("DualNFT404");
  const dualNFT = await DualNFT404.deploy(STORY_TOKEN, BASE_URI);

  await dualNFT.waitForDeployment();

  const address = await dualNFT.getAddress();
  console.log("\n✅ DualNFT404 deployed to:", address);
  console.log("\nVerify with:");
  console.log(`npx hardhat verify --network mainnet ${address} "${STORY_TOKEN}" "${BASE_URI}"`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
