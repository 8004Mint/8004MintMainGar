/**
 * Pause/Resume REMIT minting
 * 
 * Pause: DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/pause-minting.ts --network mainnet
 * Resume: DEPLOYER_PRIVATE_KEY=0x... RESUME=true npx hardhat run scripts/pause-minting.ts --network mainnet
 */
import { ethers } from "hardhat";

async function main() {
  const REMIT_TOKEN = "0xdf055fdCd8abdb4917f9A18B5dd91fE560300504";
  const REMITTANCE_CONTRACT = "0xA0988eb9EE9310e841316dA7188e22C6Ae5eE9e2";
  const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
  
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  
  const abi = [
    "function setRemittanceContract(address _remittanceContract) external",
    "function remittanceContract() view returns (address)",
    "function owner() view returns (address)",
  ];
  
  const remitToken = new ethers.Contract(REMIT_TOKEN, abi, signer);
  
  // Check current status
  const currentRemittance = await remitToken.remittanceContract();
  const owner = await remitToken.owner();
  
  console.log("Current remittanceContract:", currentRemittance);
  console.log("Contract owner:", owner);
  
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error("Signer is not the owner");
  }
  
  const resume = process.env.RESUME === "true";
  
  if (resume) {
    // Resume minting
    console.log("\n🔄 Resuming minting...");
    console.log("Setting remittanceContract to:", REMITTANCE_CONTRACT);
    
    const tx = await remitToken.setRemittanceContract(REMITTANCE_CONTRACT);
    console.log("Tx:", tx.hash);
    await tx.wait();
    
    console.log("✅ Minting RESUMED");
  } else {
    // Pause minting
    console.log("\n⏸️ Pausing minting...");
    console.log("Setting remittanceContract to:", DEAD_ADDRESS);
    
    const tx = await remitToken.setRemittanceContract(DEAD_ADDRESS);
    console.log("Tx:", tx.hash);
    await tx.wait();
    
    console.log("✅ Minting PAUSED");
  }
  
  // Verify
  const newRemittance = await remitToken.remittanceContract();
  console.log("\nNew remittanceContract:", newRemittance);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
