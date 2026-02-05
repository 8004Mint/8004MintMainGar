/**
 * 8004 Mint Launchpad: home + /story (Story — write story, mint tokens).
 * Depends: ethers, backend /score and /sign-claim; Material You (MD3) styling.
 */

import "./index.css";
import { ethers } from "ethers";

const LINKS = {
  twitter: "https://x.com/8004Mint",  // Official platform Twitter
  scan: "https://www.8004scan.io/",
  agentDetail: "https://www.8004scan.io/agents/ethereum/14645",
  eip8004: "https://eips.ethereum.org/EIPS/eip-8004",
  storyTwitter: "https://x.com/StoryAIon8004",  // Story project Twitter
  remitTwitter: "https://x.com/Remittance_8004",  // Remittance project Twitter
  remitAgent: "https://www.8004scan.io/agents/ethereum/22721",  // Remittance Agent
} as const;

function getRoute(): "home" | "story" | "stake" | "remit" | "bot" {
  const path = window.location.pathname;
  if (path === "/story/stake") return "stake";
  if (path === "/story") return "story";
  if (path === "/remit") return "remit";
  if (path === "/bot") return "bot";
  return "home";
}

function navigate(path: string): void {
  history.pushState(null, "", path);
  route();
}

function route(): void {
  const currentRoute = getRoute();
  if (currentRoute === "stake") {
    document.title = "Stake | Story | 8004 Mint";
    renderStake();
  } else if (currentRoute === "story") {
    document.title = "Story | 8004 Mint Launchpad";
    renderStory();
  } else if (currentRoute === "remit") {
    document.title = "Remittance | 8004 Mint";
    renderRemit();
  } else if (currentRoute === "bot") {
    document.title = "MoltBot | 8004 Mint";
    renderBot();
  } else {
    document.title = "8004 Mint Launchpad";
    renderHome();
  }
}

const API_BASE = import.meta.env?.VITE_API_BASE ?? "http://localhost:3001";
const CONTRACT_ADDRESS = import.meta.env?.VITE_CONTRACT_ADDRESS ?? "";
// V2 contract (dynamic multiplier + VIP + referral)
const STAKING_CONTRACT_ADDRESS = import.meta.env?.VITE_STAKING_CONTRACT_ADDRESS ?? "0xDF7C270C5f7Db77Abb334CEEb13D8491D9A00190";
// Old contracts (V1 + original) - for migration notice
const OLD_STAKING_CONTRACT_ADDRESS = "0x257da92B86c35b5d0454cBb6778f9D43847c7B38";
const V1_STAKING_CONTRACT_ADDRESS = "0x85c41C2813f2e4b36A24585979A92cB96723d5fd";
const REMITTANCE_CONTRACT_ADDRESS = import.meta.env?.VITE_REMITTANCE_CONTRACT_ADDRESS ?? "0xA0988eb9EE9310e841316dA7188e22C6Ae5eE9e2";
const REMIT_TOKEN_ADDRESS = import.meta.env?.VITE_REMIT_TOKEN_ADDRESS ?? "0xdf055fdCd8abdb4917f9A18B5dd91fE560300504";
const STORY_TOKEN_ADDRESS = import.meta.env?.VITE_STORY_TOKEN_ADDRESS ?? "0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e";
const REPUTATION_REGISTRY_ADDRESS = import.meta.env?.VITE_REPUTATION_REGISTRY_ADDRESS ?? "";
const IDENTITY_REGISTRY_ADDRESS = import.meta.env?.VITE_IDENTITY_REGISTRY_ADDRESS ?? "";
const AGENT_ID = import.meta.env?.VITE_AGENT_ID ?? "1";
// Ethereum mainnet USDC
const USDC_ADDRESS = import.meta.env?.VITE_USDC_ADDRESS ?? "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];

// Staking contract ABI
const STAKING_ABI = [
  "function stake(uint256 amount, uint256 lockPeriod, string referralCode) external",
  "function unstake(uint256 stakeId) external",
  "function claimPoints(uint256 stakeId) external",
  "function claimAllPoints() external",
  "function registerReferralCode(string code) external",
  "function userPoints(address) view returns (uint256)",
  "function userTotalStaked(address) view returns (uint256)",
  "function userCumulativeStaked(address) view returns (uint256)",
  "function stakeCount(address) view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function totalPointsDistributed() view returns (uint256)",
  "function totalTokensBurned() view returns (uint256)",
  "function getPendingPoints(address user, uint256 stakeId) view returns (uint256)",
  "function getTotalPendingPoints(address user) view returns (uint256)",
  "function getPenalties(address user, uint256 stakeId) view returns (uint256 pointsPenaltyPercent, uint256 tokenPenaltyPercent)",
  "function getUserActiveStakes(address user) view returns (uint256[] ids, uint256[] amounts, uint256[] endTimes, uint256[] effectiveMultipliers, uint256[] pendingPoints)",
  "function getVIPLevel(address user) view returns (uint256 level, uint256 bonusMultiplier)",
  "function getReferralInfo(address user) view returns (address myReferrer, string myCode, uint256 earnedFromReferrals)",
  "function referralCodes(string) view returns (address)",
  "function stakes(address, uint256) view returns (uint256 amount, uint256 lockPeriod, uint256 startTime, uint256 endTime, uint256 baseMultiplier, uint256 lastClaimTime, bool active)",
  "event ReferralReward(address indexed referrer, address indexed referee, uint256 points)",
  "event Staked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 lockPeriod, uint256 baseMultiplier, address referrer)",
];

// Lock periods in seconds
const LOCK_PERIODS = {
  FLEXIBLE: 7 * 24 * 60 * 60,
  DAYS_30: 30 * 24 * 60 * 60,
  DAYS_90: 90 * 24 * 60 * 60,
  DAYS_180: 180 * 24 * 60 * 60,
  DAYS_365: 365 * 24 * 60 * 60,
};

const ABI = [
  "function claim(bytes32 textHash, uint256 score, uint256 nonce, uint256 deadline, bytes signature) external",
  "function claimed(address) view returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "event Claimed(address indexed recipient, bytes32 indexed textHash, uint256 score, uint256 amount)",
];

const REPUTATION_ABI = [
  "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external",
];
const IDENTITY_ABI = ["function ownerOf(uint256 agentId) view returns (address)"];
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

// Remittance contract ABI
const REMITTANCE_ABI = [
  "function remit() external",
  "function canRemit(address user) view returns (bool canDo, string reason)",
  "function remainingUserOperations(address user) view returns (uint256)",
  "function remainingTotalOperations() view returns (uint256)",
  "function totalOperations() view returns (uint256)",
  "function userOperationCount(address user) view returns (uint256)",
];

// ERC20 ABI for approve/allowance
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

// Remit page password (for testing phase)
// Remittance page is public, no password needed

let provider: ethers.BrowserProvider | null = null;
let signer: ethers.Signer | null = null;
let manuallyDisconnected = false; // Flag for user manual disconnect

// Render funding progress bar (Story is Minted Out, showing 100%)
function renderFundingProgressBar(containerId: string): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Story is fully minted, show 100% and Minted Out
  container.innerHTML = `
    <div class="rounded-md-2xl bg-md-surface-container p-6 shadow-md-1">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-md-title-lg font-medium text-md-on-surface">Story Funding Progress</h3>
        <span class="inline-flex items-center gap-2 text-md-label-md font-medium">
          <span class="text-green-500">100%</span>
          <span class="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-green-600">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>
            Minted Out
          </span>
        </span>
      </div>
      <div class="h-4 rounded-full overflow-hidden bg-md-surface-container-low mb-3 flex">
        <div class="h-full bg-md-tertiary" style="width: 40%;" title="LP Reserve 40%"></div>
        <div class="h-full bg-green-500 transition-all duration-500" style="width: 60%;" title="Minted 60%"></div>
      </div>
      <div class="flex text-md-label-sm text-md-on-surface-variant mb-2">
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-md-tertiary"></span>LP Reserve (40%)</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-500"></span>Minted</span>
        </div>
      </div>
      <div class="mt-3 pt-3 border-t border-md-outline/20">
        <div class="flex justify-between text-md-label-sm">
          <span class="text-md-on-surface-variant">60,000 USDC raised from mints</span>
          <span class="text-md-on-surface font-medium">6,000 / 6,000 mints</span>
        </div>
      </div>
    </div>
  `;
}

// Ethereum Mainnet Chain ID
const MAINNET_CHAIN_ID = 1;

async function ensureWallet(): Promise<ethers.Signer> {
  const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
  if (!eth) throw new Error("No wallet (e.g. MetaMask) found");
  
  // Check current network
  const chainIdHex = await eth.request({ method: "eth_chainId" }) as string;
  const chainId = parseInt(chainIdHex, 16);
  
  if (chainId !== MAINNET_CHAIN_ID) {
    // Try to switch to mainnet
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x1" }],
      });
    } catch (switchError: unknown) {
      // If switch fails, throw friendly error
      throw new Error("Please switch to Ethereum Mainnet in your wallet");
    }
  }
  
  if (!provider) provider = new ethers.BrowserProvider(eth as ethers.Eip1193Provider);
  if (!signer) signer = await provider.getSigner();
  return signer;
}

// Disconnect wallet
function disconnectWallet(): void {
  provider = null;
  signer = null;
  manuallyDisconnected = true; // Prevent auto-reconnect
  updateGlobalWalletUI();
}

