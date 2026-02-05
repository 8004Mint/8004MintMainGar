# Remittance Project Design

## Overview

Remittance is the second project on the 8004 Mint Launchpad platform. Users exchange USDC and STORY tokens for the new REMIT token through an ERC-8004 compliant agent verification process.

## Token Economics

### REMIT Token
| Property | Value |
|----------|-------|
| Name | Remit |
| Symbol | REMIT |
| Total Supply | 1,000,000 |
| Decimals | 18 |
| Transfer Tax | 1% |

### Supply Distribution
| Allocation | Amount | Percentage |
|------------|--------|------------|
| LP Reserve | 200,000 | 20% |
| Mintable via Remittance | 800,000 | 80% |

### Transfer Tax
- **Rate**: 1% on all transfers
- **Recipient**: Tax Wallet (configurable by owner)
- **Excluded**: Contract addresses, LP pools, owner

## Remittance Mechanics

### User Flow
```
User sends: 10 USDC + 5 STORY
     ↓
Agent verifies & signs
     ↓
User receives: 9 USDC + 10 REMIT
     ↓
5 STORY → Dead Address (burned)
1 USDC → Team Wallet (fee)
```

### Limits
| Limit | Value |
|-------|-------|
| Per Wallet | 100 operations |
| Total Operations | 80,000 |
| Total REMIT Mintable | 800,000 |

### Token Requirements
| Token | Amount | Notes |
|-------|--------|-------|
| USDC | 10 | 6 decimals |
| STORY | 5 | 18 decimals |

### Returns
| Token | Amount | Destination |
|-------|--------|-------------|
| USDC | 9 | User |
| USDC | 1 | Team Wallet |
| STORY | 5 | Dead Address |
| REMIT | 10 | User (minted) |

## Smart Contracts

### 1. RemitToken.sol
ERC-20 token with 1% transfer tax.

**Key Functions:**
- `mint(address to, uint256 amount)` - Only callable by Remittance contract
- `setTaxWallet(address)` - Update tax recipient
- `setExcludedFromTax(address, bool)` - Exclude addresses from tax

### 2. Remittance.sol
Main interaction contract.

**Key Functions:**
- `remit(nonce, deadline, signature)` - Execute remittance operation
- `canRemit(address)` - Check if user can perform operation
- `remainingUserOperations(address)` - Get user's remaining operations
- `remainingTotalOperations()` - Get total remaining operations

## Agent (ERC-8004 Compliant)

### Overview
The Remittance Verification Agent is a fully ERC-8004 compliant autonomous agent that:
1. Verifies user token holdings and approvals
2. Signs authorization for remittance operations
3. Accepts reputation feedback from users

### Identity Registry Registration
Register the agent on **Official ERC-8004 Identity Registry** (`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`):

```javascript
// Using scripts/register-remittance-agent.ts
// Per EIP-8004 spec: register() mints an ERC-721 token
const tx = await identityRegistry["register(string)"](
  "https://8004mint.com/.well-known/remittance-agent.json"  // Agent URI
);
const receipt = await tx.wait();
// Agent ID is the ERC-721 tokenId from Transfer event
const agentId = receipt.logs[0].topics[3];
```

### Agent Wallet Setup (Optional)
By default, `agentWallet` is set to the owner's address. To change it, you need an EIP-712 signature:

```javascript
// Requires signature proving control of newWallet
await identityRegistry.setAgentWallet(
  agentId,
  newWalletAddress,
  deadline,
  signature  // EIP-712 or ERC-1271 signature
);
```

