# 📜 Smart Contract Reference

## Overview

The 8004 Mint protocol consists of multiple smart contracts deployed on Ethereum Mainnet.

---

## Contract Addresses

### Mainnet Deployments

| Contract | Address | Verified |
|----------|---------|----------|
| **EssayGatedToken (STORY)** | `0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e` | ✅ |
| **StoryStakingV2** | `0x92E11f6Cfe0c23b0ea007d83B1a80E1A2E4a6146` | ✅ |
| **Remittance** | `0xc83cEFfCBcdb2Fe39f5028ad4c5C0b86Ac2cF8C3` | ✅ |
| **RemitToken (REMIT)** | `0x4e49b22Ec9ecC6aBF5B69F8C4F7bC0D1eF53b2DE` | ✅ |

### Legacy Contracts (Deprecated)

| Contract | Address | Status |
|----------|---------|--------|
| **StoryStaking V0** | `0x3d7BFc2265C6b82c12B7dC85FfbCb5f9a48d02c4` | ⚠️ Deprecated |
| **StoryStaking V1** | `0x8c2e8D5f698E2B9C4D66e728D62E0A5e8F9A1B3c` | ⚠️ Deprecated |

---

## EssayGatedToken.sol

### Description

AI-gated ERC-20 token that can only be claimed by users who submit quality content evaluated by machine learning.

### Inheritance

```
EssayGatedToken
├── ERC20 (OpenZeppelin)
├── Ownable (OpenZeppelin)
├── ReentrancyGuard (OpenZeppelin)
└── EIP712 (Custom implementation)
```

### State Variables

```solidity
uint256 public constant MAX_SUPPLY = 1_000_000 * 10**18;
uint256 public constant CLAIM_AMOUNT = 100 * 10**18;
uint256 public constant LP_RESERVE = 400_000 * 10**18;
uint8 public constant MIN_SCORE = 60;
uint256 public claimCost = 10 * 10**6; // 10 USDC

address public signer;
mapping(address => bool) public hasClaimed;
mapping(address => uint256) public nonces;
```

### Functions

#### claim

```solidity
function claim(
    string calldata essayHash,
    uint8 score,
    bytes calldata signature
) external payable nonReentrant
```

Claim STORY tokens by providing a valid essay submission.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `essayHash` | string | Keccak256 hash of essay content |
| `score` | uint8 | AI-assigned score (0-100) |
| `signature` | bytes | EIP-712 signature from backend |

**Requirements:**
- Score ≥ 60
- Not already claimed
- Valid signature
- Claim fee paid (10 USDC)

**Events:**
```solidity
event Claimed(address indexed claimer, string essayHash, uint8 score, uint256 amount);
```

#### setSigner

```solidity
function setSigner(address _signer) external onlyOwner
```

Update the authorized signer address.

#### setClaimCost

```solidity
function setClaimCost(uint256 _cost) external onlyOwner
```

Update the claim fee amount.

### EIP-712 Domain

```solidity
bytes32 constant DOMAIN_TYPEHASH = keccak256(
    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
);

bytes32 constant CLAIM_TYPEHASH = keccak256(
    "Claim(address claimer,string essayHash,uint8 score,uint256 nonce)"
);
```

---

## StoryStakingV2.sol

### Description

Advanced staking contract with lock periods, multipliers, VIP tiers, and referral rewards.

### Inheritance

```
StoryStakingV2
├── Ownable (OpenZeppelin)
├── ReentrancyGuard (OpenZeppelin)
└── Pausable (OpenZeppelin)
```

### Enums

```solidity
enum LockPeriod {
    Flexible,   // 7 days minimum
    Days30,     // 30 days
    Days90,     // 90 days
    Days180,    // 180 days
    Days365     // 365 days
}

enum VipTier {
    None,       // 0 tokens
    Bronze,     // 1,000+ tokens
    Silver,     // 5,000+ tokens
    Gold,       // 10,000+ tokens
    Platinum,   // 25,000+ tokens
    Diamond     // 50,000+ tokens
}
```

### State Variables

```solidity
IERC20 public immutable storyToken;

struct Stake {
    uint256 amount;
    uint256 startTime;
    uint256 endTime;
    LockPeriod lockPeriod;
    uint256 lastClaimTime;
    bool active;
}

mapping(address => Stake[]) public userStakes;
mapping(address => uint256) public totalStaked;
mapping(address => address) public referrer;
mapping(address => uint256) public referralRewards;
```

### Constants

```solidity
uint256 constant BASE_RATE = 1;
uint256 constant PRECISION = 1e18;
uint256 constant REFERRAL_BONUS = 5; // 5%

uint256[] LOCK_MULTIPLIERS = [100, 150, 250, 400, 800]; // basis points / 100
uint256[] VIP_MULTIPLIERS = [100, 110, 120, 135, 150, 175]; // basis points / 100
uint256[] VIP_THRESHOLDS = [0, 1000e18, 5000e18, 10000e18, 25000e18, 50000e18];
```

### Functions

#### stake

```solidity
function stake(uint256 amount, LockPeriod period) external nonReentrant whenNotPaused
```

Stake STORY tokens with a chosen lock period.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `amount` | uint256 | Amount of tokens to stake |
| `period` | LockPeriod | Lock period enum value |

**Events:**
```solidity
event Staked(address indexed user, uint256 indexed stakeId, uint256 amount, LockPeriod period);
```

#### stakeWithReferral