// Global wallet UI update
async function updateGlobalWalletUI(): Promise<void> {
  const walletBtn = document.getElementById("globalWalletBtn");
  const walletText = document.getElementById("globalWalletText");
  const walletDropdown = document.getElementById("walletDropdown");
  
  if (!walletBtn || !walletText) return;
  
  // If provider/signer don't exist and user didn't manually disconnect, try to check if wallet is authorized
  const eth = (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
  if (!provider && !signer && eth && !manuallyDisconnected) {
    try {
      // Use eth_accounts to check authorized accounts (won't popup)
      const accounts = await eth.request({ method: "eth_accounts" });
      if (accounts && accounts.length > 0) {
        // Has authorized accounts, auto restore connection state
        provider = new ethers.BrowserProvider(eth as ethers.Eip1193Provider);
        signer = await provider.getSigner();
      }
    } catch {
      // Ignore error
    }
  }
  
  if (provider && signer) {
    try {
      const address = await signer.getAddress();
      walletText.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
      walletBtn.classList.remove("btn-filled");
      walletBtn.classList.add("btn-tonal");
      if (walletDropdown) walletDropdown.classList.remove("hidden");
    } catch {
      walletText.textContent = "Connect Wallet";
      walletBtn.classList.add("btn-filled");
      walletBtn.classList.remove("btn-tonal");
      if (walletDropdown) walletDropdown.classList.add("hidden");
    }
  } else {
    walletText.textContent = "Connect Wallet";
    walletBtn.classList.add("btn-filled");
    walletBtn.classList.remove("btn-tonal");
    if (walletDropdown) walletDropdown.classList.add("hidden");
  }
}

// Generate unified Footer HTML
// projectType: "story" | "remit" | "bot" | null
function renderFooter(projectType: "story" | "remit" | "bot" | null = null): string {
  let projectLink = "";
  if (projectType === "story") {
    projectLink = `<a href="${LINKS.storyTwitter}" target="_blank" rel="noopener noreferrer" class="text-md-on-surface-variant hover:text-md-primary transition-colors">Story Twitter</a>`;
  } else if (projectType === "remit") {
    projectLink = `<a href="${LINKS.remitTwitter}" target="_blank" rel="noopener noreferrer" class="text-md-on-surface-variant hover:text-md-primary transition-colors">Remittance Twitter</a>`;
  } else if (projectType === "bot") {
    projectLink = `<a href="https://t.me/MoltStoryBot" target="_blank" rel="noopener noreferrer" class="text-md-on-surface-variant hover:text-md-primary transition-colors">MoltStoryBot</a>`;
  }
  
  return `
    <footer class="mt-16 pt-8 border-t border-md-outline/20">
      <div class="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-md-label-md">
        ${projectLink}
        <a href="${LINKS.twitter}" target="_blank" rel="noopener noreferrer" class="text-md-on-surface-variant hover:text-md-primary transition-colors">8004Mint</a>
        <a href="${LINKS.scan}" target="_blank" rel="noopener noreferrer" class="text-md-on-surface-variant hover:text-md-primary transition-colors">8004scan</a>
        <a href="${LINKS.eip8004}" target="_blank" rel="noopener noreferrer" class="text-md-on-surface-variant hover:text-md-primary transition-colors">EIP-8004</a>
      </div>
      <p class="mt-4 text-center text-md-label-sm text-md-on-surface-variant">Copyright 8004Mint, 2026</p>
    </footer>
  `;
}

// Parse error message to user-friendly hint
function parseErrorMessage(error: unknown): string {
  const errStr = error instanceof Error ? error.message : String(error);
  
  // Common wallet errors
  if (errStr.includes("user rejected") || errStr.includes("User denied")) {
    return "Transaction cancelled by user";
  }
  if (errStr.includes("insufficient funds")) {
    return "Insufficient ETH for gas fees";
  }
  if (errStr.includes("Please switch to Ethereum Mainnet")) {
    return "Please switch to Ethereum Mainnet";
  }
  if (errStr.includes("No wallet")) {
    return "Please install MetaMask or another wallet";
  }
  
  // Contract specific errors
  if (errStr.includes("Amount below minimum")) {
    return "Minimum stake is 100 STORY";
  }
  if (errStr.includes("Amount exceeds maximum")) {
    return "Maximum stake is 100,000 STORY";
  }
  if (errStr.includes("Stake not active")) {
    return "This stake is no longer active";
  }
  if (errStr.includes("No pending points")) {
    return "No points to claim";
  }
  if (errStr.includes("transfer amount exceeds balance")) {
    return "Insufficient STORY balance";
  }
  if (errStr.includes("allowance")) {
    return "Please approve STORY tokens first";
  }
  
  // Network errors
  if (errStr.includes("network") || errStr.includes("timeout")) {
    return "Network error, please try again";
  }
  
  // Truncate long error messages
  if (errStr.length > 60) {
    return errStr.slice(0, 57) + "...";
  }
  
  return errStr;
}

// Number animation function
function animateNumber(element: HTMLElement, targetValue: number, suffix: string = "", duration: number = 800): void {
  const startValue = parseFloat(element.textContent?.replace(/[^0-9.-]/g, "") || "0") || 0;
  const startTime = performance.now();
  
  function update(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function (ease-out)
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const currentValue = startValue + (targetValue - startValue) * easeOut;
    
    element.textContent = `${currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${suffix}`.trim();
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

// Toast notification system
function showToast(message: string, type: "success" | "error" | "info" = "info", txHash?: string): void {
  // Create toast container if not exists
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "fixed top-4 right-4 z-50 flex flex-col gap-2";
    document.body.appendChild(container);
  }
  
  // Color configuration
  const colors = {
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-md-primary text-md-on-primary",
  };
  
  // Create toast element
  const toast = document.createElement("div");
  toast.className = `${colors[type]} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[280px] max-w-md animate-slide-in`;
  
  // Icons
  const icons = {
    success: `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>`,
    error: `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"/></svg>`,
    info: `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"/></svg>`,
  };
  
  let content = `${icons[type]}<span class="flex-1 text-sm font-medium">${message}</span>`;
  
  // If there's a transaction hash, add link
  if (txHash) {
    content += `<a href="https://etherscan.io/tx/${txHash}" target="_blank" rel="noopener noreferrer" class="text-xs underline opacity-80 hover:opacity-100 shrink-0">View Tx</a>`;
  }
  
  toast.innerHTML = content;
  container.appendChild(toast);
  
  // Auto remove
  setTimeout(() => {
    toast.classList.add("animate-slide-out");
    setTimeout(() => toast.remove(), 300);
  }, txHash ? 6000 : 4000);
}

// Generate global navigation bar HTML
function renderGlobalNav(): string {
  return `
    <nav class="sticky top-0 z-50 bg-md-surface/80 backdrop-blur-lg border-b border-md-outline/10">
      <div class="mx-auto max-w-6xl px-4 py-3">
        <div class="flex items-center justify-between">
          <!-- Logo -->
          <a href="/" id="navLinkHome" class="flex items-center gap-2 text-md-title-lg font-medium text-md-on-surface hover:text-md-primary transition-colors">
            <img src="/favicon.png" alt="8004" class="w-8 h-8 object-contain" />
            <span>8004 Mint</span>
          </a>
          
          <!-- Desktop Nav Links -->
          <div class="hidden sm:flex items-center gap-6">
            <a href="/" id="navLinkHome2" class="text-md-label-lg text-md-on-surface-variant hover:text-md-primary transition-colors">Home</a>
            <a href="/bot" id="navLinkBot" class="text-md-label-lg text-md-on-surface-variant hover:text-md-primary transition-colors flex items-center gap-1">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              MoltBot
            </a>
            
            <!-- Projects Dropdown -->
            <div class="relative" id="projectsDropdownContainer">
              <button id="navProjectsBtn" class="flex items-center gap-1 text-md-label-lg text-md-on-surface-variant hover:text-md-primary transition-colors">
                Projects
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
              </button>
              <div id="projectsDropdown" class="hidden absolute left-0 mt-2 w-56 rounded-xl bg-md-surface-container shadow-md-2 border border-md-outline/10 overflow-hidden">
                <a href="/story" id="navLinkStory" class="flex items-center gap-3 px-4 py-3 text-md-label-md text-md-on-surface hover:bg-md-surface-container-high transition-colors">
                  <img src="/story-logo.png" alt="Story" class="w-8 h-8 rounded-lg object-cover" />
                  <div>
                    <p class="font-medium">Story</p>
                    <p class="text-xs text-md-on-surface-variant">Write & earn tokens</p>
                  </div>
                </a>
                <a href="/remit" id="navLinkRemit" class="flex items-center gap-3 px-4 py-3 text-md-label-md text-md-on-surface hover:bg-md-surface-container-high transition-colors border-t border-md-outline/10">
                  <img src="/remit-logo.png" alt="Remittance" class="w-8 h-8 rounded-lg object-cover" />
                  <div>
                    <p class="font-medium">Remittance</p>
                    <p class="text-xs text-md-on-surface-variant">Completed</p>
                  </div>
                </a>
              </div>
            </div>
            
            <!-- Staking Dropdown -->
            <div class="relative" id="stakingDropdownContainer">
              <button id="navStakingBtn" class="flex items-center gap-1 text-md-label-lg text-md-on-surface-variant hover:text-md-primary transition-colors">
                Staking
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
              </button>
              <div id="stakingDropdown" class="hidden absolute left-0 mt-2 w-56 rounded-xl bg-md-surface-container shadow-md-2 border border-md-outline/10 overflow-hidden">
                <a href="/story/stake" id="navLinkStoryStake" class="flex items-center gap-3 px-4 py-3 text-md-label-md text-md-on-surface hover:bg-md-surface-container-high transition-colors">
                  <img src="/story-logo.png" alt="Story" class="w-8 h-8 rounded-lg object-cover" />
                  <div>
                    <p class="font-medium">STORY Staking</p>
                    <p class="text-xs text-md-on-surface-variant">Stake to earn points</p>
                  </div>
                </a>
                <div class="px-4 py-3 text-md-label-sm text-md-on-surface-variant/50 border-t border-md-outline/10">
                  More staking pools coming soon...
                </div>
              </div>
            </div>
          </div>
          
          <!-- Right: Wallet + Mobile Menu Button -->
          <div class="flex items-center gap-2">
            <!-- Wallet Button -->
            <div class="relative">
              <button id="globalWalletBtn" class="btn-filled flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"/></svg>
                <span id="globalWalletText" class="hidden sm:inline">Connect Wallet</span>
                <svg id="walletChevron" class="w-4 h-4 hidden" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
              </button>
              
              <!-- Wallet Dropdown Menu -->
              <div id="walletDropdown" class="hidden absolute right-0 mt-2 w-48 rounded-xl bg-md-surface-container shadow-md-2 border border-md-outline/10 overflow-hidden z-50">
                <div id="walletAddress" class="px-4 py-3 border-b border-md-outline/10 text-md-label-sm text-md-on-surface-variant truncate"></div>
                <button id="btnCopyAddress" class="w-full px-4 py-3 text-left text-md-label-md text-md-on-surface hover:bg-md-surface-container-high transition-colors flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"/></svg>
                  Copy Address
                </button>
                <a id="btnViewEtherscan" href="#" target="_blank" rel="noopener noreferrer" class="block px-4 py-3 text-md-label-md text-md-on-surface hover:bg-md-surface-container-high transition-colors flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
                  View on Etherscan
                </a>
                <button id="btnDisconnect" class="w-full px-4 py-3 text-left text-md-label-md text-md-error hover:bg-md-error/10 transition-colors flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"/></svg>
                  Disconnect
                </button>
              </div>
            </div>
            
            <!-- Mobile Menu Button -->
            <button id="mobileMenuBtn" class="sm:hidden p-2 rounded-lg hover:bg-md-surface-container transition-colors">
              <svg id="mobileMenuIcon" class="w-6 h-6 text-md-on-surface" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
              <svg id="mobileMenuCloseIcon" class="w-6 h-6 text-md-on-surface hidden" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Mobile Menu Panel -->
      <div id="mobileMenuPanel" class="hidden sm:hidden border-t border-md-outline/10 bg-md-surface">
        <div class="px-4 py-4 space-y-2">
          <a href="/" id="mobileNavHome" class="block px-4 py-3 rounded-lg text-md-label-lg text-md-on-surface hover:bg-md-surface-container transition-colors">
            Home
          </a>
          <a href="/bot" id="mobileNavBot" class="flex items-center gap-2 px-4 py-3 rounded-lg text-md-label-lg text-md-on-surface hover:bg-md-surface-container transition-colors">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            MoltBot
          </a>
          
          <!-- Mobile Projects Section -->
          <div class="border-t border-md-outline/10 pt-2 mt-2">
            <p class="px-4 py-2 text-md-label-sm text-md-on-surface-variant font-medium">Projects</p>
            <a href="/story" id="mobileNavStory" class="flex items-center gap-3 px-4 py-3 rounded-lg text-md-label-md text-md-on-surface hover:bg-md-surface-container transition-colors">
              <img src="/story-logo.png" alt="Story" class="w-8 h-8 rounded-lg object-cover" />
              <div>
                <p class="font-medium">Story</p>
                <p class="text-xs text-md-on-surface-variant">Write & earn tokens</p>
              </div>
            </a>
            <a href="/remit" id="mobileNavRemit" class="flex items-center gap-3 px-4 py-3 rounded-lg text-md-label-md text-md-on-surface hover:bg-md-surface-container transition-colors">
              <img src="/remit-logo.png" alt="Remittance" class="w-8 h-8 rounded-lg object-cover" />
              <div>
                <p class="font-medium">Remittance</p>
                <p class="text-xs text-md-on-surface-variant">Completed</p>
              </div>
            </a>
          </div>
          
          <!-- Mobile Staking Section -->
          <div class="border-t border-md-outline/10 pt-2 mt-2">
            <p class="px-4 py-2 text-md-label-sm text-md-on-surface-variant font-medium">Staking</p>
            <a href="/story/stake" id="mobileNavStoryStake" class="flex items-center gap-3 px-4 py-3 rounded-lg text-md-label-md text-md-on-surface hover:bg-md-surface-container transition-colors">
              <img src="/story-logo.png" alt="Story" class="w-8 h-8 rounded-lg object-cover" />
              <div>
                <p class="font-medium">STORY Staking</p>
                <p class="text-xs text-md-on-surface-variant">Stake to earn points</p>
              </div>
            </a>
          </div>
          
          <!-- Mobile Links -->
          <div class="border-t border-md-outline/10 pt-2 mt-2 flex flex-wrap gap-2 px-4">
            <a href="${LINKS.twitter}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-full bg-md-surface-container text-md-label-sm text-md-on-surface-variant hover:bg-md-surface-container-high transition-colors">Twitter</a>
            <a href="${LINKS.scan}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-full bg-md-surface-container text-md-label-sm text-md-on-surface-variant hover:bg-md-surface-container-high transition-colors">8004scan</a>
            <a href="${LINKS.eip8004}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-full bg-md-surface-container text-md-label-sm text-md-on-surface-variant hover:bg-md-surface-container-high transition-colors">EIP-8004</a>
          </div>
        </div>
      </div>
    </nav>
  `;
}

// Setup global navigation bar event listeners
function setupGlobalNavListeners(): void {
  // Desktop navigation links
  document.getElementById("navLinkHome")?.addEventListener("click", (e) => { e.preventDefault(); navigate("/"); });
  document.getElementById("navLinkHome2")?.addEventListener("click", (e) => { e.preventDefault(); navigate("/"); });
  document.getElementById("navLinkBot")?.addEventListener("click", (e) => { e.preventDefault(); navigate("/bot"); });
  document.getElementById("navLinkStory")?.addEventListener("click", (e) => { e.preventDefault(); navigate("/story"); });
  document.getElementById("navLinkStoryStake")?.addEventListener("click", (e) => { e.preventDefault(); navigate("/story/stake"); });
  document.getElementById("navLinkRemit")?.addEventListener("click", (e) => { e.preventDefault(); navigate("/remit"); });
  
  // Mobile navigation links
  const mobileMenuPanel = document.getElementById("mobileMenuPanel");
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mobileMenuIcon = document.getElementById("mobileMenuIcon");
  const mobileMenuCloseIcon = document.getElementById("mobileMenuCloseIcon");
  
  function closeMobileMenu() {
    mobileMenuPanel?.classList.add("hidden");
    mobileMenuIcon?.classList.remove("hidden");
    mobileMenuCloseIcon?.classList.add("hidden");
  }
  
  mobileMenuBtn?.addEventListener("click", () => {
    const isHidden = mobileMenuPanel?.classList.toggle("hidden");
    if (isHidden) {
      mobileMenuIcon?.classList.remove("hidden");
      mobileMenuCloseIcon?.classList.add("hidden");
    } else {
      mobileMenuIcon?.classList.add("hidden");
      mobileMenuCloseIcon?.classList.remove("hidden");
    }
  });
  
  document.getElementById("mobileNavHome")?.addEventListener("click", (e) => { e.preventDefault(); closeMobileMenu(); navigate("/"); });
  document.getElementById("mobileNavBot")?.addEventListener("click", (e) => { e.preventDefault(); closeMobileMenu(); navigate("/bot"); });
  document.getElementById("mobileNavStory")?.addEventListener("click", (e) => { e.preventDefault(); closeMobileMenu(); navigate("/story"); });
  document.getElementById("mobileNavStoryStake")?.addEventListener("click", (e) => { e.preventDefault(); closeMobileMenu(); navigate("/story/stake"); });
  document.getElementById("mobileNavRemit")?.addEventListener("click", (e) => { e.preventDefault(); closeMobileMenu(); navigate("/remit"); });
  
  // Desktop Projects dropdown menu
  const projectsBtn = document.getElementById("navProjectsBtn");
  const projectsDropdown = document.getElementById("projectsDropdown");
  const projectsContainer = document.getElementById("projectsDropdownContainer");
  
  projectsBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    projectsDropdown?.classList.toggle("hidden");
    stakingDropdown?.classList.add("hidden");
  });
  
  // Desktop Staking dropdown menu
  const stakingBtn = document.getElementById("navStakingBtn");
  const stakingDropdown = document.getElementById("stakingDropdown");
  const stakingContainer = document.getElementById("stakingDropdownContainer");
  
  stakingBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    stakingDropdown?.classList.toggle("hidden");
    projectsDropdown?.classList.add("hidden");
  });
  
  // Click outside to close dropdown menu
  document.addEventListener("click", (e) => {
    if (!projectsContainer?.contains(e.target as Node)) {
      projectsDropdown?.classList.add("hidden");
    }
    if (!stakingContainer?.contains(e.target as Node)) {
      stakingDropdown?.classList.add("hidden");
    }
  });
  
  // Wallet button
  const walletBtn = document.getElementById("globalWalletBtn");
  const walletDropdown = document.getElementById("walletDropdown");
  const walletChevron = document.getElementById("walletChevron");
  let dropdownOpen = false;
  
  walletBtn?.addEventListener("click", async () => {
    if (!provider || !signer) {
      // Not connected, click to connect wallet
      manuallyDisconnected = false; // Reset manual disconnect flag
      try {
        await ensureWallet();
        await updateGlobalWalletUI();
        // Refresh current page data
        route();
      } catch (e) {
        console.error(e);
      }
    } else {
      // Already connected, toggle dropdown menu
      dropdownOpen = !dropdownOpen;
      if (dropdownOpen) {
        walletDropdown?.classList.remove("hidden");
        walletChevron?.classList.remove("hidden");
        // Update address display
        const address = await signer.getAddress();
        const addressEl = document.getElementById("walletAddress");
        if (addressEl) addressEl.textContent = address;
        const etherscanLink = document.getElementById("btnViewEtherscan") as HTMLAnchorElement;
        if (etherscanLink) etherscanLink.href = `https://etherscan.io/address/${address}`;
      } else {
        walletDropdown?.classList.add("hidden");
      }
    }
  });
  
  // Click outside to close dropdown menu
  document.addEventListener("click", (e) => {
    if (!walletBtn?.contains(e.target as Node) && !walletDropdown?.contains(e.target as Node)) {
      walletDropdown?.classList.add("hidden");
      dropdownOpen = false;
    }
  });
  
  // Copy address
  document.getElementById("btnCopyAddress")?.addEventListener("click", async () => {
    if (signer) {
      const address = await signer.getAddress();
      await navigator.clipboard.writeText(address);
      const btn = document.getElementById("btnCopyAddress");
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg> Copied!`;
        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
      }
    }
  });
  
  // Disconnect
  document.getElementById("btnDisconnect")?.addEventListener("click", () => {
    disconnectWallet();
    walletDropdown?.classList.add("hidden");
    dropdownOpen = false;
    walletChevron?.classList.add("hidden");
  });
  
  // Initialize wallet UI
  updateGlobalWalletUI();
}

function el(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (!e) throw new Error("Element not found: " + id);
  return e;
}

function show(id: string, visible: boolean): void {
  (el(id) as HTMLElement).style.display = visible ? "block" : "none";
}

function setText(id: string, text: string): void {
  el(id).textContent = text;
}

async function submitStory(): Promise<void> {
  const story = (el("storyInput") as HTMLTextAreaElement).value.trim();
  if (!story) {
    setText("scoreResult", "Please enter your story.");
    return;
  }
  setText("scoreResult", "Scoring...");
  try {
    const res = await fetch(`${API_BASE}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Score failed");
    const { score, rationale, flags } = data;
    // Story token is fully minted, only show score result, no claim function
    const mintedOutMsg = score >= 60 
      ? `Score: ${score}. ${rationale}${flags?.length ? " Flags: " + flags.join(", ") : ""}\n\n🎉 Congratulations! You passed with a score of ${score}. However, all Story tokens have been minted out. Thank you for participating!`
      : `Score: ${score}. ${rationale}${flags?.length ? " Flags: " + flags.join(", ") : ""}`;
    setText("scoreResult", mintedOutMsg);
    (window as unknown as { __lastScore?: number; __lastStory?: string }).__lastScore = score;
    (window as unknown as { __lastStory?: string }).__lastStory = story;
    // Disable claim function - all tokens have been minted
    show("claimSection", false);
    show("feedbackSection", true);
  } catch (e: unknown) {
    setText("scoreResult", "Error: " + (e instanceof Error ? e.message : String(e)));
  }
}

async function claimMint(): Promise<void> {
  const win = window as unknown as { __lastScore?: number; __lastStory?: string };
  const score = win.__lastScore;
  const story = win.__lastStory;
  if (score == null || score < 60 || !story) {
    setText("claimResult", "Submit a story and get score ≥ 60 first.");
    return;
  }
  if (!CONTRACT_ADDRESS) {
    setText("claimResult", "VITE_CONTRACT_ADDRESS not set.");
    return;
  }
  const payBtn = document.getElementById("btnPayUsdc");
  if (payBtn) (payBtn as HTMLElement).style.display = "none";
  setText("claimResult", "Connecting wallet...");
  try {
    const wallet = await ensureWallet();
    const recipient = await wallet.getAddress();
    const textHash = ethers.keccak256(ethers.toUtf8Bytes(story));

    const body = { recipient, textHash, score };
    const signClaimUrl = `${API_BASE}/sign-claim`;
    setText("claimResult", "Requesting signature...");
    let signRes: Response;
    try {
      signRes = await fetch(signClaimUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      if (msg.includes("fetch") || msg.includes("NetworkError") || msg.includes("Failed")) {
        setText("claimResult", `Cannot reach backend at ${API_BASE}. Please run "npm run backend" in project root.`);
      } else {
        setText("claimResult", "Error: " + msg);
      }
      return;
    }

    const signData = await signRes.json();
    if (signRes.status === 402 && signData.payTo) {
      (window as unknown as { __claimPayTo?: string }).__claimPayTo = signData.payTo;
      setText(
        "claimResult",
        `Payment required: send 10 USDC to ${signData.payTo}. Click "Pay 10 USDC" below, then click Claim again.`
      );
      const payBtn = document.getElementById("btnPayUsdc");
      if (payBtn) (payBtn as HTMLElement).style.display = "block";
      return;
    }
    if (!signRes.ok) throw new Error(signData.error || "Sign failed");
    const { signature, payload } = signData;

    const payBtn = document.getElementById("btnPayUsdc");
    if (payBtn) (payBtn as HTMLElement).style.display = "none";

    setText("claimResult", "Sending transaction...");
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
    const tx = await contract.claim(
      payload.textHash,
      payload.score,
      payload.nonce,
      payload.deadline,
      signature
    );
    await tx.wait();
    setText("claimResult", "Success! 100 Story tokens minted. Tx: " + tx.hash);
    show("claimSection", false);
  } catch (e: unknown) {
    setText("claimResult", "Error: " + (e instanceof Error ? e.message : String(e)));
  }
}

async function submitFeedback(): Promise<void> {
  const win = window as unknown as { __lastScore?: number };
  const score = win.__lastScore;
  if (score == null) {
    setText("feedbackResult", "Submit a story first to get a score.");
    return;
  }
  if (!REPUTATION_REGISTRY_ADDRESS) {
    setText("feedbackResult", "VITE_REPUTATION_REGISTRY_ADDRESS not set (ERC-8004).");
    return;
  }
  setText("feedbackResult", "Connecting wallet...");
  try {
    const wallet = await ensureWallet();
    const myAddress = await wallet.getAddress();

    if (IDENTITY_REGISTRY_ADDRESS) {
      const identity = new ethers.Contract(IDENTITY_REGISTRY_ADDRESS, IDENTITY_ABI, wallet);
      const ownerAddress = await identity.ownerOf(BigInt(AGENT_ID));
      if (myAddress.toLowerCase() === ownerAddress.toLowerCase()) {
        setText(
          "feedbackResult",
          "You are the agent owner. Per ERC-8004, only other users can submit reputation feedback. Use a different wallet to test."
        );
        return;
      }
    }

    const rep = new ethers.Contract(REPUTATION_REGISTRY_ADDRESS, REPUTATION_ABI, wallet);
    setText("feedbackResult", "Sending feedback to Reputation Registry...");
    const tx = await rep.giveFeedback(
      BigInt(AGENT_ID),
      score,
      0,
      "story_score",
      "",
      "",
      "",
      ZERO_BYTES32
    );
    await tx.wait();
    setText("feedbackResult", "Feedback submitted (ERC-8004 Reputation). Tx: " + tx.hash);
  } catch (e: unknown) {
    setText("feedbackResult", "Error: " + (e instanceof Error ? e.message : String(e)));
  }
}

function renderHome(): void {
  const app = el("app");
  app.innerHTML = `
    ${renderGlobalNav()}
    <div class="relative min-h-screen overflow-hidden bg-md-surface">
      <main class="relative mx-auto max-w-6xl px-4 py-10 sm:py-14 md:py-20">
        <!-- Hero card -->
        <div class="relative rounded-md-2xl sm:rounded-md-3xl shadow-md-1 md:shadow-md-2 overflow-hidden bg-md-surface-container">
          <div class="flex flex-col md:flex-row md:items-center md:min-h-[420px]">
            <!-- Left: text content -->
            <div class="flex-1 md:max-w-[55%] px-6 py-10 sm:px-10 sm:py-12 md:px-12 md:py-14 text-left relative z-10">
              <div class="inline-flex items-center gap-2 rounded-full bg-md-secondary-container px-4 py-2 text-md-label-md text-md-on-secondary-container mb-6">
                <span class="w-1.5 h-1.5 rounded-full bg-md-primary shrink-0" aria-hidden="true"></span>
                <span>ERC-8004 · Trustless Agents on Ethereum</span>
              </div>
              <h1 class="text-md-headline-lg font-medium text-md-on-surface tracking-tight md:text-md-display-lg leading-tight">
                8004 Mint
              </h1>
              <p class="mt-5 text-md-body-md text-md-on-surface-variant sm:text-md-body-lg max-w-lg leading-relaxed">
                8004 Mint Launchpad is a permissionless platform where AI agents evaluate user contributions and authorize on-chain token mints. Built on ERC-8004, enabling verifiable, trustless interactions between humans and autonomous agents.
              </p>
              <div class="mt-8 flex flex-wrap items-center gap-3">
                <a href="${LINKS.eip8004}" target="_blank" rel="noopener noreferrer" class="btn-filled min-h-[48px] min-w-[200px] px-8 text-md-label-md justify-center">
                  Learn about ERC-8004
                </a>
                <a href="${LINKS.scan}" target="_blank" rel="noopener noreferrer" class="btn-outlined min-h-[48px] min-w-[200px] px-8 text-md-label-md justify-center">
                  Explore on 8004scan
                </a>
              </div>
            </div>
            <!-- Right: geometric shapes (crisp edges, overlapping, floating animation) -->
            <div class="hidden md:flex flex-1 items-center justify-center relative min-h-[320px]" aria-hidden="true">
              <div class="relative w-[280px] h-[280px]">
                <!-- Large light circle (back layer) -->
                <div class="absolute -top-8 right-0 w-52 h-52 rounded-full bg-md-surface-container-high animate-float-slow"></div>
                <!-- Purple rounded square (tilted) -->
                <div class="absolute top-8 left-0 w-44 h-44 rounded-[32px] bg-md-primary/65 animate-float-medium" style="--rotate: -12deg;"></div>
                <!-- Blue-gray circle -->
                <div class="absolute top-14 left-12 w-40 h-40 rounded-full animate-float-fast" style="background-color: rgba(74, 101, 114, 0.65);"></div>
                <!-- Rounded triangle (bottom overlap) -->
                <svg class="absolute -bottom-2 left-2 w-44 h-44 animate-float-medium text-md-tertiary" style="--rotate: 8deg;" viewBox="0 0 100 100">
                  <path d="M50 10 Q53 10 55 14 L88 75 Q92 82 86 88 Q82 92 75 92 L25 92 Q18 92 14 88 Q8 82 12 75 L45 14 Q47 10 50 10 Z" fill="currentColor" fill-opacity="0.65"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Completed Projects -->
        <section class="mt-12 sm:mt-16">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-md-title-lg font-medium text-md-on-surface">Completed Projects</h2>
            <span class="text-md-label-sm text-md-on-surface-variant">2 projects</span>
          </div>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <!-- Story Project Card -->
            <a href="/story" id="linkStoryCompleted" class="group block rounded-md-xl bg-md-surface-container p-5 shadow-md-1 hover:shadow-md-2 transition-all duration-300 hover:-translate-y-0.5 border border-transparent hover:border-md-outline/10">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-md-lg overflow-hidden shrink-0 bg-white">
                  <img src="/story-logo.png" alt="Story" class="w-full h-full object-cover" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="text-md-title-md font-medium text-md-on-surface group-hover:text-md-primary transition-colors">Story</h3>
                    <span class="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>
                      Completed
                    </span>
                  </div>
                  <p class="text-md-body-sm text-md-on-surface-variant line-clamp-2 mb-3">Write creative stories, get AI-scored. 6,000 participants minted STORY tokens.</p>
                  <div class="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-md-on-surface-variant/70">
                    <span class="flex items-center gap-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/></svg>
                      6,000 mints
                    </span>
                    <span class="flex items-center gap-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
                      60K USDC
                    </span>
                    <span class="flex items-center gap-1 text-md-primary">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"/></svg>
                      <span id="homeTotalStaked">-- staked</span>
                    </span>
                  </div>
                </div>
                <svg class="w-5 h-5 text-md-on-surface-variant/50 group-hover:text-md-primary group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>
              </div>
            </a>
            <!-- Remittance Project Card -->
            <a href="/remit" id="linkRemitCompleted" class="group block rounded-md-xl bg-md-surface-container p-5 shadow-md-1 hover:shadow-md-2 transition-all duration-300 hover:-translate-y-0.5 border border-transparent hover:border-md-outline/10">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-md-lg overflow-hidden shrink-0">
                  <img src="/remit-logo.png" alt="Remittance" class="w-full h-full object-cover" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="text-md-title-md font-medium text-md-on-surface group-hover:text-md-primary transition-colors">Remittance</h3>
                    <span class="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>
                      Completed
                    </span>
                  </div>
                  <p class="text-md-body-sm text-md-on-surface-variant line-clamp-2 mb-3">DeFi exchange powered by ERC-8004 Agent. Burn STORY, get REMIT.</p>
                  <div class="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-md-on-surface-variant/70">
                    <span class="flex items-center gap-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/></svg>
                      20,000 max ops
                    </span>
                    <span class="flex items-center gap-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
                      200K REMIT
                    </span>
                    <span class="flex items-center gap-1 text-amber-500">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23.693L5 15.3m14.8 0 .21 1.047a1.5 1.5 0 0 1-1.088 1.747l-.527.106a48.61 48.61 0 0 1-9.79 0l-.527-.106a1.5 1.5 0 0 1-1.088-1.747L5 15.3"/></svg>
                      ERC-8004
                    </span>
                  </div>
                </div>
                <svg class="w-5 h-5 text-md-on-surface-variant/50 group-hover:text-md-primary group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>
              </div>
            </a>
          </div>
        </section>

        <!-- What is 8004 Mint Launchpad -->
        <section class="mt-16 sm:mt-20">
          <h2 class="text-md-headline-md font-medium text-md-on-surface text-center mb-10">What is 8004 Mint Launchpad?</h2>
          <div class="grid gap-6 md:grid-cols-3">
            <div class="card-md text-center">
              <div class="mx-auto mb-4 w-12 h-12 rounded-full bg-md-primary/15 flex items-center justify-center">
                <svg class="w-6 h-6 text-md-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23.693L5 15.3m14.8 0 .21 1.047a1.5 1.5 0 0 1-1.088 1.747l-.527.106a48.61 48.61 0 0 1-9.79 0l-.527-.106a1.5 1.5 0 0 1-1.088-1.747L5 15.3"/></svg>
              </div>
              <h3 class="text-md-title-lg font-medium text-md-on-surface mb-2">Agent-Powered Evaluation</h3>
              <p class="text-md-body-md text-md-on-surface-variant">Autonomous AI agents evaluate user submissions using custom criteria. No centralized gatekeepers — just transparent, programmable logic.</p>
            </div>
            <div class="card-md text-center">
              <div class="mx-auto mb-4 w-12 h-12 rounded-full bg-md-primary/15 flex items-center justify-center">
                <svg class="w-6 h-6 text-md-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/></svg>
              </div>
              <h3 class="text-md-title-lg font-medium text-md-on-surface mb-2">On-Chain Verification</h3>
              <p class="text-md-body-md text-md-on-surface-variant">Every evaluation result is signed and verifiable on-chain. Users can claim tokens only after passing the agent's criteria with cryptographic proof.</p>
            </div>
            <div class="card-md text-center">
              <div class="mx-auto mb-4 w-12 h-12 rounded-full bg-md-primary/15 flex items-center justify-center">
                <svg class="w-6 h-6 text-md-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/></svg>
              </div>
              <h3 class="text-md-title-lg font-medium text-md-on-surface mb-2">Reputation System</h3>
              <p class="text-md-body-md text-md-on-surface-variant">Built-in ERC-8004 reputation tracking. Users can submit feedback on agent performance, creating a decentralized trust layer for AI agents.</p>
            </div>
          </div>
        </section>

        <!-- How it Works -->
        <section class="mt-16 sm:mt-20">
          <h2 class="text-md-headline-md font-medium text-md-on-surface text-center mb-10">How It Works</h2>
          <div class="grid gap-4 sm:gap-6 md:grid-cols-4">
            <div class="relative rounded-md-lg bg-md-surface-container-low p-6 text-center">
              <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center text-md-label-md font-medium">1</div>
              <div class="mt-4">
                <h3 class="text-md-body-lg font-medium text-md-on-surface mb-2">Submit</h3>
                <p class="text-md-label-md text-md-on-surface-variant">User submits content (text, data, proof-of-work) to the platform.</p>
              </div>
            </div>
            <div class="relative rounded-md-lg bg-md-surface-container-low p-6 text-center">
              <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center text-md-label-md font-medium">2</div>
              <div class="mt-4">
                <h3 class="text-md-body-lg font-medium text-md-on-surface mb-2">Evaluate</h3>
                <p class="text-md-label-md text-md-on-surface-variant">ERC-8004 Agent analyzes the submission and returns a score with rationale.</p>
              </div>
            </div>
            <div class="relative rounded-md-lg bg-md-surface-container-low p-6 text-center">
              <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center text-md-label-md font-medium">3</div>
              <div class="mt-4">
                <h3 class="text-md-body-lg font-medium text-md-on-surface mb-2">Sign</h3>
                <p class="text-md-label-md text-md-on-surface-variant">If the score meets the threshold, the agent signs a claim authorization.</p>
              </div>
            </div>
            <div class="relative rounded-md-lg bg-md-surface-container-low p-6 text-center">
              <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center text-md-label-md font-medium">4</div>
              <div class="mt-4">
                <h3 class="text-md-body-lg font-medium text-md-on-surface mb-2">Mint</h3>
                <p class="text-md-label-md text-md-on-surface-variant">User submits the signed proof to the smart contract and mints tokens.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- About ERC-8004 -->
        <section class="mt-16 sm:mt-20">
          <div class="rounded-md-2xl sm:rounded-md-3xl bg-md-surface-container p-6 sm:p-10 md:p-12">
            <div class="flex flex-col md:flex-row md:items-center gap-8">
              <div class="flex-1">
                <h2 class="text-md-headline-md font-medium text-md-on-surface mb-4">Built on ERC-8004</h2>
                <p class="text-md-body-md text-md-on-surface-variant mb-4 leading-relaxed">
                  ERC-8004 is an Ethereum standard for <strong class="text-md-on-surface">Decentralized AI Agents</strong>. It defines how autonomous agents register on-chain, how they interact with users, and how their reputation is tracked transparently.
                </p>
                <ul class="space-y-2 text-md-body-md text-md-on-surface-variant">
                  <li class="flex items-start gap-2">
                    <svg class="w-5 h-5 text-md-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
                    <span><strong class="text-md-on-surface">Identity Registry</strong> — Agents are registered with unique IDs and metadata.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <svg class="w-5 h-5 text-md-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
                    <span><strong class="text-md-on-surface">Reputation Registry</strong> — Users submit feedback, building trust signals over time.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <svg class="w-5 h-5 text-md-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
                    <span><strong class="text-md-on-surface">Service Endpoints</strong> — Standardized API for agent interactions.</span>
                  </li>
                </ul>
              </div>
              <div class="flex-shrink-0 flex flex-col gap-3">
                <a href="${LINKS.eip8004}" target="_blank" rel="noopener noreferrer" class="btn-filled">Read the EIP</a>
                <a href="${LINKS.scan}" target="_blank" rel="noopener noreferrer" class="btn-tonal">Browse Agents</a>
              </div>
            </div>
          </div>
        </section>

        ${renderFooter(null)}
      </main>
    </div>
  `;
  
  // Story project card click navigation
  const linkStoryCompleted = document.getElementById("linkStoryCompleted");
  if (linkStoryCompleted) {
    linkStoryCompleted.addEventListener("click", (e) => {
      e.preventDefault();
      navigate("/story");
    });
  }
  
  // Remittance project card click navigation
  const linkRemitCompleted = document.getElementById("linkRemitCompleted");
  if (linkRemitCompleted) {
    linkRemitCompleted.addEventListener("click", (e) => {
      e.preventDefault();
      navigate("/remit");
    });
  }
  
  // Setup global navigation bar events
  setupGlobalNavListeners();
  
  // Load total staked data (using public RPC, no wallet needed)
  async function loadHomeTotalStaked() {
    try {
      // Use public RPC to read data (read-only operation)
      const publicRpc = "https://eth.llamarpc.com";
      const prov = new ethers.JsonRpcProvider(publicRpc);
      const stakingAbi = ["function totalStaked() view returns (uint256)"];
      const v2Staking = new ethers.Contract(STAKING_CONTRACT_ADDRESS, stakingAbi, prov);
      const v1Staking = new ethers.Contract(V1_STAKING_CONTRACT_ADDRESS, stakingAbi, prov);
      const oldStaking = new ethers.Contract(OLD_STAKING_CONTRACT_ADDRESS, stakingAbi, prov);
      
      // Merge total staked from all contracts
      const [v2Total, v1Total, oldTotal] = await Promise.all([
        v2Staking.totalStaked(),
        v1Staking.totalStaked(),
        oldStaking.totalStaked(),
      ]);
      const totalNum = Number(ethers.formatEther(v2Total)) + Number(ethers.formatEther(v1Total)) + Number(ethers.formatEther(oldTotal));
      const el = document.getElementById("homeTotalStaked");
      if (el) {
        el.textContent = `${totalNum.toLocaleString()} staked`;
      }
    } catch (e) {
      // Silent fail, keep default display
    }
  }
  loadHomeTotalStaked();
}

function renderStory(): void {
  const app = el("app");
  app.innerHTML = `
    ${renderGlobalNav()}
    <div class="relative min-h-screen overflow-hidden bg-md-surface">
      <main class="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:py-10 md:py-14">
        <!-- Hero Header -->
        <header class="relative rounded-md-2xl sm:rounded-md-3xl shadow-md-1 md:shadow-md-2 overflow-hidden bg-md-surface-container mb-10">
          <div class="flex flex-col md:flex-row md:items-center">
            <!-- Left: text content -->
            <div class="flex-1 px-6 py-8 sm:px-10 sm:py-10 md:px-12 md:py-12 text-left">
              <div class="inline-flex items-center gap-2 rounded-full bg-green-500/15 px-4 py-2 text-md-label-md text-green-600 mb-4">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>
                <span>Minted Out · Agent #14645</span>
              </div>
              <h1 class="text-md-headline-lg font-medium text-md-on-surface tracking-tight leading-tight">
                Story
              </h1>
              <p class="mt-4 text-md-body-md text-md-on-surface-variant sm:text-md-body-lg max-w-xl leading-relaxed">
                All <strong class="text-md-on-surface">Story Tokens</strong> have been minted! You can still write stories and get scored by our AI agent. Thank you for participating!
              </p>
            </div>
            <!-- Right: decorative icon -->
            <div class="hidden md:flex items-center justify-center px-12 py-8" aria-hidden="true">
              <div class="w-32 h-32 rounded-2xl overflow-hidden bg-white shadow-md-1">
                <img src="/story-logo.png" alt="Story" class="w-full h-full object-contain p-2" />
              </div>
            </div>
          </div>
        </header>

        <!-- Staking Banner -->
        <div class="mb-8 rounded-xl bg-gradient-to-r from-md-primary/15 via-md-tertiary/10 to-md-primary/15 p-4 border border-md-primary/20">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-md-primary/20 flex items-center justify-center">
                <svg class="w-5 h-5 text-md-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
              </div>
              <div>
                <p class="text-md-label-lg font-medium text-md-on-surface">Stake STORY, Earn Points</p>
                <p class="text-md-label-sm text-md-on-surface-variant">Up to 8x multiplier with longer lock periods</p>
              </div>
            </div>
            <a href="/story/stake" id="linkStake" class="btn-filled shrink-0">
              Go to Staking
              <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>
            </a>
          </div>
        </div>

        <div class="grid gap-8 lg:grid-cols-5">
          <!-- Main form card -->
          <div class="lg:col-span-3">
            <section class="rounded-md-2xl bg-md-surface-container p-6 sm:p-8 shadow-md-1">
              <h2 class="text-md-title-lg font-medium text-md-on-surface mb-4">Write Your Story</h2>
              <label for="storyInput" class="sr-only">Your story</label>
              <textarea
                id="storyInput"
                rows="10"
                class="w-full min-h-[200px] rounded-md-sm border-2 border-md-outline/30 bg-md-surface-container-low px-4 py-4 text-md-body-md text-md-on-surface placeholder:text-md-on-surface/40 transition-all duration-md-fast focus:border-md-primary focus:outline-none focus:ring-0 focus:shadow-md-1"
                placeholder="Once upon a time..."
                aria-describedby="story-hint"
              ></textarea>
              <p id="story-hint" class="mt-3 text-md-label-sm text-md-on-surface-variant">
                Write a creative, original story. The AI agent will evaluate based on creativity, coherence, and originality.
              </p>

              <div class="mt-6 flex flex-wrap items-center gap-3">
                <button type="button" id="btnScore" class="btn-filled">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"/></svg>
                  Submit & Score
                </button>
              </div>

              <!-- Score Result -->
              <div id="scoreResult" class="mt-6 min-h-[3rem] whitespace-pre-wrap rounded-md-sm bg-md-surface-container-low px-4 py-4 text-md-body-md text-md-on-surface border border-md-outline/20" role="status" aria-live="polite"></div>

              <!-- Feedback (ERC-8004) -->
              <div id="feedbackSection" class="mt-8 hidden border-t border-md-outline/20 pt-6">
                <h3 class="text-md-body-lg font-medium text-md-on-surface mb-3">Rate the Agent</h3>
                <p class="text-md-label-md text-md-on-surface-variant mb-4">Submit your score as on-chain feedback to help build the agent's reputation (ERC-8004).</p>
                <button type="button" id="btnFeedback" class="btn-tonal">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/></svg>
                  Submit Reputation Feedback
                </button>
                <div id="feedbackResult" class="mt-3 min-h-[1.25rem] text-md-label-md text-md-on-surface-variant" role="status" aria-live="polite"></div>
              </div>

              <!-- Claim -->
              <div id="claimSection" class="mt-8 hidden border-t border-md-outline/20 pt-6">
                <h3 class="text-md-body-lg font-medium text-md-on-surface mb-3">Claim Your Tokens</h3>
                <p id="claimHint" class="text-md-label-md text-md-on-surface-variant mb-4"></p>
                <div class="flex flex-wrap items-center gap-3">
                  <button type="button" id="btnClaim" class="btn-filled">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"/></svg>
                    Claim 100 Tokens
                  </button>
                  <button type="button" id="btnPayUsdc" class="btn-outlined hidden">
                    Pay 10 USDC
                  </button>
                </div>
                <div id="claimResult" class="mt-3 min-h-[1.25rem] text-md-label-md text-md-on-surface-variant" role="status" aria-live="polite"></div>
              </div>
            </section>
          </div>

          <!-- Sidebar -->
          <div class="lg:col-span-2 space-y-5">
            <!-- Funding Progress -->
            <div id="fundingProgressStory"></div>

            <!-- Quick Info Cards -->
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-xl bg-md-surface-container p-4">
                <p class="text-md-label-sm text-md-on-surface-variant">Total Supply</p>
                <p class="text-md-title-md font-medium text-md-on-surface">1,000,000</p>
              </div>
              <div class="rounded-xl bg-md-surface-container p-4">
                <p class="text-md-label-sm text-md-on-surface-variant">Mint Cost</p>
                <p class="text-md-title-md font-medium text-md-on-surface">10 USDC</p>
              </div>
              <div class="rounded-xl bg-md-surface-container p-4">
                <p class="text-md-label-sm text-md-on-surface-variant">Per Mint</p>
                <p class="text-md-title-md font-medium text-md-on-surface">100 STORY</p>
              </div>
              <div class="rounded-xl bg-md-surface-container p-4">
                <p class="text-md-label-sm text-md-on-surface-variant">Pass Score</p>
                <p class="text-md-title-md font-medium text-md-on-surface">60+</p>
              </div>
            </div>

            <!-- How it Works & Criteria (Collapsible) -->
            <details class="rounded-xl bg-md-surface-container overflow-hidden group" open>
              <summary class="flex items-center justify-between p-4 cursor-pointer hover:bg-md-surface-container-high transition-colors">
                <span class="text-md-title-md font-medium text-md-on-surface">How It Works</span>
                <svg class="w-5 h-5 text-md-on-surface-variant transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
              </summary>
              <div class="px-4 pb-4 space-y-2 text-md-label-md text-md-on-surface-variant">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center text-xs font-medium">1</span>
                  Write a creative story
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center text-xs font-medium">2</span>
                  Submit for AI scoring
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center text-xs font-medium">3</span>
                  Score 60+ to mint tokens
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</span>
                  <span class="line-through opacity-60">Minted Out</span>
                </div>
              </div>
            </details>

            <details class="rounded-xl bg-md-surface-container overflow-hidden group">
              <summary class="flex items-center justify-between p-4 cursor-pointer hover:bg-md-surface-container-high transition-colors">
                <span class="text-md-title-md font-medium text-md-on-surface">Scoring Criteria</span>
                <svg class="w-5 h-5 text-md-on-surface-variant transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
              </summary>
              <div class="px-4 pb-4 space-y-2 text-md-label-sm text-md-on-surface-variant">
                <p><span class="font-medium text-md-on-surface">Creativity</span> — Original ideas</p>
                <p><span class="font-medium text-md-on-surface">Coherence</span> — Clear narrative</p>
                <p><span class="font-medium text-md-on-surface">Originality</span> — Avoid clichés</p>
                <p><span class="font-medium text-md-on-surface">Relevance</span> — Stay on topic</p>
              </div>
            </details>

            <details class="rounded-xl bg-md-surface-container overflow-hidden group">
              <summary class="flex items-center justify-between p-4 cursor-pointer hover:bg-md-surface-container-high transition-colors">
                <span class="text-md-title-md font-medium text-md-on-surface">Tokenomics</span>
                <svg class="w-5 h-5 text-md-on-surface-variant transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
              </summary>
              <div class="px-4 pb-4">
                <div class="flex h-2.5 rounded-full overflow-hidden bg-md-surface-container-low mb-2">
                  <div class="bg-md-primary" style="width: 60%;"></div>
                  <div class="bg-md-tertiary" style="width: 40%;"></div>
                </div>
                <div class="flex justify-between text-md-label-sm text-md-on-surface-variant">
                  <span>60% Mintable</span>
                  <span>40% LP Reserve</span>
                </div>
              </div>
            </details>

            <!-- Agent Link -->
            <a href="${LINKS.agentDetail}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between p-4 rounded-xl bg-md-surface-container-low hover:bg-md-surface-container transition-colors group">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-md-primary/10 flex items-center justify-center">
                  <svg class="w-4 h-4 text-md-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/></svg>
                </div>
                <div>
                  <p class="text-md-label-md font-medium text-md-on-surface">Agent #14645</p>
                  <p class="text-md-label-sm text-md-on-surface-variant">View on 8004scan</p>
                </div>
              </div>
              <svg class="w-5 h-5 text-md-on-surface-variant group-hover:text-md-primary transition-colors" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
            </a>
          </div>
        </div>

        ${renderFooter("story")}
      </main>
    </div>
  `;
  el("btnScore").addEventListener("click", submitStory);
  el("btnFeedback").addEventListener("click", submitFeedback);
  el("btnClaim").addEventListener("click", claimMint);
  el("btnPayUsdc").addEventListener("click", async () => {
    const payTo = (window as unknown as { __claimPayTo?: string }).__claimPayTo;
    if (!payTo) {
      setText("claimResult", "Click Claim first to get the payment address.");
      return;
    }
    setText("claimResult", "Connecting wallet for USDC transfer...");
    try {
      const wallet = await ensureWallet();
      const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
      const amount = 10n * 10n ** 6n; // 10 USDC (6 decimals)
      const tx = await usdc.transfer(payTo, amount);
      setText("claimResult", "Payment tx sent. Waiting for confirmation...");
      await tx.wait();
      setText("claimResult", "Payment confirmed. Click Claim 100 Tokens again to get your signature.");
    } catch (e: unknown) {
      setText("claimResult", "Error: " + (e instanceof Error ? e.message : String(e)));
    }
  });

  const linkStake = document.getElementById("linkStake");
  if (linkStake) linkStake.addEventListener("click", (e) => { e.preventDefault(); navigate("/story/stake"); });

  // Render funding progress bar
  renderFundingProgressBar("fundingProgressStory");
  
  // Setup global navigation bar events
  setupGlobalNavListeners();
}

// ============ Staking Page ============

function renderStake(): void {
  const app = el("app");
  app.innerHTML = `
    ${renderGlobalNav()}
    <div class="min-h-screen bg-md-surface">
      <main class="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <!-- Header -->
        <header class="mb-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl overflow-hidden bg-white shadow-sm">
              <img src="/story-logo.png" alt="Story" class="w-full h-full object-contain" />
            </div>
            <div>
              <h1 class="text-md-headline-md font-medium text-md-on-surface">STORY Staking</h1>
              <p class="text-md-body-md text-md-on-surface-variant">Stake STORY tokens to earn points</p>
            </div>
          </div>
        </header>

        <!-- Migration Notice (shown if user has stakes in old contract) -->
        <div id="migrationNotice" class="hidden mb-6 rounded-xl bg-amber-500/10 border border-amber-500/30 p-5">
          <div class="flex items-start gap-3 mb-4">
            <svg class="w-6 h-6 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
            </svg>
            <div class="flex-1">
              <h3 class="text-md-title-sm font-medium text-amber-600 mb-1">Migration Required - Get 1.5x Bonus!</h3>
              <p class="text-md-body-sm text-md-on-surface-variant">
                You have <span id="oldStakeAmount" class="font-medium text-amber-600">--</span> STORY in the old contract.
                Withdraw below and re-stake to get <span class="font-medium text-amber-600">1.5x bonus points</span> + per-second calculation!
              </p>
            </div>
          </div>
          
          <!-- Old Stakes List -->
          <div id="oldStakesList" class="space-y-2 mb-3">
            <div class="text-center py-3 text-md-on-surface-variant text-sm">Loading old stakes...</div>
          </div>
          
          <!-- Withdraw All Button -->
          <button id="btnWithdrawAllOld" class="w-full btn-filled bg-amber-500 hover:bg-amber-600 text-white">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
            Withdraw All from Old Contract
          </button>
        </div>

        <div class="grid gap-6 lg:grid-cols-3">
          <!-- Left Column: Stats + Stake Form -->
          <div class="lg:col-span-2 space-y-6">
            
            <!-- Stats Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div class="rounded-xl bg-gradient-to-br from-md-primary/10 to-md-primary/5 p-4 border border-md-primary/20">
                <p class="text-md-label-sm text-md-on-surface-variant mb-1">Total Pool</p>
                <p id="statTotalPool" class="text-md-title-lg font-medium text-md-primary"><span class="skeleton text-md-primary/30 w-20">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
              </div>
              <div class="rounded-xl bg-md-surface-container p-4">
                <p class="text-md-label-sm text-md-on-surface-variant mb-1">My Staked</p>
                <p id="statMyStaked" class="text-md-title-lg font-medium text-md-on-surface"><span class="skeleton text-md-on-surface/20 w-20">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
              </div>
              <div class="rounded-xl bg-md-surface-container p-4">
                <p class="text-md-label-sm text-md-on-surface-variant mb-1">My Points</p>
                <p id="statMyPoints" class="text-md-title-lg font-medium text-md-tertiary"><span class="skeleton text-md-tertiary/30 w-16">&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
              </div>
              <div class="rounded-xl bg-md-surface-container p-4">
                <p class="text-md-label-sm text-md-on-surface-variant mb-1">Pending</p>
                <p id="statPendingPoints" class="text-md-title-lg font-medium text-green-600"><span class="skeleton text-green-600/30 w-16">&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
              </div>
            </div>

            <!-- VIP Level & Referral Section -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- VIP Level Card -->
              <div class="rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-4 border border-amber-500/20">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-md-label-sm text-md-on-surface-variant">VIP Level</p>
                  <span id="vipBadge" class="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-600">Bronze</span>
                </div>
                <p id="vipBonus" class="text-md-title-md font-medium text-amber-600">+0.0x Bonus</p>
                <p class="text-md-label-sm text-md-on-surface-variant mt-1">
                  Next: <span id="vipNextLevel" class="text-amber-600">Stake 10,000 STORY for Silver</span>
                </p>
              </div>

              <!-- Referral Card -->
              <div class="rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-4 border border-purple-500/20">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-md-label-sm text-md-on-surface-variant">Referral Rewards</p>
                  <span class="text-md-label-sm text-purple-600">10% of referee points</span>
                </div>
                <p id="referralEarned" class="text-md-title-md font-medium text-purple-600">0 Points</p>
                <p class="text-md-label-sm text-md-on-surface-variant mt-1">
                  Referrer: <span id="myReferrer" class="text-md-on-surface">None</span>
                </p>
              </div>
            </div>

            <!-- Referral Code Section -->
            <div class="rounded-xl bg-md-surface-container p-4">
              <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                <div class="flex-1">
                  <p class="text-md-label-sm text-md-on-surface-variant mb-1">Your Referral Code</p>
                  <div id="referralCodeSection" class="flex items-center gap-2">
                    <span id="myReferralCode" class="text-md-body-md font-mono text-md-on-surface">Not registered</span>
                    <button id="btnCopyReferral" class="hidden p-1.5 rounded-md hover:bg-md-surface-container-high transition-colors" title="Copy referral link">
                      <svg class="w-4 h-4 text-md-on-surface-variant" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"/></svg>
                    </button>
                  </div>
                </div>
                <div id="registerCodeSection" class="flex items-center gap-2">
                  <input type="text" id="newReferralCode" placeholder="Enter code (a-z, 0-9)" maxlength="20" pattern="[a-zA-Z0-9]+"
                    class="w-32 sm:w-40 rounded-lg border border-md-outline/30 bg-md-surface-container-low px-3 py-2 text-md-body-sm text-md-on-surface placeholder:text-md-on-surface/40 focus:border-md-primary focus:outline-none" />
                  <button id="btnRegisterCode" class="btn-tonal text-sm whitespace-nowrap">Register</button>
                </div>
              </div>
            </div>

            <!-- My Referrals List -->
            <div id="myReferralsSection" class="hidden rounded-xl bg-md-surface-container p-4">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-md-title-sm font-medium text-md-on-surface">My Referrals</h3>
                <span id="referralCount" class="text-md-label-sm text-purple-600">0 users</span>
              </div>
              <div id="referralsList" class="space-y-2 max-h-48 overflow-y-auto">
                <p class="text-md-body-sm text-md-on-surface-variant text-center py-2">No referrals yet</p>
              </div>
            </div>

            <!-- Stake Form -->
            <div class="rounded-2xl bg-md-surface-container p-6 shadow-md-1">
              <h2 class="text-md-title-lg font-medium text-md-on-surface mb-4">Stake STORY</h2>
              
              <!-- Amount Input -->
              <div class="mb-4">
                <label class="block text-md-label-md text-md-on-surface-variant mb-2">Amount</label>
                <div class="relative">
                  <input type="number" id="stakeAmount" placeholder="1000" min="100" max="100000" 
                    class="w-full rounded-lg border-2 border-md-outline/30 bg-md-surface-container-low px-4 py-3 text-md-body-lg text-md-on-surface placeholder:text-md-on-surface/40 focus:border-md-primary focus:outline-none transition-colors" />
                  <button id="btnMaxAmount" class="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded-md bg-md-primary/10 text-md-primary text-md-label-sm font-medium hover:bg-md-primary/20 transition-colors">
                    MAX
                  </button>
                </div>
                <p id="stakeBalance" class="mt-2 text-md-label-sm text-md-on-surface-variant">Balance: -- STORY</p>
              </div>

              <!-- Lock Period Selection -->
              <div class="mb-4">
                <label class="block text-md-label-md text-md-on-surface-variant mb-2">Lock Period</label>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  <button data-period="604800" class="lock-period-btn selected rounded-lg border-2 border-md-primary bg-md-primary/10 p-2.5 sm:p-3 text-center transition-all">
                    <p class="text-md-label-sm sm:text-md-label-md font-medium text-md-primary">Flexible</p>
                    <p class="text-xs sm:text-md-label-sm text-md-primary/70">1.0x</p>
                  </button>
                  <button data-period="2592000" class="lock-period-btn rounded-lg border-2 border-md-outline/30 bg-md-surface-container-low p-2.5 sm:p-3 text-center hover:border-md-primary/50 transition-all">
                    <p class="text-md-label-sm sm:text-md-label-md font-medium text-md-on-surface">30 Days</p>
                    <p class="text-xs sm:text-md-label-sm text-md-on-surface-variant">1.5x</p>
                  </button>
                  <button data-period="7776000" class="lock-period-btn rounded-lg border-2 border-md-outline/30 bg-md-surface-container-low p-2.5 sm:p-3 text-center hover:border-md-primary/50 transition-all">
                    <p class="text-md-label-sm sm:text-md-label-md font-medium text-md-on-surface">90 Days</p>
                    <p class="text-xs sm:text-md-label-sm text-md-on-surface-variant">2.5x</p>
                  </button>
                  <button data-period="15552000" class="lock-period-btn rounded-lg border-2 border-md-outline/30 bg-md-surface-container-low p-2.5 sm:p-3 text-center hover:border-md-primary/50 transition-all">
                    <p class="text-md-label-sm sm:text-md-label-md font-medium text-md-on-surface">180 Days</p>
                    <p class="text-xs sm:text-md-label-sm text-md-on-surface-variant">4.0x</p>
                  </button>
                  <button data-period="31536000" class="lock-period-btn rounded-lg border-2 border-md-outline/30 bg-md-surface-container-low p-2.5 sm:p-3 text-center hover:border-md-primary/50 transition-all col-span-2 sm:col-span-1">
                    <p class="text-md-label-sm sm:text-md-label-md font-medium text-md-on-surface">365 Days</p>
                    <p class="text-xs sm:text-md-label-sm text-md-on-surface-variant">8.0x</p>
                  </button>
                </div>
              </div>

              <!-- Estimate -->
              <div class="mb-6 p-4 rounded-lg bg-md-surface-container-low">
                <div class="flex justify-between items-center">
                  <span class="text-md-label-md text-md-on-surface-variant">Estimated Daily Points</span>
                  <span id="estimatedPoints" class="text-md-title-md font-medium text-md-primary">~0 Points/day</span>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-3">
                <button id="btnApprove" class="flex-1 btn-outlined hidden">
                  Approve STORY
                </button>
                <button id="btnStake" class="flex-1 btn-filled">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
                  Stake
                </button>
              </div>
              <p id="stakeResult" class="mt-3 text-md-label-md text-md-on-surface-variant text-center"></p>
            </div>

            <!-- My Stakes List -->
            <div class="rounded-2xl bg-md-surface-container p-6 shadow-md-1">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-md-title-lg font-medium text-md-on-surface">My Stakes</h2>
                <button id="btnClaimAll" class="btn-tonal text-sm hidden">
                  Claim All Points
                </button>
              </div>
              <div id="stakesList" class="space-y-4">
                <div class="text-center py-8 text-md-on-surface-variant">
                  <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"/></svg>
                  <p>Connect wallet to view your stakes</p>
                </div>
              </div>
            </div>

            <!-- Leaderboards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Staking Leaderboard -->
              <div class="rounded-2xl bg-md-surface-container p-5 shadow-md-1">
                <div class="flex items-center gap-2 mb-4">
                  <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-2.992 0"/></svg>
                  <h3 class="text-md-title-md font-medium text-md-on-surface">Top Stakers</h3>
                </div>
                <div id="stakingLeaderboard" class="space-y-1.5 max-h-64 overflow-y-auto">
                  <div class="text-center py-6 text-md-on-surface-variant text-sm">Loading...</div>
                </div>
              </div>

              <!-- Points Leaderboard -->
              <div class="rounded-2xl bg-md-surface-container p-5 shadow-md-1">
                <div class="flex items-center gap-2 mb-4">
                  <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/></svg>
                  <h3 class="text-md-title-md font-medium text-md-on-surface">Top Points</h3>
                </div>
                <div id="pointsLeaderboard" class="space-y-1.5 max-h-64 overflow-y-auto">
                  <div class="text-center py-6 text-md-on-surface-variant text-sm">Loading...</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Info -->
          <div class="space-y-6">
            <!-- How it Works -->
            <div class="rounded-2xl bg-md-surface-container p-6 shadow-md-1">
              <h3 class="text-md-title-lg font-medium text-md-on-surface mb-4">How it Works</h3>
              <ol class="space-y-3 text-md-body-sm text-md-on-surface-variant">
                <li class="flex items-start gap-3">
                  <span class="w-6 h-6 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center text-xs font-medium shrink-0">1</span>
                  <span>Choose amount and lock period</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="w-6 h-6 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center text-xs font-medium shrink-0">2</span>
                  <span>Longer lock = higher base multiplier</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="w-6 h-6 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center text-xs font-medium shrink-0">3</span>
                  <span>Earn <strong>per-second</strong> points while staked</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="w-6 h-6 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center text-xs font-medium shrink-0">4</span>
                  <span>Get +0.1x bonus every 30 days (max +2.0x)</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="w-6 h-6 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center text-xs font-medium shrink-0">5</span>
                  <span>Invite friends for 10% referral rewards</span>
                </li>
              </ol>
            </div>

            <!-- Multipliers -->
            <div class="rounded-2xl bg-md-surface-container p-6 shadow-md-1">
              <h3 class="text-md-title-lg font-medium text-md-on-surface mb-4">Base Multipliers</h3>
              <div class="space-y-2 mb-4">
                <div class="flex justify-between text-md-body-sm">
                  <span class="text-md-on-surface-variant">Flexible</span>
                  <span class="text-md-on-surface font-medium">1.0x</span>
                </div>
                <div class="flex justify-between text-md-body-sm">
                  <span class="text-md-on-surface-variant">30 Days</span>
                  <span class="text-md-on-surface font-medium">1.5x</span>
                </div>
                <div class="flex justify-between text-md-body-sm">
                  <span class="text-md-on-surface-variant">90 Days</span>
                  <span class="text-md-on-surface font-medium">2.5x</span>
                </div>
                <div class="flex justify-between text-md-body-sm">
                  <span class="text-md-on-surface-variant">180 Days</span>
                  <span class="text-md-on-surface font-medium">4.0x</span>
                </div>
                <div class="flex justify-between text-md-body-sm">
                  <span class="text-md-on-surface-variant">365 Days</span>
                  <span class="text-md-on-surface font-medium">8.0x</span>
                </div>
              </div>
              <div class="pt-3 border-t border-md-outline/10">
                <p class="text-md-label-sm text-md-on-surface-variant">Dynamic Bonus: +0.1x every 30 days</p>
                <p class="text-md-label-sm text-md-on-surface-variant">Maximum bonus: +2.0x</p>
              </div>
            </div>

            <!-- VIP Levels -->
            <div class="rounded-2xl bg-md-surface-container p-6 shadow-md-1">
              <h3 class="text-md-title-lg font-medium text-md-on-surface mb-4">VIP Levels</h3>
              <div class="space-y-2">
                <div class="flex justify-between text-md-body-sm items-center">
                  <span class="text-gray-500">Bronze</span>
                  <span class="text-md-on-surface-variant">Default</span>
                </div>
                <div class="flex justify-between text-md-body-sm items-center">
                  <span class="text-gray-400">Silver</span>
                  <span class="text-md-on-surface-variant">10,000 STORY (+0.2x)</span>
                </div>
                <div class="flex justify-between text-md-body-sm items-center">
                  <span class="text-amber-500">Gold</span>
                  <span class="text-md-on-surface-variant">50,000 STORY (+0.5x)</span>
                </div>
                <div class="flex justify-between text-md-body-sm items-center">
                  <span class="text-cyan-400">Diamond</span>
                  <span class="text-md-on-surface-variant">100,000 STORY (+1.0x)</span>
                </div>
              </div>
              <p class="text-md-label-sm text-md-on-surface-variant mt-3">Based on cumulative staked amount</p>
            </div>

            <!-- Early Withdrawal -->
            <div class="rounded-2xl bg-md-error-container p-6">
              <h3 class="text-md-title-md font-medium text-md-on-error-container mb-2">Early Withdrawal Penalty</h3>
              <div class="text-md-body-sm text-md-on-error-container/80 space-y-2">
                <p><strong>Points:</strong> Up to 50% penalty (decreases over time)</p>
                <p><strong>Tokens:</strong> Up to 10% burned (decreases over time)</p>
                <p class="text-md-label-sm mt-2 opacity-70">Flexible stakes have no penalty</p>
              </div>
            </div>

            <!-- Burned Tokens -->
            <div class="rounded-xl bg-md-surface-container-low p-4">
              <p class="text-md-label-sm text-md-on-surface-variant mb-1">Total Tokens Burned</p>
              <p id="statTokensBurned" class="text-md-title-md font-medium text-red-500">-- STORY</p>
            </div>

            <!-- Contract Info -->
            <div class="rounded-xl bg-md-surface-container-low p-4">
              <p class="text-md-label-sm text-md-on-surface-variant mb-1">Staking Contract</p>
              <div class="flex items-center gap-2">
                <a href="https://etherscan.io/address/${STAKING_CONTRACT_ADDRESS}" target="_blank" rel="noopener noreferrer" 
                  class="text-md-label-sm text-md-primary hover:underline break-all flex-1">
                  ${STAKING_CONTRACT_ADDRESS.slice(0, 10)}...${STAKING_CONTRACT_ADDRESS.slice(-8)}
                </a>
                <button id="btnCopyContract" class="p-1.5 rounded-md hover:bg-md-surface-container transition-colors" title="Copy address">
                  <svg class="w-4 h-4 text-md-on-surface-variant" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        ${renderFooter("story")}
      </main>
    </div>
  `;

  // Setup global navigation bar events
  setupGlobalNavListeners();

  // Lock period selection
  let selectedPeriod = LOCK_PERIODS.FLEXIBLE;
  document.querySelectorAll(".lock-period-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".lock-period-btn").forEach(b => {
        b.classList.remove("selected", "border-md-primary", "bg-md-primary/10");
        b.classList.add("border-md-outline/30", "bg-md-surface-container-low");
        b.querySelectorAll("p").forEach(p => {
          p.classList.remove("text-md-primary", "text-md-primary/70");
          p.classList.add("text-md-on-surface", "text-md-on-surface-variant");
        });
      });
      btn.classList.add("selected", "border-md-primary", "bg-md-primary/10");
      btn.classList.remove("border-md-outline/30", "bg-md-surface-container-low");
      btn.querySelectorAll("p").forEach(p => {
        p.classList.remove("text-md-on-surface", "text-md-on-surface-variant");
        p.classList.add("text-md-primary", "text-md-primary/70");
      });
      selectedPeriod = parseInt((btn as HTMLElement).dataset.period || "604800");
      updateEstimate();
    });
  });

  // Amount input
  const amountInput = document.getElementById("stakeAmount") as HTMLInputElement;
  amountInput?.addEventListener("input", updateEstimate);
  
  // Enter key to submit stake
  amountInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("btnStake")?.click();
    }
  });

  function updateEstimate() {
    const inputValue = amountInput?.value;
    const estimateEl = document.getElementById("estimatedPoints");
    if (!estimateEl || !amountInput) return;
    
    // Calculate: amount * 0.01 * multiplier
    const multipliers: Record<number, number> = {
      604800: 1.0,
      2592000: 1.5,
      7776000: 2.5,
      15552000: 4.0,
      31536000: 8.0,
    };
    const mult = multipliers[selectedPeriod] || 1.0;
    
    // Reset input field style
    amountInput.classList.remove("border-red-500", "border-green-500");
    
    // If no input, show example based on 1000
    if (!inputValue || inputValue === "") {
      const exampleDaily = 1000 * 0.01 * mult;
      estimateEl.innerHTML = `<span class="text-md-on-surface-variant">~${exampleDaily.toFixed(0)} pts/day (e.g. 1000 STORY)</span>`;
      return;
    }
    
    const amount = parseFloat(inputValue);
    
    // Validate minimum value
    if (amount < 100) {
      amountInput.classList.add("border-red-500");
      estimateEl.innerHTML = `<span class="text-red-500">Min 100 STORY required</span>`;
      return;
    }
    
    // Validate maximum value
    if (amount > 100000) {
      amountInput.classList.add("border-red-500");
      estimateEl.innerHTML = `<span class="text-red-500">Max 100,000 STORY allowed</span>`;
      return;
    }
    
    // Valid range, show green border
    amountInput.classList.add("border-green-500");
    const daily = amount * 0.01 * mult;
    const perSecond = daily / 86400;
    estimateEl.innerHTML = `<span class="text-md-primary font-medium">~${daily.toFixed(1)} pts/day</span> <span class="text-md-on-surface-variant text-xs">(${perSecond.toFixed(8)}/sec)</span>`;
  }
  
  // Initialize estimate display on page load
  updateEstimate();

  // MAX button
  document.getElementById("btnMaxAmount")?.addEventListener("click", async () => {
    try {
      const wallet = await ensureWallet();
      const address = await wallet.getAddress();
      const token = new ethers.Contract(CONTRACT_ADDRESS, ["function balanceOf(address) view returns (uint256)"], wallet);
      const balance = await token.balanceOf(address);
      const balanceNum = Number(ethers.formatEther(balance));
      const maxStake = Math.min(balanceNum, 100000);
      if (amountInput) amountInput.value = Math.floor(maxStake).toString();
      updateEstimate();
    } catch (e) {
      console.error(e);
    }
  });

  // Loading animation SVG
  const spinnerSvg = `<svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
  
  // Stake button
  const stakeBtn = document.getElementById("btnStake") as HTMLButtonElement;
  stakeBtn?.addEventListener("click", async () => {
    const resultEl = document.getElementById("stakeResult");
    const amount = parseFloat(amountInput?.value || "0");
    
    if (amount < 100) {
      if (resultEl) resultEl.textContent = "Minimum stake is 100 STORY";
      return;
    }
    if (amount > 100000) {
      if (resultEl) resultEl.textContent = "Maximum stake is 100,000 STORY";
      return;
    }

    // Disable button and show loading state
    const originalContent = stakeBtn.innerHTML;
    stakeBtn.disabled = true;
    stakeBtn.innerHTML = spinnerSvg + '<span class="ml-2">Processing...</span>';

    try {
      if (resultEl) resultEl.textContent = "Connecting wallet...";
      const wallet = await ensureWallet();
      const address = await wallet.getAddress();
      
      // Check allowance
      const token = new ethers.Contract(CONTRACT_ADDRESS, [
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
      ], wallet);
      
      const amountWei = ethers.parseEther(amount.toString());
      const allowance = await token.allowance(address, STAKING_CONTRACT_ADDRESS);
      
      if (allowance < amountWei) {
        if (resultEl) resultEl.textContent = "Approving STORY...";
        stakeBtn.innerHTML = spinnerSvg + '<span class="ml-2">Approving...</span>';
        const approveTx = await token.approve(STAKING_CONTRACT_ADDRESS, ethers.MaxUint256);
        await approveTx.wait();
      }
      
      if (resultEl) resultEl.textContent = "Staking...";
      stakeBtn.innerHTML = spinnerSvg + '<span class="ml-2">Staking...</span>';
      const staking = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, wallet);
      
      // Get referral code (from URL param or input)
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get("ref") || (document.getElementById("referralCodeInput") as HTMLInputElement)?.value || "";
      
      const tx = await staking.stake(amountWei, selectedPeriod, refCode);
      await tx.wait();
      
      if (resultEl) resultEl.textContent = "";
      if (amountInput) amountInput.value = "";
      showToast(`Staked ${amount.toLocaleString()} STORY successfully!`, "success", tx.hash);
      
      // Refresh data
      loadStakingData();
    } catch (e: unknown) {
      if (resultEl) resultEl.textContent = "";
      showToast(parseErrorMessage(e), "error");
    } finally {
      // Restore button state
      stakeBtn.disabled = false;
      stakeBtn.innerHTML = originalContent;
    }
  });

  // Claim All button
  const claimAllBtn = document.getElementById("btnClaimAll") as HTMLButtonElement;
  claimAllBtn?.addEventListener("click", async () => {
    const originalContent = claimAllBtn.innerHTML;
    claimAllBtn.disabled = true;
    claimAllBtn.innerHTML = spinnerSvg + '<span class="ml-1">Claiming...</span>';
    
    try {
      const wallet = await ensureWallet();
      const staking = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, wallet);
      const tx = await staking.claimAllPoints();
      await tx.wait();
      showToast("All points claimed successfully!", "success", tx.hash);
      loadStakingData();
    } catch (e) {
      console.error(e);
      showToast(parseErrorMessage(e), "error");
    } finally {
      claimAllBtn.disabled = false;
      claimAllBtn.innerHTML = originalContent;
    }
  });
  
  // Withdraw All from Old Contract button
  const btnWithdrawAllOld = document.getElementById("btnWithdrawAllOld") as HTMLButtonElement;
  btnWithdrawAllOld?.addEventListener("click", async () => {
    const originalContent = btnWithdrawAllOld.innerHTML;
    btnWithdrawAllOld.disabled = true;
    btnWithdrawAllOld.innerHTML = spinnerSvg + '<span class="ml-2">Withdrawing all...</span>';
    
    try {
      const wallet = await ensureWallet();
      const address = await wallet.getAddress();
      
      const oldAbi = [
        "function userTotalStaked(address) view returns (uint256)",
        "function stakeCount(address) view returns (uint256)",
        "function stakes(address, uint256) view returns (uint256 amount, uint256 lockPeriod, uint256 startTime, uint256 endTime, uint256 multiplier, uint256 lastClaimTime, bool active)",
        "function unstake(uint256 stakeId) external",
      ];
      const oldStaking = new ethers.Contract(OLD_STAKING_CONTRACT_ADDRESS, oldAbi, wallet);
      const v1Staking = new ethers.Contract(V1_STAKING_CONTRACT_ADDRESS, oldAbi, wallet);
      
      let withdrawCount = 0;
      
      // Withdraw from V0
      const oldStaked = await oldStaking.userTotalStaked(address);
      if (oldStaked > 0n) {
        const count = await oldStaking.stakeCount(address);
        for (let i = 0; i < Number(count); i++) {
          try {
            const stake = await oldStaking.stakes(address, i);
            if (stake.active) {
              btnWithdrawAllOld.innerHTML = spinnerSvg + `<span class="ml-2">Withdrawing V0 #${i}...</span>`;
              const tx = await oldStaking.unstake(i);
              await tx.wait();
              withdrawCount++;
            }
          } catch { /* skip failed */ }
        }
      }
      
      // Withdraw from V1
      const v1Staked = await v1Staking.userTotalStaked(address);
      if (v1Staked > 0n) {
        const count = await v1Staking.stakeCount(address);
        for (let i = 0; i < Number(count); i++) {
          try {
            const stake = await v1Staking.stakes(address, i);
            if (stake.active) {
              btnWithdrawAllOld.innerHTML = spinnerSvg + `<span class="ml-2">Withdrawing V1 #${i}...</span>`;
              const tx = await v1Staking.unstake(i);
              await tx.wait();
              withdrawCount++;
            }
          } catch { /* skip failed */ }
        }
      }
      
      if (withdrawCount > 0) {
        showToast(`Withdrawn ${withdrawCount} stakes! Now re-stake for 1.5x bonus!`, "success");
      } else {
        showToast("No active stakes found to withdraw", "error");
      }
      loadStakingData();
    } catch (e) {
      console.error(e);
      showToast(parseErrorMessage(e), "error");
    } finally {
      btnWithdrawAllOld.disabled = false;
      btnWithdrawAllOld.innerHTML = originalContent;
    }
  });
  
  // Register Referral Code button
  const btnRegisterCode = document.getElementById("btnRegisterCode") as HTMLButtonElement;
  btnRegisterCode?.addEventListener("click", async () => {
    const codeInput = document.getElementById("newReferralCode") as HTMLInputElement;
    const code = codeInput?.value?.trim();
    
    if (!code || code.length < 3) {
      showToast("Code must be at least 3 characters", "error");
      return;
    }
    
    if (code.length > 20) {
      showToast("Code must be at most 20 characters", "error");
      return;
    }
    
    if (!/^[a-zA-Z0-9]+$/.test(code)) {
      showToast("Code can only contain letters and numbers", "error");
      return;
    }
    
    const originalContent = btnRegisterCode.innerHTML;
    btnRegisterCode.disabled = true;
    btnRegisterCode.innerHTML = spinnerSvg;
    
    try {
      const wallet = await ensureWallet();
      const staking = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, wallet);
      const address = await wallet.getAddress();
      
      // Pre-check: is code already taken?
      const codeOwner = await staking.referralCodes(code);
      if (codeOwner !== "0x0000000000000000000000000000000000000000") {
        showToast(`Code "${code}" is already taken`, "error");
        btnRegisterCode.disabled = false;
        btnRegisterCode.innerHTML = originalContent;
        return;
      }
      
      // Pre-check: does user already have a code?
      const [, existingCode] = await staking.getReferralInfo(address);
      if (existingCode && existingCode.length > 0) {
        showToast(`You already have code: ${existingCode}`, "error");
        btnRegisterCode.disabled = false;
        btnRegisterCode.innerHTML = originalContent;
        return;
      }
      
      const tx = await staking.registerReferralCode(code);
      await tx.wait();
      showToast(`Referral code "${code}" registered!`, "success", tx.hash);
      loadStakingData();
    } catch (e) {
      console.error(e);
      showToast(parseErrorMessage(e), "error");
    } finally {
      btnRegisterCode.disabled = false;
      btnRegisterCode.innerHTML = originalContent;
    }
  });
  
  // Copy Referral Link button
  const btnCopyReferral = document.getElementById("btnCopyReferral") as HTMLButtonElement;
  btnCopyReferral?.addEventListener("click", async () => {
    const myCode = document.getElementById("myReferralCode")?.textContent;
    if (!myCode || myCode === "Not registered") return;
    
    const referralLink = `${window.location.origin}/story/stake?ref=${myCode}`;
    try {
      await navigator.clipboard.writeText(referralLink);
      showToast("Referral link copied!", "success");
    } catch {
      showToast("Failed to copy", "error");
    }
  });

  // Load staking data
  async function loadStakingData() {
    // First, load global stats using read-only provider (no wallet needed)
    try {
      const readProvider = new ethers.JsonRpcProvider("https://lb.drpc.live/ethereum/AsVs23QoLEOwisC7Py3FTOoL9ez-0OkR8K7sOmy9-kY5");
      const stakingReadOnly = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, readProvider);
      const oldStakingReadOnly = new ethers.Contract(OLD_STAKING_CONTRACT_ADDRESS, ["function totalStaked() view returns (uint256)"], readProvider);
      const v1StakingReadOnly = new ethers.Contract(V1_STAKING_CONTRACT_ADDRESS, ["function totalStaked() view returns (uint256)"], readProvider);
      
      const [v2Total, oldTotal, v1Total, tokensBurned] = await Promise.all([
        stakingReadOnly.totalStaked(),
        oldStakingReadOnly.totalStaked(),
        v1StakingReadOnly.totalStaked(),
        stakingReadOnly.totalTokensBurned(),
      ]);
      
      // Combine all contract totals
      const combinedTotal = v2Total + oldTotal + v1Total;
      
      const totalPoolEl = document.getElementById("statTotalPool");
      if (totalPoolEl) animateNumber(totalPoolEl, Number(ethers.formatEther(combinedTotal)), "STORY");
      
      const tokensBurnedEl = document.getElementById("statTokensBurned");
      if (tokensBurnedEl) tokensBurnedEl.textContent = `${Number(ethers.formatEther(tokensBurned)).toLocaleString()} STORY`;
    } catch (e) {
      console.error("Error loading global stats:", e);
      // Fallback: show 0 instead of skeleton
      const totalPoolEl = document.getElementById("statTotalPool");
      if (totalPoolEl) totalPoolEl.textContent = "0 STORY";
    }
    
    // Then load user-specific data (requires wallet)
    try {
      const wallet = await ensureWallet();
      const address = await wallet.getAddress();
      
      const token = new ethers.Contract(CONTRACT_ADDRESS, ["function balanceOf(address) view returns (uint256)"], wallet);
      const staking = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, wallet);
      
      // Check old contracts for migration notice
      try {
        const oldAbi = [
          "function userTotalStaked(address) view returns (uint256)",
          "function stakeCount(address) view returns (uint256)",
          "function stakes(address, uint256) view returns (uint256 amount, uint256 lockPeriod, uint256 startTime, uint256 endTime, uint256 multiplier, uint256 lastClaimTime, bool active)",
          "function unstake(uint256 stakeId) external",
        ];
        const oldStaking = new ethers.Contract(OLD_STAKING_CONTRACT_ADDRESS, oldAbi, wallet);
        const v1Staking = new ethers.Contract(V1_STAKING_CONTRACT_ADDRESS, oldAbi, wallet);
        
        const [oldStaked, v1Staked] = await Promise.all([
          oldStaking.userTotalStaked(address),
          v1Staking.userTotalStaked(address),
        ]);
        
        const totalOldStaked = oldStaked + v1Staked;
        const migrationNotice = document.getElementById("migrationNotice");
        const oldStakeAmountEl = document.getElementById("oldStakeAmount");
        const oldStakesList = document.getElementById("oldStakesList");
        
        if (totalOldStaked > 0n && migrationNotice && oldStakeAmountEl) {
          migrationNotice.classList.remove("hidden");
          oldStakeAmountEl.textContent = Number(ethers.formatEther(totalOldStaked)).toLocaleString();
          
          // Load old stakes list
          if (oldStakesList) {
            let html = "";
            
            // Check V0 stakes
            if (oldStaked > 0n) {
              const count = await oldStaking.stakeCount(address);
              for (let i = 0; i < Number(count); i++) {
                try {
                  const stake = await oldStaking.stakes(address, i);
                  if (stake.active) {
                    const amount = Number(ethers.formatEther(stake.amount)).toLocaleString();
                    html += `
                      <div class="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <div>
                          <span class="text-md-body-sm font-medium text-md-on-surface">${amount} STORY</span>
                          <span class="text-md-label-sm text-md-on-surface-variant ml-2">(V0)</span>
                        </div>
                        <button class="btn-unstake-old btn-tonal text-xs px-3 py-1" data-contract="v0" data-stake-id="${i}">Withdraw</button>
                      </div>
                    `;
                  }
                } catch { /* skip */ }
              }
            }
            
            // Check V1 stakes
            if (v1Staked > 0n) {
              const count = await v1Staking.stakeCount(address);
              for (let i = 0; i < Number(count); i++) {
                try {
                  const stake = await v1Staking.stakes(address, i);
                  if (stake.active) {
                    const amount = Number(ethers.formatEther(stake.amount)).toLocaleString();
                    html += `
                      <div class="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <div>
                          <span class="text-md-body-sm font-medium text-md-on-surface">${amount} STORY</span>
                          <span class="text-md-label-sm text-md-on-surface-variant ml-2">(V1)</span>
                        </div>
                        <button class="btn-unstake-old btn-tonal text-xs px-3 py-1" data-contract="v1" data-stake-id="${i}">Withdraw</button>
                      </div>
                    `;
                  }
                } catch { /* skip */ }
              }
            }
            
            oldStakesList.innerHTML = html || `<p class="text-center py-2 text-md-on-surface-variant text-sm">No active stakes found</p>`;
            
            // Add click handlers for individual withdraw buttons
            oldStakesList.querySelectorAll(".btn-unstake-old").forEach(btn => {
              btn.addEventListener("click", async () => {
                const button = btn as HTMLButtonElement;
                const contractType = button.dataset.contract;
                const stakeId = parseInt(button.dataset.stakeId || "0");
                const contract = contractType === "v0" ? oldStaking : v1Staking;
                
                button.disabled = true;
                button.textContent = "...";
                
                try {
                  const tx = await contract.unstake(stakeId);
                  await tx.wait();
                  showToast("Withdrawn successfully! Now re-stake for 1.5x bonus!", "success", tx.hash);
                  loadStakingData();
                } catch (e) {
                  console.error(e);
                  showToast(parseErrorMessage(e), "error");
                  button.disabled = false;
                  button.textContent = "Withdraw";
                }
              });
            });
          }
        } else if (migrationNotice) {
          migrationNotice.classList.add("hidden");
        }
      } catch (e) { 
        console.error("Error loading old stakes:", e);
      }
      
      // Get user-specific data
      const [tokenBalance, myStaked, myPoints, pendingPoints, activeStakes, vipInfo, referralInfo] = await Promise.all([
        token.balanceOf(address),
        staking.userTotalStaked(address),
        staking.userPoints(address),
        staking.getTotalPendingPoints(address),
        staking.getUserActiveStakes(address),
        staking.getVIPLevel(address),
        staking.getReferralInfo(address),
      ]);
      
      // Update user stats
      const balanceEl = document.getElementById("stakeBalance");
      if (balanceEl) balanceEl.textContent = `Balance: ${Number(ethers.formatEther(tokenBalance)).toLocaleString()} STORY`;
      
      const myStakedEl = document.getElementById("statMyStaked");
      if (myStakedEl) animateNumber(myStakedEl, Number(ethers.formatEther(myStaked)), "STORY");
      
      const pointsEl = document.getElementById("statMyPoints");
      if (pointsEl) animateNumber(pointsEl, Number(ethers.formatEther(myPoints)), "Points");
      
      const pendingEl = document.getElementById("statPendingPoints");
      if (pendingEl) animateNumber(pendingEl, Number(ethers.formatEther(pendingPoints)), "Points");
      
      // Show claim all button if has pending
      const claimAllBtn = document.getElementById("btnClaimAll");
      if (claimAllBtn && pendingPoints > 0n) {
        claimAllBtn.classList.remove("hidden");
      }
      
      // Update VIP Level display
      const vipLevel = Number(vipInfo[0]);
      const vipBonus = Number(vipInfo[1]) / 100;
      const vipNames = ["Bronze", "Silver", "Gold", "Diamond"];
      const vipColors = ["bg-gray-500/20 text-gray-600", "bg-gray-400/20 text-gray-500", "bg-amber-500/20 text-amber-600", "bg-cyan-400/20 text-cyan-500"];
      const vipBadge = document.getElementById("vipBadge");
      const vipBonusEl = document.getElementById("vipBonus");
      const vipNextEl = document.getElementById("vipNextLevel");
      if (vipBadge) {
        vipBadge.textContent = vipNames[vipLevel] || "Bronze";
        vipBadge.className = `px-2 py-0.5 rounded-full text-xs font-medium ${vipColors[vipLevel] || vipColors[0]}`;
      }
      if (vipBonusEl) vipBonusEl.textContent = `+${vipBonus.toFixed(1)}x Bonus`;
      if (vipNextEl) {
        const nextLevelInfo = [
          "Stake 10,000 STORY for Silver",
          "Stake 50,000 STORY for Gold",
          "Stake 100,000 STORY for Diamond",
          "Maximum level reached!",
        ];
        vipNextEl.textContent = nextLevelInfo[vipLevel] || nextLevelInfo[3];
      }
      
      // Update Referral Info display
      const [myReferrer, myCode, earnedFromReferrals] = referralInfo;
      const referralEarnedEl = document.getElementById("referralEarned");
      const myReferrerEl = document.getElementById("myReferrer");
      const myReferralCodeEl = document.getElementById("myReferralCode");
      const btnCopyReferral = document.getElementById("btnCopyReferral");
      const registerCodeSection = document.getElementById("registerCodeSection");
      
      if (referralEarnedEl) referralEarnedEl.textContent = `${Number(ethers.formatEther(earnedFromReferrals)).toFixed(2)} Points`;
      if (myReferrerEl) myReferrerEl.textContent = myReferrer === "0x0000000000000000000000000000000000000000" ? "None" : `${myReferrer.slice(0, 6)}...${myReferrer.slice(-4)}`;
      
      if (myCode && myCode.length > 0) {
        if (myReferralCodeEl) myReferralCodeEl.textContent = myCode;
        if (btnCopyReferral) btnCopyReferral.classList.remove("hidden");
        if (registerCodeSection) registerCodeSection.classList.add("hidden");
        
        // Load referrals list
        loadReferralsList(address, staking);
      } else {
        if (myReferralCodeEl) myReferralCodeEl.textContent = "Not registered";
        if (btnCopyReferral) btnCopyReferral.classList.add("hidden");
        if (registerCodeSection) registerCodeSection.classList.remove("hidden");
        
        // Hide referrals section if no code
        const myReferralsSection = document.getElementById("myReferralsSection");
        if (myReferralsSection) myReferralsSection.classList.add("hidden");
      }
      
      // Render stakes list
      const listEl = document.getElementById("stakesList");
      if (!listEl) return;
      
      const [ids, amounts, endTimes, multipliers, stakePendingPoints] = activeStakes;
      
      if (ids.length === 0) {
        listEl.innerHTML = `
          <div class="text-center py-8 text-md-on-surface-variant">
            <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"/></svg>
            <p>No active stakes. Start staking above!</p>
          </div>
        `;
        return;
      }
      
      let html = "";
      for (let i = 0; i < ids.length; i++) {
        const stakeId = Number(ids[i]);
        const amount = Number(ethers.formatEther(amounts[i]));
        const endTime = Number(endTimes[i]);
        const effectiveMult = Number(multipliers[i]) / 100; // Effective multiplier from contract
        const pending = Number(ethers.formatEther(stakePendingPoints[i]));
        
        const now = Math.floor(Date.now() / 1000);
        const isExpired = now >= endTime;
        const isFlexible = effectiveMult < 1.1; // Flexible stake has base ~1.0x
        const daysLeft = isExpired ? 0 : Math.ceil((endTime - now) / 86400);
        const endDate = new Date(endTime * 1000).toLocaleDateString();
        
        // Get penalties (points and tokens)
        let pointsPenalty = 0;
        let tokenPenalty = 0;
        if (!isFlexible && !isExpired) {
          try {
            const penalties = await staking.getPenalties(address, stakeId);
            pointsPenalty = Number(penalties[0]);
            tokenPenalty = Number(penalties[1]);
          } catch { /* ignore */ }
        }
        
        html += `
          <div class="rounded-xl border border-md-outline/20 bg-md-surface-container-low p-4">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-md-title-md font-medium text-md-on-surface">${amount.toLocaleString()} STORY</span>
                  <span class="px-2 py-0.5 rounded-full bg-md-primary/10 text-md-primary text-xs font-medium">${effectiveMult.toFixed(1)}x</span>
                </div>
                <div class="text-md-label-sm text-md-on-surface-variant">
                  ${isFlexible ? "Flexible (no lock)" : isExpired ? `Ended ${endDate}` : `Ends ${endDate} (${daysLeft} days left)`}
                </div>
                <div class="mt-2 flex flex-wrap items-center gap-4 text-md-label-sm">
                  <span class="text-md-tertiary">Pending: ${pending.toFixed(2)} pts</span>
                  ${!isFlexible && !isExpired ? `<span class="text-md-error">Points -${pointsPenalty}%</span>` : ""}
                  ${!isFlexible && !isExpired && tokenPenalty > 0 ? `<span class="text-red-500">Tokens -${tokenPenalty}%</span>` : ""}
                  ${isExpired || isFlexible ? `<span class="text-green-600">No penalty</span>` : ""}
                </div>
              </div>
              <div class="flex gap-2">
                <button class="btn-claim-stake btn-tonal text-sm" data-stake-id="${stakeId}">Claim</button>
                <button class="btn-unstake-stake btn-outlined text-sm" data-stake-id="${stakeId}" data-points-penalty="${pointsPenalty}" data-token-penalty="${tokenPenalty}" data-pending="${pending.toFixed(2)}">Unstake</button>
              </div>
            </div>
          </div>
        `;
      }
      
      listEl.innerHTML = html;
      
      // Add event listeners to buttons
      listEl.querySelectorAll(".btn-claim-stake").forEach(btn => {
        btn.addEventListener("click", async () => {
          const button = btn as HTMLButtonElement;
          const stakeId = parseInt(button.dataset.stakeId || "0");
          const originalText = button.textContent;
          button.disabled = true;
          button.innerHTML = `<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
          try {
            const wallet = await ensureWallet();
            const staking = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, wallet);
            const tx = await staking.claimPoints(stakeId);
            await tx.wait();
            showToast("Points claimed!", "success", tx.hash);
            loadStakingData();
          } catch (e) {
            console.error(e);
            showToast(parseErrorMessage(e), "error");
            button.disabled = false;
            button.textContent = originalText;
          }
        });
      });
      
      listEl.querySelectorAll(".btn-unstake-stake").forEach(btn => {
        btn.addEventListener("click", async () => {
          const button = btn as HTMLButtonElement;
          const stakeId = parseInt(button.dataset.stakeId || "0");
          const pointsPenalty = parseInt(button.dataset.pointsPenalty || "0");
          const tokenPenalty = parseInt(button.dataset.tokenPenalty || "0");
          const pendingText = button.dataset.pending || "0";
          
          // If there's penalty, show confirmation popup
          if (pointsPenalty > 0 || tokenPenalty > 0) {
            const pendingPts = parseFloat(pendingText);
            const lostPts = (pendingPts * pointsPenalty / 100).toFixed(2);
            const keepPts = (pendingPts * (100 - pointsPenalty) / 100).toFixed(2);
            
            let warningMsg = `⚠️ Early Withdrawal Warning\n\n` +
              `You are withdrawing before the lock period ends.\n\n`;
            
            if (pointsPenalty > 0) {
              warningMsg += `Points Penalty: ${pointsPenalty}%\n` +
                `Points you will lose: ~${lostPts}\n` +
                `Points you will keep: ~${keepPts}\n\n`;
            }
            
            if (tokenPenalty > 0) {
              warningMsg += `Token Penalty: ${tokenPenalty}% of staked tokens will be BURNED\n\n`;
            }
            
            warningMsg += `Are you sure you want to continue?`;
            
            const confirmed = confirm(warningMsg);
            
            if (!confirmed) return;
          }
          
          const originalText = button.textContent;
          button.disabled = true;
          button.innerHTML = `<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
          try {
            const wallet = await ensureWallet();
            const staking = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, wallet);
            const tx = await staking.unstake(stakeId);
            await tx.wait();
            showToast("Unstaked successfully!", "success", tx.hash);
            loadStakingData();
          } catch (e) {
            console.error(e);
            showToast(parseErrorMessage(e), "error");
            button.disabled = false;
            button.textContent = originalText;
          }
        });
      });

    } catch (e) {
      console.log("Not connected or error loading data");
    }
  }
  
  // Load referrals list from ReferralReward events
  async function loadReferralsList(userAddress: string, staking: ethers.Contract) {
    const myReferralsSection = document.getElementById("myReferralsSection");
    const referralsList = document.getElementById("referralsList");
    const referralCountEl = document.getElementById("referralCount");
    
    if (!myReferralsSection || !referralsList) return;
    
    // Always show section if user has a referral code
    myReferralsSection.classList.remove("hidden");
    
    try {
      // Query ReferralReward events where this user is the referrer
      const filter = staking.filters.ReferralReward(userAddress);
      const events = await staking.queryFilter(filter, -100000); // Last ~100k blocks
      
      if (events.length === 0) {
        if (referralCountEl) referralCountEl.textContent = "0 users";
        referralsList.innerHTML = `<p class="text-md-body-sm text-md-on-surface-variant text-center py-4">No referrals yet. Share your link to invite friends!</p>`;
        return;
      }
      
      if (referralCountEl) referralCountEl.textContent = `${events.length} users`;
      
      // Group by referee to get total points per user
      const refereeMap = new Map<string, bigint>();
      for (const event of events) {
        const args = (event as ethers.EventLog).args;
        const referee = args[1] as string;
        const points = args[2] as bigint;
        refereeMap.set(referee, (refereeMap.get(referee) || 0n) + points);
      }
      
      // Render list
      let html = "";
      for (const [referee, points] of refereeMap) {
        const shortAddr = `${referee.slice(0, 6)}...${referee.slice(-4)}`;
        const pointsNum = Number(ethers.formatEther(points)).toFixed(2);
        html += `
          <div class="flex items-center justify-between py-2 px-3 rounded-lg bg-md-surface-container-low">
            <a href="https://etherscan.io/address/${referee}" target="_blank" rel="noopener noreferrer" 
              class="text-md-body-sm text-md-primary hover:underline font-mono">${shortAddr}</a>
            <span class="text-md-label-sm text-purple-600">+${pointsNum} pts</span>
          </div>
        `;
      }
      
      referralsList.innerHTML = html;
    } catch (e) {
      console.error("Error loading referrals:", e);
      if (referralCountEl) referralCountEl.textContent = "0 users";
      referralsList.innerHTML = `<p class="text-md-body-sm text-md-on-surface-variant text-center py-4">No referrals yet. Share your link to invite friends!</p>`;
    }
  }
  
  // Load leaderboards
  async function loadLeaderboards() {
    const stakingLeaderboard = document.getElementById("stakingLeaderboard");
    const pointsLeaderboard = document.getElementById("pointsLeaderboard");
    
    if (!stakingLeaderboard || !pointsLeaderboard) return;
    
    try {
      const readProvider = new ethers.JsonRpcProvider("https://lb.drpc.live/ethereum/AsVs23QoLEOwisC7Py3FTOoL9ez-0OkR8K7sOmy9-kY5");
      const staking = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, readProvider);
      
      // Query Staked events to get all unique stakers
      const filter = staking.filters.Staked();
      const events = await staking.queryFilter(filter, -200000); // Last ~200k blocks
      
      // Get unique addresses
      const uniqueAddresses = new Set<string>();
      for (const event of events) {
        const args = (event as ethers.EventLog).args;
        uniqueAddresses.add(args[0] as string);
      }
      
      if (uniqueAddresses.size === 0) {
        stakingLeaderboard.innerHTML = `<p class="text-center py-4 text-md-on-surface-variant text-sm">No stakers yet</p>`;
        pointsLeaderboard.innerHTML = `<p class="text-center py-4 text-md-on-surface-variant text-sm">No points yet</p>`;
        return;
      }
      
      // Fetch staking and points data for each address
      const userData: { address: string; staked: bigint; points: bigint }[] = [];
      const addresses = Array.from(uniqueAddresses).slice(0, 50); // Limit to 50 addresses
      
      for (const addr of addresses) {
        try {
          const [staked, points] = await Promise.all([
            staking.userTotalStaked(addr),
            staking.userPoints(addr),
          ]);
          userData.push({ address: addr, staked, points });
        } catch { /* skip failed queries */ }
      }
      
      // Sort by staked amount (descending) and render top 10
      const topStakers = [...userData].sort((a, b) => Number(b.staked - a.staked)).slice(0, 10);
      if (topStakers.length > 0 && topStakers[0].staked > 0n) {
        let stakingHtml = "";
        topStakers.forEach((user, idx) => {
          if (user.staked === 0n) return;
          const shortAddr = `${user.address.slice(0, 6)}...${user.address.slice(-4)}`;
          const amount = Number(ethers.formatEther(user.staked)).toLocaleString();
          const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
          stakingHtml += `
            <div class="flex items-center justify-between py-1.5">
              <div class="flex items-center gap-2">
                <span class="w-6 text-center">${medal}</span>
                <a href="https://etherscan.io/address/${user.address}" target="_blank" class="text-md-body-sm text-md-primary hover:underline font-mono">${shortAddr}</a>
              </div>
              <span class="text-md-label-sm text-md-on-surface">${amount}</span>
            </div>
          `;
        });
        stakingLeaderboard.innerHTML = stakingHtml || `<p class="text-center py-4 text-md-on-surface-variant text-sm">No stakers yet</p>`;
      } else {
        stakingLeaderboard.innerHTML = `<p class="text-center py-4 text-md-on-surface-variant text-sm">No stakers yet</p>`;
      }
      
      // Sort by points (descending) and render top 10
      const topPoints = [...userData].sort((a, b) => Number(b.points - a.points)).slice(0, 10);
      if (topPoints.length > 0 && topPoints[0].points > 0n) {
        let pointsHtml = "";
        topPoints.forEach((user, idx) => {
          if (user.points === 0n) return;
          const shortAddr = `${user.address.slice(0, 6)}...${user.address.slice(-4)}`;
          const pts = Number(ethers.formatEther(user.points)).toFixed(2);
          const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
          pointsHtml += `
            <div class="flex items-center justify-between py-1.5">
              <div class="flex items-center gap-2">
                <span class="w-6 text-center">${medal}</span>
                <a href="https://etherscan.io/address/${user.address}" target="_blank" class="text-md-body-sm text-md-primary hover:underline font-mono">${shortAddr}</a>
              </div>
              <span class="text-md-label-sm text-md-tertiary">${pts} pts</span>
            </div>
          `;
        });
        pointsLeaderboard.innerHTML = pointsHtml || `<p class="text-center py-4 text-md-on-surface-variant text-sm">No points yet</p>`;
      } else {
        pointsLeaderboard.innerHTML = `<p class="text-center py-4 text-md-on-surface-variant text-sm">No points yet</p>`;
      }
      
    } catch (e) {
      console.error("Error loading leaderboards:", e);
      stakingLeaderboard.innerHTML = `<p class="text-center py-4 text-md-on-surface-variant text-sm">Failed to load</p>`;
      pointsLeaderboard.innerHTML = `<p class="text-center py-4 text-md-on-surface-variant text-sm">Failed to load</p>`;
    }
  }

  // Copy contract address button
  document.getElementById("btnCopyContract")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(STAKING_CONTRACT_ADDRESS);
      showToast("Address copied!", "success");
    } catch {
      showToast("Copy failed", "error");
    }
  });

  // Initial load
  loadStakingData();
  loadLeaderboards();
  
  // Real-time points display update (per second)
  // Store last sync data for local calculation
  let lastSyncTime = Date.now();
  let lastPendingPoints = 0n;
  let stakesData: { amount: bigint; multiplier: number; lastClaimTime: number; endTime: number }[] = [];
  
  // Calculate points per second (local simulation)
  function calculatePointsPerSecond(): number {
    const BASE_RATE = 0.01; // 0.01 points per token per day
    let totalRate = 0;
    const now = Math.floor(Date.now() / 1000);
    
    for (const stake of stakesData) {
      if (now < stake.endTime) {
        const amount = Number(stake.amount) / 1e18;
        const multiplier = stake.multiplier / 100;
        // Points per second = amount * base rate * multiplier / 86400
        totalRate += (amount * BASE_RATE * multiplier) / 86400;
      }
    }
    return totalRate;
  }
  
  // Real-time update pending points display
  const realtimeInterval = setInterval(() => {
    if (getRoute() !== "stake") {
      clearInterval(realtimeInterval);
      return;
    }
    
    const pendingEl = document.getElementById("statPendingPoints");
    if (!pendingEl) return;
    
    const elapsed = (Date.now() - lastSyncTime) / 1000;
    const pointsPerSecond = calculatePointsPerSecond();
    const estimatedPending = Number(lastPendingPoints) / 1e18 + (pointsPerSecond * elapsed);
    
    // Update display with 6 decimals to show real-time changes
    pendingEl.textContent = estimatedPending.toFixed(6) + " Points";
  }, 100); // Update every 100ms for smooth animation
  
  // Auto refresh data (every 30 seconds) - sync contract data
  const refreshInterval = setInterval(async () => {
    if (getRoute() === "stake") {
      // Record time before sync
      lastSyncTime = Date.now();
      await loadStakingData();
      
      // Update local data for real-time calculation
      try {
        const wallet = await ensureWallet();
        const address = await wallet.getAddress();
        const staking = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, wallet);
        
        lastPendingPoints = await staking.getTotalPendingPoints(address);
        
        // Get all active stakes details
        const count = await staking.stakeCount(address);
        stakesData = [];
        for (let i = 0; i < count; i++) {
          const stake = await staking.stakes(address, i);
          if (stake.active) {
            stakesData.push({
              amount: stake.amount,
              multiplier: Number(stake.multiplier),
              lastClaimTime: Number(stake.lastClaimTime),
              endTime: Number(stake.endTime),
            });
          }
        }
      } catch { /* ignore */ }
    } else {
      // If left staking page, stop refreshing
      clearInterval(refreshInterval);
      clearInterval(realtimeInterval);
    }
  }, 30000);
  
  // Initial data sync
  (async () => {
    try {
      const wallet = await ensureWallet();
      const address = await wallet.getAddress();
      const staking = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, wallet);
      
      lastPendingPoints = await staking.getTotalPendingPoints(address);
      lastSyncTime = Date.now();
      
      const count = await staking.stakeCount(address);
      stakesData = [];
      for (let i = 0; i < count; i++) {
        const stake = await staking.stakes(address, i);
        if (stake.active) {
          stakesData.push({
            amount: stake.amount,
            multiplier: Number(stake.multiplier),
            lastClaimTime: Number(stake.lastClaimTime),
            endTime: Number(stake.endTime),
          });
        }
      }
    } catch { /* ignore */ }
  })();
}

