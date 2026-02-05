# 🔌 API Reference

## Overview

The 8004 Mint Backend API provides endpoints for essay scoring, signature generation, and points calculation.

**Base URL:** `https://api.8004mint.com` (Production)

---

## Authentication

Most endpoints require no authentication. Signature generation endpoints use the backend's private key for signing.

---

## Endpoints

### Health Check

Check if the API is running.

```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-30T12:00:00.000Z"
}
```

---

### Score Essay

Submit an essay for AI evaluation.

```http
POST /api/score
Content-Type: application/json
```

**Request Body:**
```json
{
  "essay": "Your essay content here...",
  "address": "0x..."
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `essay` | string | Yes | Essay content (min 100 chars) |
| `address` | string | Yes | User's Ethereum address |

**Response (Success):**
```json
{
  "success": true,
  "score": 75,
  "feedback": "Your essay demonstrates strong narrative...",
  "essayHash": "0x...",
  "eligible": true
}
```

**Response (Ineligible):**
```json
{
  "success": true,
  "score": 45,
  "feedback": "Your essay needs improvement in...",
  "essayHash": "0x...",
  "eligible": false
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Essay too short. Minimum 100 characters required."
}
```

---

### Generate Signature

Generate EIP-712 signature for claim.

```http
POST /api/sign
Content-Type: application/json
```

**Request Body:**
```json
{
  "address": "0x...",
  "essayHash": "0x...",
  "score": 75
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | Yes | User's Ethereum address |
| `essayHash` | string | Yes | Keccak256 hash of essay |
| `score` | number | Yes | AI score (must be ≥60) |

**Response:**
```json
{
  "success": true,
  "signature": "0x...",
  "nonce": 0,
  "deadline": 1706700000
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Score must be at least 60 to claim"
}
```

---

### Calculate Points

Get pending points for a staker.

```http
GET /api/points/:address
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | path | Yes | User's Ethereum address |

**Response:**
```json
{
  "success": true,
  "address": "0x...",
  "stakes": [
    {
      "id": 0,
      "amount": "10000000000000000000000",
      "lockPeriod": 4,
      "pendingPoints": "1234567890000000000000"
    }
  ],
  "totalPendingPoints": "1234567890000000000000",
  "vipTier": 3,
  "vipMultiplier": 1.35
}
```

---

## EIP-712 Signature Format

### Domain

```typescript
const domain = {
  name: "EssayGatedToken",
  version: "1",
  chainId: 1,
  verifyingContract: "0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e"
};
```

### Types

```typescript
const types = {
  Claim: [
    { name: "claimer", type: "address" },
    { name: "essayHash", type: "string" },
    { name: "score", type: "uint8" },
    { name: "nonce", type: "uint256" }
  ]
};
```

### Value

```typescript
const value = {
  claimer: "0x...",
  essayHash: "0x...",
  score: 75,
  nonce: 0
};
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid credentials |
| 404 | Not Found - Resource doesn't exist |
| 429 | Rate Limited - Too many requests |
| 500 | Server Error - Internal error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/api/score` | 10 requests/minute |
| `/api/sign` | 30 requests/minute |
| `/api/points` | 60 requests/minute |

---

## Code Examples

### JavaScript/TypeScript

```typescript
import { ethers } from 'ethers';

// Score an essay
async function scoreEssay(essay: string, address: string) {
  const response = await fetch('https://api.8004mint.com/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ essay, address })
  });
  return response.json();
}

// Get signature for claim
async function getSignature(address: string, essayHash: string, score: number) {
  const response = await fetch('https://api.8004mint.com/api/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, essayHash, score })
  });
  return response.json();
}

// Execute claim on-chain
async function claimTokens(
  signer: ethers.Signer,
  essayHash: string,
  score: number,
  signature: string
) {
  const contract = new ethers.Contract(
    '0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e',
    ['function claim(string,uint8,bytes) payable'],
    signer
  );
  
  const tx = await contract.claim(essayHash, score, signature, {
    value: ethers.parseUnits('10', 6) // 10 USDC claim fee
  });
  
  return tx.wait();
}
```

### Python

```python
import requests
import json

API_BASE = 'https://api.8004mint.com'

def score_essay(essay: str, address: str) -> dict:
    response = requests.post(
        f'{API_BASE}/api/score',
        json={'essay': essay, 'address': address}
    )
    return response.json()

def get_signature(address: str, essay_hash: str, score: int) -> dict:
    response = requests.post(
        f'{API_BASE}/api/sign',
        json={
            'address': address,
            'essayHash': essay_hash,
            'score': score
        }
    )
    return response.json()

def get_points(address: str) -> dict:
    response = requests.get(f'{API_BASE}/api/points/{address}')
    return response.json()
```

### cURL

```bash
# Score essay
curl -X POST https://api.8004mint.com/api/score \
  -H "Content-Type: application/json" \
  -d '{"essay":"Your essay here...","address":"0x..."}'

# Get signature
curl -X POST https://api.8004mint.com/api/sign \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...","essayHash":"0x...","score":75}'

# Get points
curl https://api.8004mint.com/api/points/0x...
```

---

## Webhook Events (Coming Soon)

Future support for webhook notifications:

| Event | Description |
|-------|-------------|
| `claim.success` | Token claim successful |
| `stake.created` | New stake created |
| `stake.unstaked` | Tokens unstaked |
| `points.milestone` | Points milestone reached |