```solidity
function stakeWithReferral(
    uint256 amount,
    LockPeriod period,
    address _referrer
) external nonReentrant whenNotPaused
```

Stake with referral link.

#### unstake

```solidity
function unstake(uint256 stakeId) external nonReentrant
```

Unstake tokens and claim pending points.

**Requirements:**
- Stake must exist and be active
- Lock period must have passed (or accept penalty)

**Events:**
```solidity
event Unstaked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 points);
```

#### getPendingPoints

```solidity
function getPendingPoints(address user, uint256 stakeId) public view returns (uint256)
```

Calculate pending points for a specific stake.

**Formula:**
```
points = (amount × duration × baseRate × lockMultiplier × vipMultiplier) / PRECISION²
```

#### getVipTier

```solidity
function getVipTier(address user) public view returns (VipTier)
```

Get user's current VIP tier based on total staked amount.

#### getAllStakes

```solidity
function getAllStakes(address user) external view returns (Stake[] memory)
```

Get all stakes for a user.

### Admin Functions

```solidity
function pause() external onlyOwner
function unpause() external onlyOwner
function setBaseRate(uint256 _rate) external onlyOwner
function setVipThresholds(uint256[] calldata _thresholds) external onlyOwner
```

---

## Remittance.sol

### Description

Peer-to-peer OTC trading contract for REMIT tokens with escrow functionality.

### Key Functions

```solidity
function createOrder(uint256 amount, uint256 price, bool isBuyOrder) external
function fillOrder(uint256 orderId) external payable
function cancelOrder(uint256 orderId) external
function getActiveOrders() external view returns (Order[] memory)
```

---

## Security Features

### All Contracts

| Feature | Implementation |
|---------|----------------|
| Reentrancy Protection | `ReentrancyGuard` on all external calls |
| Access Control | `Ownable` for admin functions |
| Emergency Stop | `Pausable` circuit breaker |
| Safe Transfers | `SafeERC20` for token operations |

### EssayGatedToken Specific

| Feature | Implementation |
|---------|----------------|
| Signature Verification | EIP-712 typed data |
| Replay Protection | Per-address nonces |
| Supply Cap | Hardcoded `MAX_SUPPLY` |
| Single Claim | `hasClaimed` mapping |

### StoryStakingV2 Specific

| Feature | Implementation |
|---------|----------------|
| Lock Enforcement | Block timestamp validation |
| Early Exit Penalty | 50% points forfeiture |
| Overflow Protection | Solidity 0.8+ built-in |

---

## Gas Optimization

### Techniques Used

1. **Immutable Variables** - Token address stored as immutable
2. **Custom Errors** - Gas-efficient error handling
3. **Packed Structs** - Optimal storage layout
4. **View Functions** - Read operations don't cost gas

### Estimated Gas Costs

| Operation | Gas Used |
|-----------|----------|
| claim() | ~85,000 |
| stake() | ~120,000 |
| unstake() | ~75,000 |
| getPendingPoints() | ~25,000 (view) |

---

## Events

### EssayGatedToken

```solidity
event Claimed(address indexed claimer, string essayHash, uint8 score, uint256 amount);
event SignerUpdated(address indexed oldSigner, address indexed newSigner);
event ClaimCostUpdated(uint256 oldCost, uint256 newCost);
```

### StoryStakingV2

```solidity
event Staked(address indexed user, uint256 indexed stakeId, uint256 amount, LockPeriod period);
event Unstaked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 points);
event ReferralSet(address indexed user, address indexed referrer);
event ReferralReward(address indexed referrer, address indexed referee, uint256 amount);
event PointsClaimed(address indexed user, uint256 amount);
```

---

## Integration Examples

### Reading Stake Data

```typescript
import { ethers } from 'ethers';

const stakingABI = [...]; // ABI
const stakingAddress = '0x92E11f6Cfe0c23b0ea007d83B1a80E1A2E4a6146';

async function getUserStakes(userAddress: string) {
  const provider = new ethers.JsonRpcProvider('...');
  const staking = new ethers.Contract(stakingAddress, stakingABI, provider);
  
  const stakes = await staking.getAllStakes(userAddress);
  const vipTier = await staking.getVipTier(userAddress);
  
  let totalPending = 0n;
  for (let i = 0; i < stakes.length; i++) {
    if (stakes[i].active) {
      const pending = await staking.getPendingPoints(userAddress, i);
      totalPending += pending;
    }
  }
  
  return { stakes, vipTier, totalPending };
}
```

### Claiming Tokens

```typescript
async function claimTokens(
  signer: ethers.Signer,
  essayHash: string,
  score: number,
  signature: string
) {
  const tokenABI = [...];
  const tokenAddress = '0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e';
  
  const token = new ethers.Contract(tokenAddress, tokenABI, signer);
  
  const claimCost = await token.claimCost();
  
  const tx = await token.claim(essayHash, score, signature, {
    value: claimCost
  });
  
  return tx.wait();
}
```

---

## Audits & Verification

| Item | Status |
|------|--------|
| Internal Code Review | ✅ Complete |
| External Audit | 🔄 Pending |
| Etherscan Verification | ✅ All contracts |
| Test Coverage | >90% |

---

## Resources

- [Etherscan - STORY Token](https://etherscan.io/address/0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e)
- [Etherscan - StoryStakingV2](https://etherscan.io/address/0x92E11f6Cfe0c23b0ea007d83B1a80E1A2E4a6146)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/5.x/)
- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