// ============ REMITTANCE PAGE ============

async function renderRemitPage(): Promise<void> {
  const app = el("app");
  app.innerHTML = `
    ${renderGlobalNav()}
    <div class="min-h-screen bg-md-surface">
      <main class="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <!-- Header -->
        <header class="mb-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl overflow-hidden shadow-sm">
              <img src="/remit-logo.png" alt="Remittance" class="w-full h-full object-cover" />
            </div>
            <div>
              <h1 class="text-md-headline-md font-medium text-md-on-surface">Remittance</h1>
              <p class="text-md-body-md text-md-on-surface-variant">Exchange tokens and earn REMIT</p>
            </div>
          </div>
        </header>

        <div class="grid gap-6 lg:grid-cols-3">
          <!-- Left Column: Stats + Action Form -->
          <div class="lg:col-span-2 space-y-6">
            
            <!-- Progress Stats -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div class="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4 border border-amber-500/20">
                <p class="text-md-label-sm text-md-on-surface-variant mb-1">Total Operations</p>
                <p id="statTotalOps" class="text-md-title-lg font-medium text-amber-600"><span class="skeleton w-16">&nbsp;&nbsp;&nbsp;</span></p>
              </div>
              <div class="rounded-xl bg-md-surface-container p-4">
                <p class="text-md-label-sm text-md-on-surface-variant mb-1">Remaining</p>
                <p id="statRemainingOps" class="text-md-title-lg font-medium text-md-on-surface"><span class="skeleton w-16">&nbsp;&nbsp;&nbsp;</span></p>
              </div>
              <div class="rounded-xl bg-md-surface-container p-4">
                <p class="text-md-label-sm text-md-on-surface-variant mb-1">REMIT Minted</p>
                <p id="statRemitMinted" class="text-md-title-lg font-medium text-md-tertiary"><span class="skeleton w-20">&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
              </div>
              <div class="rounded-xl bg-md-surface-container p-4">
                <p class="text-md-label-sm text-md-on-surface-variant mb-1">My Operations</p>
                <p id="statMyOps" class="text-md-title-lg font-medium text-green-600"><span class="skeleton w-12">&nbsp;&nbsp;</span></p>
              </div>
            </div>

            <!-- Exchange Form -->
            <div class="rounded-2xl bg-md-surface-container p-6 shadow-md-1">
              <h2 class="text-md-title-lg font-medium text-md-on-surface mb-4">Exchange Tokens</h2>
              
              <!-- You Send -->
              <div class="mb-4 p-4 rounded-xl bg-md-surface-container-low">
                <p class="text-md-label-sm text-md-on-surface-variant mb-2">You Send</p>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">$</div>
                    <div>
                      <p class="text-md-title-lg font-medium text-md-on-surface">10 USDC</p>
                      <p id="usdcBalance" class="text-md-label-sm text-md-on-surface-variant">Balance: --</p>
                    </div>
                  </div>
                  <span class="text-md-label-lg text-md-on-surface-variant">+</span>
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full overflow-hidden bg-white shadow-sm">
                      <img src="/story-logo.png" alt="STORY" class="w-full h-full object-contain" />
                    </div>
                    <div>
                      <p class="text-md-title-lg font-medium text-md-on-surface">5 STORY</p>
                      <p id="storyBalance" class="text-md-label-sm text-md-on-surface-variant">Balance: --</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Arrow -->
              <div class="flex justify-center my-2">
                <div class="w-10 h-10 rounded-full bg-md-primary/10 flex items-center justify-center">
                  <svg class="w-5 h-5 text-md-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"/>
                  </svg>
                </div>
              </div>

              <!-- You Receive -->
              <div class="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-amber-500/10 border border-green-500/20">
                <p class="text-md-label-sm text-md-on-surface-variant mb-2">You Receive</p>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">$</div>
                    <div>
                      <p class="text-md-title-lg font-medium text-green-600">9 USDC</p>
                    </div>
                  </div>
                  <span class="text-md-label-lg text-md-on-surface-variant">+</span>
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">R</div>
                    <div>
                      <p class="text-md-title-lg font-medium text-amber-600">10 REMIT</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Eligibility Status -->
              <div id="eligibilityStatus" class="mb-4 p-3 rounded-lg bg-md-surface-container-low text-center">
                <p class="text-md-label-md text-md-on-surface-variant">Connect wallet to check eligibility</p>
              </div>

              <!-- Action Buttons -->
              <!-- Minting Completed Notice -->
              <div class="rounded-xl bg-blue-500/10 border border-blue-500/30 p-4 text-center">
                <div class="flex items-center justify-center gap-2 text-blue-400 mb-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
                  <span class="font-medium">Minting Completed</span>
                </div>
                <p class="text-md-body-sm text-md-on-surface-variant">This project has reached its minting goal. Thank you for participating!</p>
              </div>
              <div class="flex gap-3 mt-4">
                <button id="btnApproveUsdc" class="flex-1 btn-outlined hidden">
                  Approve USDC
                </button>
                <button id="btnApproveStory" class="flex-1 btn-outlined hidden">
                  Approve STORY
                </button>
                <button id="btnRemit" class="flex-1 btn-filled opacity-50 cursor-not-allowed" disabled>
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                  </svg>
                  Completed
                </button>
              </div>
              <p id="remitResult" class="mt-3 text-md-label-md text-md-on-surface-variant text-center"></p>
            </div>
          </div>

          <!-- Right Column: Info -->
          <div class="space-y-6">
            <!-- How it Works -->
            <div class="rounded-2xl bg-md-surface-container p-6 shadow-md-1">
              <h3 class="text-md-title-lg font-medium text-md-on-surface mb-4">How it Works</h3>
              <ol class="space-y-3 text-md-body-sm text-md-on-surface-variant">
                <li class="flex items-start gap-3">
                  <span class="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-medium shrink-0">1</span>
                  <span>Send 10 USDC + 5 STORY</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-medium shrink-0">2</span>
                  <span>5 STORY will be burned forever</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-medium shrink-0">3</span>
                  <span>Receive 9 USDC + 10 REMIT</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-medium shrink-0">4</span>
                  <span>Max 100 times per wallet</span>
                </li>
              </ol>
            </div>

            <!-- Token Info -->
            <div class="rounded-2xl bg-md-surface-container p-6 shadow-md-1">
              <h3 class="text-md-title-lg font-medium text-md-on-surface mb-4">REMIT Token</h3>
              <div class="space-y-3 text-md-body-sm">
                <div class="flex justify-between">
                  <span class="text-md-on-surface-variant">Total Supply</span>
                  <span class="text-md-on-surface font-medium">1,000,000 REMIT</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-md-on-surface-variant">Mintable</span>
                  <span class="text-md-on-surface font-medium">800,000 REMIT</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-md-on-surface-variant">LP Reserve</span>
                  <span class="text-md-on-surface font-medium">200,000 REMIT</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-md-on-surface-variant">Transfer Tax</span>
                  <span class="text-amber-600 font-medium">1%</span>
                </div>
              </div>
            </div>

            <!-- Contract Info -->
            <div class="rounded-2xl bg-md-surface-container p-6 shadow-md-1">
              <h3 class="text-md-title-lg font-medium text-md-on-surface mb-4">Contracts</h3>
              <div class="space-y-3 text-md-body-sm">
                <div>
                  <p class="text-md-on-surface-variant mb-1">REMIT Token</p>
                  <a href="https://etherscan.io/address/${REMIT_TOKEN_ADDRESS}" target="_blank" class="text-md-primary hover:underline break-all text-xs">${REMIT_TOKEN_ADDRESS}</a>
                </div>
                <div>
                  <p class="text-md-on-surface-variant mb-1">Remittance</p>
                  <a href="https://etherscan.io/address/${REMITTANCE_CONTRACT_ADDRESS}" target="_blank" class="text-md-primary hover:underline break-all text-xs">${REMITTANCE_CONTRACT_ADDRESS}</a>
                </div>
              </div>
            </div>

            <!-- Agent Info -->
            <div class="rounded-2xl bg-md-surface-container p-6 shadow-md-1">
              <h3 class="text-md-title-lg font-medium text-md-on-surface mb-4">ERC-8004 Agent</h3>
              <p class="text-md-body-sm text-md-on-surface-variant mb-4">This project is powered by an AI agent registered on 8004scan.</p>
              <div class="flex flex-col gap-3">
                <a href="${LINKS.remitAgent}" target="_blank" class="inline-flex items-center gap-2 text-md-primary hover:underline text-md-label-md">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/></svg>
                  Agent #22721 on 8004scan
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
                </a>
                <a href="${LINKS.remitTwitter}" target="_blank" class="inline-flex items-center gap-2 text-md-on-surface-variant hover:text-md-primary text-md-label-md transition-colors">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  @Remittance_8004
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
    ${renderFooter("remit")}
  `;
  
  // Setup global navigation bar events
  setupGlobalNavListeners();
  
  setupRemitPageListeners();
  loadRemitData();
}

