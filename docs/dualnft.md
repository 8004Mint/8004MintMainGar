# DualNFT - Image-Token Duality

## Overview

DualNFT is a unique NFT collection where each NFT is permanently bound to 100 NFT tokens. This creates a "dual nature" - you're buying both an image and tokens that cannot be separated.

**Contract:** `TBD` (pending deployment)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DualNFT System                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        MINTING FLOW                                  │   │
│   │                                                                      │   │
│   │   User ──► Approve 10 STORY ──► Call mint()                         │   │
│   │              │                       │                               │   │
│   │              │                       ▼                               │   │
│   │              │            ┌─────────────────────┐                   │   │
│   │              │            │   DualNFT Contract  │                   │   │
│   │              │            │                     │                   │   │
│   │              └──────────► │  10 STORY received  │                   │   │
│   │                           │        │            │                   │   │
│   │                           │        ├──► 2 STORY → 🔥 Burn          │   │
│   │                           │        ├──► 8 STORY → 👤 User          │   │
│   │                           │        └──► 1 NFT   → 👤 User          │   │
│   │                           │            (+ 100 bound tokens)         │   │
│   │                           └─────────────────────┘                   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        DUAL NATURE                                   │   │
│   │                                                                      │   │
│   │   ┌───────────────────────────────────────────────────────────┐     │   │
│   │   │                     NFT #1234                              │     │   │
│   │   │   ┌─────────────┐   ┌───────────────────────────────┐    │     │   │
│   │   │   │             │   │                               │    │     │   │
│   │   │   │   🖼️ Image   │ + │   💰 100 NFT Tokens (bound)   │    │     │   │
│   │   │   │   (ERC-721) │   │   (non-separable)             │    │     │   │
│   │   │   │             │   │                               │    │     │   │
│   │   │   └─────────────┘   └───────────────────────────────┘    │     │   │
│   │   │                                                           │     │   │
│   │   │   Transfer NFT = Transfer Image + 100 Tokens together    │     │   │
│   │   └───────────────────────────────────────────────────────────┘     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Token Economics

| Parameter | Value |
|-----------|-------|
| **Mint Price** | 10 STORY |
| **Burned** | 2 STORY (20%) |
| **Returned** | 8 STORY (80%) |
| **NFT Received** | 1 NFT |
| **Bound Tokens** | 100 NFT tokens per NFT |

### Supply

| Metric | Value |
|--------|-------|
| Max NFT Supply | 10,000 |
| Total Token Supply | 1,000,000 (10,000 × 100) |
| Tokens per NFT | 100 (fixed, non-separable) |

### Effective Cost

```
Net Cost = 10 STORY - 8 STORY (returned) = 2 STORY per NFT
```

---

## Key Features

### 1. Image-Token Duality
- Each NFT is both an image and 100 tokens
- Cannot be separated or split
- Transfer NFT = transfer image + tokens together

### 2. Deflationary Mechanism
- 2 STORY burned per mint
- Max burn: 20,000 STORY (if all 10,000 NFTs minted)

### 3. User-Friendly Minting
- 80% of payment returned
- Effective cost: only 2 STORY
- Batch minting supported

---

## Smart Contract

### DualNFT.sol

**Key Functions:**

```solidity
// Mint single NFT (requires 10 STORY approval)
function mint() external returns (uint256 tokenId)

// Batch mint multiple NFTs
function batchMint(uint256 amount) external returns (uint256[] memory tokenIds)

// Get NFT token balance (NFT count × 100)
function tokenBalanceOf(address account) external view returns (uint256)

// Get bound tokens for specific NFT (always 100)
function boundTokens(uint256 tokenId) external view returns (uint256)

// Get all NFTs owned by address
function tokensOfOwner(address owner) external view returns (uint256[] memory)
```

**Events:**

```solidity
// Emitted on mint
event NFTMinted(
    address indexed user,
    uint256 indexed tokenId,
    uint256 storyBurned,      // 2 STORY
    uint256 storyReturned,    // 8 STORY
    uint256 boundTokens       // 100
);

// Emitted on transfer (shows dual nature)
event DualTransfer(
    address indexed from,
    address indexed to,
    uint256 indexed tokenId,
    uint256 boundTokens       // 100
);
```

---

## How to Mint

### Step 1: Approve STORY

```javascript
const storyToken = new ethers.Contract(STORY_ADDRESS, ERC20_ABI, signer);
await storyToken.approve(DUALNFT_ADDRESS, ethers.parseEther("10"));
```

### Step 2: Mint NFT

```javascript
const dualNFT = new ethers.Contract(DUALNFT_ADDRESS, DUALNFT_ABI, signer);
const tx = await dualNFT.mint();
const receipt = await tx.wait();

// Get token ID from event
const event = receipt.logs.find(log => log.fragment?.name === 'NFTMinted');
const tokenId = event.args.tokenId;
console.log("Minted NFT #" + tokenId);
```

### Step 3: Check Balance

```javascript
// NFT count
const nftBalance = await dualNFT.balanceOf(userAddress);
console.log("NFTs owned:", nftBalance.toString());

// Token balance (NFT count × 100)
const tokenBalance = await dualNFT.tokenBalanceOf(userAddress);
console.log("NFT tokens:", tokenBalance.toString());
```

---

## User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER JOURNEY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. BEFORE MINT                                                            │
│      ├── User has: 100 STORY                                                │
│      └── User has: 0 NFTs, 0 NFT tokens                                     │
│                                                                              │
│   2. APPROVE                                                                 │
│      └── User approves DualNFT to spend 10 STORY                           │
│                                                                              │
│   3. MINT                                                                    │
│      ├── User calls mint()                                                  │
│      ├── 10 STORY transferred to contract                                   │
│      ├── 2 STORY burned 🔥                                                  │
│      ├── 8 STORY returned to user                                           │
│      └── 1 NFT minted to user                                               │
│                                                                              │
│   4. AFTER MINT                                                             │
│      ├── User has: 98 STORY (100 - 10 + 8)                                  │
│      └── User has: 1 NFT = 100 NFT tokens                                   │
│                                                                              │
│   5. TRANSFER (Optional)                                                    │
│      ├── User transfers NFT to another address                              │
│      └── 100 NFT tokens move together with NFT                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Comparison with ERC-404

| Feature | DualNFT | ERC-404 |
|---------|---------|---------|
| Token/NFT Ratio | Fixed 100:1 | Configurable |
| Separable | ❌ No | ✅ Yes |
| Fractionalization | ❌ No | ✅ Yes |
| Complexity | Simple | Complex |
| Gas Cost | Lower | Higher |
| Use Case | Collectible + Fixed Value | Tradeable Fractions |

---

## Security Considerations

1. **ReentrancyGuard** - All minting functions protected
2. **Overflow Protection** - Solidity 0.8.20 built-in
3. **Access Control** - Owner-only admin functions
4. **Emergency Withdraw** - Recover stuck tokens

---

## Deployment

```bash
# Set environment variables
export STORY_TOKEN_ADDRESS=0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e
export DUALNFT_BASE_URI=https://api.8004mint.com/dualnft/metadata/

# Deploy
npx hardhat run scripts/deploy-dualnft.ts --network mainnet

# Verify
npx hardhat verify --network mainnet <CONTRACT_ADDRESS> \
  "0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e" \
  "https://api.8004mint.com/dualnft/metadata/"
```

---

## Related Links

- [STORY Token](https://etherscan.io/address/0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e)
- [8004 Mint Platform](https://8004mint.com)
- [EIP-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)

---

## License

MIT License