### Registration JSON
Served at `/.well-known/remittance-agent.json`:

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "Remittance Verification Agent",
  "description": "Verifies user token holdings and authorizes REMIT token minting. Users exchange 10 USDC + 5 STORY for 9 USDC + 10 REMIT. ERC-8004 compliant.",
  "image": "https://8004mint.com/remit-logo.png",
  "services": [
    { "name": "web", "endpoint": "https://8004mint.com" },
    { "name": "verify", "endpoint": "https://8004mint.com/remittance/verify", "version": "1" },
    { "name": "sign", "endpoint": "https://8004mint.com/remittance/sign", "version": "1" },
    { "name": "status", "endpoint": "https://8004mint.com/remittance/status", "version": "1" }
  ],
  "x402Support": false,
  "active": true,
  "updatedAt": 1738300800,
  "registrations": [
    { "agentId": YOUR_AGENT_ID, "agentRegistry": "eip155:1:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" }
  ],
  "supportedTrust": ["reputation", "crypto-economic"]
}
```

### API Endpoints

#### POST /remittance/verify
Verify if user can perform remittance.

**Request:**
```json
{ "address": "0x..." }
```

**Response (success):**
```json
{
  "success": true,
  "data": {
    "userAddress": "0x...",
    "usdcBalance": "100.00",
    "storyBalance": "50.00",
    "usdcAllowance": "1000.00",
    "storyAllowance": "1000.00",
    "remainingUserOps": 100,
    "remainingTotalOps": 80000
  }
}
```

**Response (error):**
```json
{
  "success": false,
  "error": "Insufficient USDC balance. Required: 10 USDC, Have: 5 USDC"
}
```

#### POST /remittance/sign
Get signed authorization for remittance (calls verify internally).

**Request:**
```json
{ "address": "0x..." }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nonce": 1706745600000,
    "deadline": 1706746200,
    "signature": "0x..."
  }
}
```

#### GET /remittance/status
Get current remittance progress.

**Response:**
```json
{
  "totalOperations": 1234,
  "remainingOperations": 78766,
  "remitTokenMinted": "12,340",
  "remitTokenRemaining": "787,660"
}
```

### Signature Format
```solidity
keccak256(abi.encodePacked(
    userAddress,      // address
    nonce,            // uint256
    deadline,         // uint256
    contractAddress   // address (Remittance contract)
))
```

### Reputation Feedback
Users can submit feedback to **Official ERC-8004 Reputation Registry** (`0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`):

```javascript
await reputationRegistry.giveFeedback(
  agentId,           // Remittance Agent ID
  score,             // int128 (-100 to 100)
  0,                 // decimals
  "remittance",      // tag1
  "",                // tag2
  "",                // endpoint
  "",                // feedbackURI
  ethers.ZeroHash    // feedbackHash
);
```

## Deployment Steps

1. **Deploy RemitToken**
   - Parameters: `taxWallet`, `lpHolder`
   - Mints 200,000 REMIT to LP holder

2. **Deploy Remittance**
   - Parameters: `usdc`, `storyToken`, `remitToken`, `teamWallet`, `agentSigner`

3. **Configure**
   - Call `remitToken.setRemittanceContract(remittanceAddress)`
   - Exclude Uniswap pair from tax (after LP creation)

4. **Verify on Etherscan**
   - Both contracts

5. **Register Agent**
   - On 8004scan Identity Registry

6. **Add Liquidity**
   - Use 200,000 REMIT + ETH/USDC on Uniswap

## Frontend Integration

### Required Contract Calls
```javascript
// Check if user can participate
const canRemit = await remittance.canRemit(userAddress);
const remaining = await remittance.remainingUserOperations(userAddress);

// Approve tokens (one-time)
await usdc.approve(remittanceAddress, MAX_UINT256);
await story.approve(remittanceAddress, MAX_UINT256);

// Execute remittance (with agent signature)
await remittance.remit(nonce, deadline, signature);
```

### API Endpoint (Agent)
```
POST /api/remittance/sign
Body: { address: string }
Response: { nonce, deadline, signature }
```

## Security Considerations

1. **Reentrancy**: Protected by `ReentrancyGuard`
2. **Signature Replay**: Prevented by nonce tracking
3. **Signature Expiry**: Enforced by deadline
4. **Access Control**: Mint only via Remittance contract
5. **Emergency**: Owner can withdraw stuck tokens

## Addresses (To Be Filled After Deployment)

| Contract | Address |
|----------|---------|
| REMIT Token | TBD |
| Remittance | TBD |
| Tax Wallet | TBD |
| Team Wallet | TBD |
| Agent Signer | TBD |