async function loadRemitData(): Promise<void> {
  // Load public stats from backend
  try {
    const res = await fetch(`${API_BASE}/remittance/status`);
    const data = await res.json();
    
    const totalOpsEl = document.getElementById("statTotalOps");
    const remainingOpsEl = document.getElementById("statRemainingOps");
    const mintedEl = document.getElementById("statRemitMinted");
    
    if (totalOpsEl) animateNumber(totalOpsEl, data.totalOperations);
    if (remainingOpsEl) animateNumber(remainingOpsEl, data.remainingOperations);
    if (mintedEl) mintedEl.textContent = data.remitMinted;
  } catch (e) {
    console.error("Failed to load remittance status", e);
  }
  
  // Load user-specific data if wallet connected
  if (signer) {
    try {
      const address = await signer.getAddress();
      
      // Get balances
      const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
      const story = new ethers.Contract(STORY_TOKEN_ADDRESS, ERC20_ABI, signer);
      const remittance = new ethers.Contract(REMITTANCE_CONTRACT_ADDRESS, REMITTANCE_ABI, signer);
      
      const [usdcBal, storyBal, userOps, canRemitResult] = await Promise.all([
        usdc.balanceOf(address),
        story.balanceOf(address),
        remittance.userOperationCount(address),
        remittance.canRemit(address),
      ]);
      
      const usdcBalEl = document.getElementById("usdcBalance");
      const storyBalEl = document.getElementById("storyBalance");
      const myOpsEl = document.getElementById("statMyOps");
      const eligEl = document.getElementById("eligibilityStatus");
      
      if (usdcBalEl) usdcBalEl.textContent = `Balance: ${(Number(usdcBal) / 10**6).toFixed(2)} USDC`;
      if (storyBalEl) storyBalEl.textContent = `Balance: ${(Number(storyBal) / 10**18).toFixed(2)} STORY`;
      if (myOpsEl) myOpsEl.textContent = `${userOps}/100`;
      
      const [canDo, reason] = canRemitResult;
      if (eligEl) {
        if (canDo) {
          eligEl.innerHTML = `<p class="text-green-600 font-medium">✓ You can perform this exchange</p>`;
        } else {
          eligEl.innerHTML = `<p class="text-red-500">${reason}</p>`;
        }
      }
      
      // Check allowances
      const usdcAllowance = await usdc.allowance(address, REMITTANCE_CONTRACT_ADDRESS);
      const storyAllowance = await story.allowance(address, REMITTANCE_CONTRACT_ADDRESS);
      
      const btnApproveUsdc = document.getElementById("btnApproveUsdc");
      const btnApproveStory = document.getElementById("btnApproveStory");
      const btnRemit = document.getElementById("btnRemit");
      
      const usdcRequired = BigInt("10000000"); // 10 USDC
      const storyRequired = BigInt("5000000000000000000"); // 5 STORY
      
      if (usdcAllowance < usdcRequired) {
        btnApproveUsdc?.classList.remove("hidden");
      } else {
        btnApproveUsdc?.classList.add("hidden");
      }
      
      if (storyAllowance < storyRequired) {
        btnApproveStory?.classList.remove("hidden");
      } else {
        btnApproveStory?.classList.add("hidden");
      }
      
      // Enable/disable remit button
      if (btnRemit) {
        if (canDo && usdcAllowance >= usdcRequired && storyAllowance >= storyRequired) {
          btnRemit.removeAttribute("disabled");
          btnRemit.classList.remove("opacity-50", "cursor-not-allowed");
        } else {
          btnRemit.setAttribute("disabled", "true");
          btnRemit.classList.add("opacity-50", "cursor-not-allowed");
        }
      }
    } catch (e) {
      console.error("Failed to load user remittance data", e);
    }
  }
}

