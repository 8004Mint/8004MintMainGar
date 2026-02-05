# Contributing to 8004 Mint

First off, thank you for considering contributing to 8004 Mint! It's people like you that make this project great.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contribution Guidelines](#contribution-guidelines)
- [Pull Request Process](#pull-request-process)
- [Style Guides](#style-guides)
- [Community](#community)

---

## Code of Conduct

This project and everyone participating in it is governed by our commitment to a harassment-free experience for everyone. We expect all contributors to be respectful and constructive in their communications.

---

## Getting Started

### Types of Contributions

We welcome:

- **Bug Reports** - Found a bug? Open an issue!
- **Feature Requests** - Have an idea? Share it!
- **Code Contributions** - Fix bugs, add features
- **Documentation** - Improve docs, fix typos
- **Testing** - Add test coverage

### What We're Looking For

| Priority | Area | Examples |
|----------|------|----------|
| High | Security | Vulnerability fixes, audit findings |
| High | Smart Contracts | Gas optimizations, bug fixes |
| Medium | Frontend | UI improvements, new features |
| Medium | Bot | Trading logic, new commands |
| Low | Docs | Typos, clarifications |

---

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Git

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/8004mint/8004.git
cd 8004

# Install root dependencies
npm install

# Install component dependencies
cd contracts && npm install
cd ../frontend && npm install
cd ../backend && npm install
cd ../trading-bot && npm install
```

### Environment Setup

```bash
# Copy example env files
cp contracts/.env.example contracts/.env
cp backend/.env.example backend/.env
cp trading-bot/.env.example trading-bot/.env

# Edit with your values
```

### Running Locally

```bash
# Terminal 1: Local Hardhat node
cd contracts
npx hardhat node

# Terminal 2: Backend API
cd backend
npm run dev

# Terminal 3: Frontend
cd frontend
npm run dev

# Terminal 4: Trading bot (optional)
cd trading-bot
npm run dev
```

---

## Contribution Guidelines

### Before You Start

1. **Check existing issues** - Someone might already be working on it
2. **Open an issue first** - For major changes, discuss before coding
3. **Fork the repository** - Work on your own copy

### Branch Naming

```
feature/short-description
bugfix/issue-number-description
docs/what-you-documented
refactor/what-you-refactored
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting, no code change
- `refactor` - Code restructuring
- `test` - Adding tests
- `chore` - Maintenance

**Examples:**
```
feat(staking): add VIP tier calculation

fix(bot): handle null portfolio state

docs(api): add rate limit documentation

refactor(contracts): extract multiplier logic
```

---

## Pull Request Process

### 1. Prepare Your PR

- [ ] Code follows style guides
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] No console.logs or debug code

### 2. Create Pull Request

```markdown
## Summary
Brief description of changes

## Changes
- Change 1
- Change 2

## Testing
How to test these changes

## Checklist
- [ ] Tests added/updated
- [ ] Docs updated
- [ ] Ready for review
```

### 3. Review Process

1. **Automated checks** - CI must pass
2. **Code review** - At least 1 approval required
3. **Address feedback** - Make requested changes
4. **Merge** - Squash and merge when approved

### PR Size Guidelines

| Size | Lines Changed | Review Time |
|------|---------------|-------------|
| Small | < 100 | < 1 day |
| Medium | 100-500 | 1-3 days |
| Large | 500+ | 3-7 days |

**Tip:** Smaller PRs get reviewed faster!

---

## Style Guides

### TypeScript

```typescript
// Use explicit types
function calculatePoints(amount: bigint, multiplier: number): bigint {
  return amount * BigInt(Math.floor(multiplier * 100)) / 100n;
}

// Use async/await over promises
async function fetchData(): Promise<Data> {
  const response = await fetch(url);
  return response.json();
}

// Prefer const over let
const config = loadConfig();

// Use descriptive names
const userStakingBalance = await getBalance(userAddress);
```

### Solidity

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Use NatSpec comments
/// @title Story Token Staking
/// @notice Stake STORY tokens to earn points
/// @dev Implements multiplier-based point accrual
contract StoryStaking {
    // Use custom errors over require strings
    error InsufficientBalance();
    error InvalidAmount();
    
    // Use named parameters in events
    event Staked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        LockPeriod period
    );
    
    // Order: state, events, errors, modifiers, functions
}
```

### CSS/Tailwind

```css
/* Use Tailwind utility classes */
<div class="flex items-center justify-between p-4 bg-gray-900 rounded-lg">

/* Custom CSS only when necessary */
.gradient-border {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

---

## Testing

### Running Tests

```bash
# Smart contract tests
cd contracts
npx hardhat test
npx hardhat coverage

# Frontend tests (if applicable)
cd frontend
npm test

# Backend tests
cd backend
npm test
```

### Writing Tests

```typescript
describe('StoryStaking', () => {
  describe('stake', () => {
    it('should create stake with correct parameters', async () => {
      // Arrange
      const amount = ethers.parseEther('1000');
      const period = LockPeriod.Days90;
      
      // Act
      await staking.stake(amount, period);
      
      // Assert
      const stake = await staking.getStake(user.address, 0);
      expect(stake.amount).to.equal(amount);
    });
    
    it('should revert with zero amount', async () => {
      await expect(staking.stake(0, LockPeriod.Flexible))
        .to.be.revertedWithCustomError(staking, 'InvalidAmount');
    });
  });
});
```

---

## Community

### Getting Help

- **Discord**: [Join our server](#)
- **Twitter**: [@8004mint](#)
- **Issues**: GitHub Issues

### Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Community spotlights

---

## Security

Found a security issue? **Do not open a public issue.**

Email: security@8004mint.com

See [SECURITY.md](./SECURITY.md) for our security policy.

---

Thank you for contributing! 🎉
