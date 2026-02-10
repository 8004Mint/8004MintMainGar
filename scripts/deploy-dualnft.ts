import { ethers } from "hardhat";

/**
 * Deploy DualNFT Contract
 * 
 * Prerequisites:
 * - STORY token contract address
 * - Base URI for NFT metadata (e.g., IPFS)
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying DualNFT with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Configuration
  const STORY_TOKEN = process.env.STORY_TOKEN_ADDRESS || "0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e";
  const BASE_URI = process.env.DUALNFT_BASE_URI || "https://api.8004mint.com/dualnft/metadata/";

  console.log("\n--- Configuration ---");
  console.log("STORY Token:", STORY_TOKEN);
  console.log("Base URI:", BASE_URI);

  // Deploy DualNFT
  console.log("\n--- Deploying DualNFT ---");
  const DualNFT = await ethers.getContractFactory("DualNFT");
  const dualNFT = await DualNFT.deploy(STORY_TOKEN, BASE_URI);
  await dualNFT.waitForDeployment();

  const dualNFTAddress = await dualNFT.getAddress();
  console.log("DualNFT deployed to:", dualNFTAddress);

  // Verify deployment
  console.log("\n--- Verifying Deployment ---");
  const mintPrice = await dualNFT.MINT_PRICE();
  const burnAmount = await dualNFT.BURN_AMOUNT();
  const returnAmount = await dualNFT.RETURN_AMOUNT();
  const tokensPerNFT = await dualNFT.TOKENS_PER_NFT();
  const maxSupply = await dualNFT.MAX_SUPPLY();
  
  console.log("Mint Price:", ethers.formatEther(mintPrice), "STORY");
  console.log("Burn Amount:", ethers.formatEther(burnAmount), "STORY");
  console.log("Return Amount:", ethers.formatEther(returnAmount), "STORY");
  console.log("Tokens per NFT:", tokensPerNFT.toString());
  console.log("Max Supply:", maxSupply.toString(), "NFTs");
  console.log("Total Token Supply:", (maxSupply * tokensPerNFT).toString(), "NFT tokens");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`
Contract: DualNFT
Address:  ${dualNFTAddress}
Network:  ${(await ethers.provider.getNetwork()).name}

Configuration:
- STORY Token: ${STORY_TOKEN}
- Base URI: ${BASE_URI}

Economics:
- User pays: 10 STORY
- Burned: 2 STORY
- Returned: 8 STORY
- Minted: 1 NFT (bound to 100 NFT tokens)

Supply:
- Max NFTs: 10,000
- Max Tokens: 1,000,000

Next Steps:
1. Verify contract on Etherscan:
   npx hardhat verify --network mainnet ${dualNFTAddress} "${STORY_TOKEN}" "${BASE_URI}"

2. Set up metadata server at ${BASE_URI}

3. Users can mint by:
   - Approve DualNFT to spend 10 STORY
   - Call mint() function
`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