function setupRemitPageListeners(): void {
  const btnApproveUsdc = document.getElementById("btnApproveUsdc");
  const btnApproveStory = document.getElementById("btnApproveStory");
  const btnRemit = document.getElementById("btnRemit");
  const resultEl = document.getElementById("remitResult");
  
  btnApproveUsdc?.addEventListener("click", async () => {
    try {
      const s = await ensureWallet();
      btnApproveUsdc.innerHTML = `<span class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></span>Approving...`;
      
      const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, s);
      const tx = await usdc.approve(REMITTANCE_CONTRACT_ADDRESS, ethers.MaxUint256);
      await tx.wait();
      
      showToast("USDC approved successfully!", "success", tx.hash);
      btnApproveUsdc.classList.add("hidden");
      loadRemitData();
    } catch (e: unknown) {
      const msg = parseErrorMessage(e);
      if (resultEl) resultEl.innerHTML = `<span class="text-red-500">${msg}</span>`;
    } finally {
      btnApproveUsdc.textContent = "Approve USDC";
    }
  });
  
  btnApproveStory?.addEventListener("click", async () => {
    try {
      const s = await ensureWallet();
      btnApproveStory.innerHTML = `<span class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></span>Approving...`;
      
      const story = new ethers.Contract(STORY_TOKEN_ADDRESS, ERC20_ABI, s);
      const tx = await story.approve(REMITTANCE_CONTRACT_ADDRESS, ethers.MaxUint256);
      await tx.wait();
      
      showToast("STORY approved successfully!", "success", tx.hash);
      btnApproveStory.classList.add("hidden");
      loadRemitData();
    } catch (e: unknown) {
      const msg = parseErrorMessage(e);
      if (resultEl) resultEl.innerHTML = `<span class="text-red-500">${msg}</span>`;
    } finally {
      btnApproveStory.textContent = "Approve STORY";
    }
  });
  
  btnRemit?.addEventListener("click", async () => {
    try {
      const s = await ensureWallet();
      btnRemit.innerHTML = `<span class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></span>Processing...`;
      
      const remittance = new ethers.Contract(REMITTANCE_CONTRACT_ADDRESS, REMITTANCE_ABI, s);
      const tx = await remittance.remit();
      await tx.wait();
      
      showToast("Exchange successful! You received 9 USDC + 10 REMIT", "success", tx.hash);
      loadRemitData();
    } catch (e: unknown) {
      const msg = parseErrorMessage(e);
      if (resultEl) resultEl.innerHTML = `<span class="text-red-500">${msg}</span>`;
    } finally {
      btnRemit.innerHTML = `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>Exchange`;
    }
  });
}

