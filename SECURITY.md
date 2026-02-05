# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow responsible disclosure practices.

### Do NOT:

- Open a public GitHub issue
- Post about it on social media
- Disclose publicly before we've had a chance to address it

### Do:

1. **Email us at:** security@8004mint.com
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes

### Response Timeline

| Stage | Timeframe |
|-------|-----------|
| Initial Response | 24 hours |
| Assessment | 48 hours |
| Resolution Plan | 7 days |
| Fix Deployment | 14-30 days |
| Public Disclosure | After fix + 7 days |

## Bug Bounty Program

We offer rewards for responsibly disclosed vulnerabilities:

| Severity | Reward |
|----------|--------|
| Critical | $5,000 - $20,000 |
| High | $1,000 - $5,000 |
| Medium | $250 - $1,000 |
| Low | $50 - $250 |

### Severity Guidelines

**Critical:**
- Direct fund theft
- Permanent freezing of funds
- Governance manipulation

**High:**
- Temporary freezing of funds
- Privilege escalation
- Signature bypass

**Medium:**
- Griefing attacks
- Temporary DoS
- Information disclosure

**Low:**
- Best practice violations
- Gas inefficiencies
- Minor bugs

## Scope

### In Scope

- Smart Contracts (Solidity)
- Backend API
- Trading Bot Logic
- Signature Generation

### Out of Scope

- Frontend UI bugs (unless security-related)
- Social engineering
- Physical attacks
- Third-party services (OpenAI, KyberSwap, etc.)

## Security Measures

### Smart Contracts

- OpenZeppelin battle-tested libraries
- EIP-712 typed signatures
- Nonce-based replay protection
- ReentrancyGuard on all external calls
- Pausable emergency mechanism

### Backend

- Rate limiting
- Input validation
- Environment variable isolation
- HTTPS only

### Trading Bot

- Per-user isolated wallets
- Private key encryption at rest
- No logging of sensitive data

## Audit Status

| Audit | Status | Report |
|-------|--------|--------|
| Internal Review | ✅ Complete | - |
| External Audit | 🔄 Pending | TBD |

## Contact

- **Security Email:** security@8004mint.com
- **PGP Key:** Available on request

---

Thank you for helping keep 8004 Mint secure!
