import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const issuerAddress = process.env.ISSUER_ADDRESS || deployer.address;

  const EssayGatedToken = await ethers.getContractFactory("EssayGatedToken");
  const token = await EssayGatedToken.deploy(
    "Story",
    "STORY",
    issuerAddress
  );

  await token.waitForDeployment();
  const address = await token.getAddress();

  console.log("EssayGatedToken deployed to:", address);
  console.log("Issuer (signer):", issuerAddress);
  console.log("Owner:", deployer.address);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