function renderRemit(): void {
  // Render project page directly, no password needed
  renderRemitPage();
}

// ==================== MoltBot Page ====================

function renderBot(): void {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    ${renderGlobalNav()}
    
    <main class="mx-auto max-w-4xl px-4 py-12">
      <!-- Hero Section -->
      <div class="text-center mb-16">
        <div class="mb-6">
          <img src="/moltbot-logo.png" alt="MoltBot" class="w-32 h-32 mx-auto rounded-2xl shadow-lg" />
        </div>
        
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 text-green-500 text-sm font-medium mb-6">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Live & Trading
        </div>
        
        <h1 class="text-4xl sm:text-5xl font-bold text-md-on-surface mb-4">
          MoltStory<span class="text-md-primary">Bot</span>
        </h1>
        
        <p class="text-xl text-md-on-surface-variant max-w-2xl mx-auto mb-8">
          Pure MoltBot-powered autonomous trading agent for STORY token.
          No manual intervention. No strategy configuration. Just AI.
        </p>
        
        <a href="https://t.me/MoltStoryBot" target="_blank" rel="noopener noreferrer" 
           class="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-medium text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          Open MoltStoryBot
        </a>
      </div>
      
      <!-- What is MoltBot Section -->
      <div class="mb-16">
        <h2 class="text-2xl font-bold text-md-on-surface mb-6 text-center">What is MoltBot?</h2>
        
        <div class="grid sm:grid-cols-2 gap-6">
          <div class="p-6 rounded-2xl bg-md-surface-container border border-md-outline/10">
            <div class="w-12 h-12 rounded-xl bg-md-primary/10 flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-md-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-md-on-surface mb-2">Pure AI Decision Making</h3>
            <p class="text-md-on-surface-variant">
              MoltBot analyzes market conditions in real-time and makes autonomous trading decisions. 
              No pre-programmed rules, no manual triggers - just pure AI intelligence.
            </p>
          </div>
          
          <div class="p-6 rounded-2xl bg-md-surface-container border border-md-outline/10">
            <div class="w-12 h-12 rounded-xl bg-md-tertiary/10 flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-md-tertiary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-md-on-surface mb-2">24/7 Market Monitoring</h3>
            <p class="text-md-on-surface-variant">
              The bot monitors STORY token markets around the clock, analyzing price movements, 
              volume, liquidity, and trading patterns every minute.
            </p>
          </div>
          
          <div class="p-6 rounded-2xl bg-md-surface-container border border-md-outline/10">
            <div class="w-12 h-12 rounded-xl bg-md-secondary/10 flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-md-secondary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-md-on-surface mb-2">Your Own Trading Wallet</h3>
            <p class="text-md-on-surface-variant">
              Each user gets a dedicated trading wallet. Deposit USDC + ETH for gas, 
              and MoltBot handles all the trading execution automatically.
            </p>
          </div>
          
          <div class="p-6 rounded-2xl bg-md-surface-container border border-md-outline/10">
            <div class="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-md-on-surface mb-2">Full Custody Control</h3>
            <p class="text-md-on-surface-variant">
              Export your private key anytime. Withdraw your funds whenever you want. 
              You always maintain full control over your assets.
            </p>
          </div>
        </div>
      </div>
      
      <!-- How It Works Section -->
      <div class="mb-16">
        <h2 class="text-2xl font-bold text-md-on-surface mb-6 text-center">How It Works</h2>
        
        <div class="relative">
          <!-- Timeline line -->
          <div class="absolute left-6 top-0 bottom-0 w-0.5 bg-md-outline/20 hidden sm:block"></div>
          
          <div class="space-y-8">
            <div class="flex gap-6">
              <div class="w-12 h-12 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center font-bold text-lg shrink-0 z-10">1</div>
              <div class="pt-2">
                <h3 class="text-lg font-semibold text-md-on-surface mb-1">Create Your Wallet</h3>
                <p class="text-md-on-surface-variant">Open the bot on Telegram and use <code class="px-2 py-0.5 rounded bg-md-surface-container text-md-primary">/create_wallet</code> to generate a new trading wallet.</p>
              </div>
            </div>
            
            <div class="flex gap-6">
              <div class="w-12 h-12 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center font-bold text-lg shrink-0 z-10">2</div>
              <div class="pt-2">
                <h3 class="text-lg font-semibold text-md-on-surface mb-1">Fund Your Wallet</h3>
                <p class="text-md-on-surface-variant">Send USDC (for buying STORY) and a small amount of ETH (for gas fees) to your wallet address.</p>
              </div>
            </div>
            
            <div class="flex gap-6">
              <div class="w-12 h-12 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center font-bold text-lg shrink-0 z-10">3</div>
              <div class="pt-2">
                <h3 class="text-lg font-semibold text-md-on-surface mb-1">Configure Risk Level</h3>
                <p class="text-md-on-surface-variant">Use <code class="px-2 py-0.5 rounded bg-md-surface-container text-md-primary">/config</code> to set your preferred risk level: Conservative, Moderate, or Aggressive.</p>
              </div>
            </div>
            
            <div class="flex gap-6">
              <div class="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-lg shrink-0 z-10">4</div>
              <div class="pt-2">
                <h3 class="text-lg font-semibold text-md-on-surface mb-1">Start Trading</h3>
                <p class="text-md-on-surface-variant">Use <code class="px-2 py-0.5 rounded bg-md-surface-container text-md-primary">/start_trading</code> and let MoltBot take over. It will analyze the market and execute trades autonomously.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Commands Section -->
      <div class="mb-16">
        <h2 class="text-2xl font-bold text-md-on-surface mb-6 text-center">Bot Commands</h2>
        
        <div class="overflow-hidden rounded-2xl border border-md-outline/10">
          <table class="w-full">
            <thead class="bg-md-surface-container">
              <tr>
                <th class="px-6 py-4 text-left text-md-label-lg text-md-on-surface">Command</th>
                <th class="px-6 py-4 text-left text-md-label-lg text-md-on-surface">Description</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-md-outline/10">
              <tr class="bg-md-surface hover:bg-md-surface-container/50 transition-colors">
                <td class="px-6 py-4"><code class="text-md-primary">/start</code></td>
                <td class="px-6 py-4 text-md-on-surface-variant">Welcome message & main menu</td>
              </tr>
              <tr class="bg-md-surface hover:bg-md-surface-container/50 transition-colors">
                <td class="px-6 py-4"><code class="text-md-primary">/create_wallet</code></td>
                <td class="px-6 py-4 text-md-on-surface-variant">Create your trading wallet</td>
              </tr>
              <tr class="bg-md-surface hover:bg-md-surface-container/50 transition-colors">
                <td class="px-6 py-4"><code class="text-md-primary">/balance</code></td>
                <td class="px-6 py-4 text-md-on-surface-variant">Check your portfolio balance</td>
              </tr>
              <tr class="bg-md-surface hover:bg-md-surface-container/50 transition-colors">
                <td class="px-6 py-4"><code class="text-md-primary">/price</code></td>
                <td class="px-6 py-4 text-md-on-surface-variant">Current STORY price & market data</td>
              </tr>
              <tr class="bg-md-surface hover:bg-md-surface-container/50 transition-colors">
                <td class="px-6 py-4"><code class="text-md-primary">/config</code></td>
                <td class="px-6 py-4 text-md-on-surface-variant">Configure your risk level</td>
              </tr>
              <tr class="bg-md-surface hover:bg-md-surface-container/50 transition-colors">
                <td class="px-6 py-4"><code class="text-md-primary">/start_trading</code></td>
                <td class="px-6 py-4 text-md-on-surface-variant">Enable AI auto-trading</td>
              </tr>
              <tr class="bg-md-surface hover:bg-md-surface-container/50 transition-colors">
                <td class="px-6 py-4"><code class="text-md-primary">/stop_trading</code></td>
                <td class="px-6 py-4 text-md-on-surface-variant">Disable auto-trading</td>
              </tr>
              <tr class="bg-md-surface hover:bg-md-surface-container/50 transition-colors">
                <td class="px-6 py-4"><code class="text-md-primary">/export_key</code></td>
                <td class="px-6 py-4 text-md-on-surface-variant">Export your private key</td>
              </tr>
              <tr class="bg-md-surface hover:bg-md-surface-container/50 transition-colors">
                <td class="px-6 py-4"><code class="text-md-primary">/withdraw</code></td>
                <td class="px-6 py-4 text-md-on-surface-variant">Withdraw funds to external wallet</td>
              </tr>
              <tr class="bg-md-surface hover:bg-md-surface-container/50 transition-colors">
                <td class="px-6 py-4"><code class="text-md-primary">/ask</code></td>
                <td class="px-6 py-4 text-md-on-surface-variant">Ask MoltBot anything about the market</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Disclaimer -->
      <div class="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30">
        <div class="flex items-start gap-3">
          <svg class="w-6 h-6 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
          </svg>
          <div>
            <h3 class="text-md-title-sm font-medium text-amber-600 mb-1">Risk Disclaimer</h3>
            <p class="text-md-body-sm text-md-on-surface-variant">
              Trading cryptocurrencies involves significant risk. MoltBot's AI makes autonomous decisions based on market analysis, 
              but past performance does not guarantee future results. Only invest what you can afford to lose. 
              Start with small amounts to test.
            </p>
          </div>
        </div>
      </div>
      
      <!-- CTA -->
      <div class="text-center mt-12">
        <a href="https://t.me/MoltStoryBot" target="_blank" rel="noopener noreferrer" 
           class="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-medium text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          Start Trading with MoltBot
        </a>
      </div>
    </main>
    
    ${renderFooter("bot")}
  `;

  // Setup global navigation bar events
  setupGlobalNavListeners();
}

window.addEventListener("popstate", () => route());

// Listen for wallet account and network changes
function setupWalletListeners(): void {
  const eth = (window as unknown as { ethereum?: { on: (event: string, handler: (...args: unknown[]) => void) => void } }).ethereum;
  if (!eth) return;
  
  // Account switch
  eth.on("accountsChanged", (accounts: unknown) => {
    const accs = accounts as string[];
    if (accs.length === 0) {
      // User disconnected wallet
      provider = null;
      signer = null;
    } else {
      // User switched account, reset signer
      signer = null;
    }
    manuallyDisconnected = false;
    updateGlobalWalletUI();
    route(); // Reload page data
  });
  
  // Network switch
  eth.on("chainChanged", () => {
    // Reset provider and signer after network switch
    provider = null;
    signer = null;
    manuallyDisconnected = false;
    updateGlobalWalletUI();
    route(); // Reload page data
  });
}

setupWalletListeners();

// Back to top button
function setupBackToTop(): void {
  // Create button
  const btn = document.createElement("button");
  btn.id = "backToTop";
  btn.className = "fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-md-primary text-md-on-primary shadow-lg flex items-center justify-center opacity-0 translate-y-4 pointer-events-none transition-all duration-300 hover:bg-md-primary/90 hover:scale-110";
  btn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5"/></svg>`;
  btn.setAttribute("aria-label", "Back to top");
  document.body.appendChild(btn);
  
  // Click to go back to top
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  
  // Scroll listener
  window.addEventListener("scroll", () => {
    const scrollY = window.scrollY;
    if (scrollY > 400) {
      btn.classList.remove("opacity-0", "translate-y-4", "pointer-events-none");
      btn.classList.add("opacity-100", "translate-y-0", "pointer-events-auto");
    } else {
      btn.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
      btn.classList.remove("opacity-100", "translate-y-0", "pointer-events-auto");
    }
  });
}

setupBackToTop();
route();
