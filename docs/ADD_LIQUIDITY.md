# Add token to a pool (Uniswap V2)

Create a trading pair with EPASS and USDC (or ETH) and add liquidity so users can trade on Uniswap. **No contract changes**; do it on the DEX.

---

## Prerequisites

- Your wallet has:
  - **EPASS**: 6,000 pre-minted at deploy (or the amount you want to add);
  - **Other side**: USDC (recommended, matches payment) or ETH.
- Enough mainnet ETH for gas.

---

## Option 1: Web UI (recommended)

1. **Open Uniswap**  
   Go to [https://app.uniswap.org](https://app.uniswap.org), connect wallet, switch to **Ethereum** mainnet.

2. **V2 liquidity**  
   Top menu **Pools** → **More** → **V2 liquidity** → **Create pair** (or **Add liquidity** if the pair already exists).

3. **Choose pair**  
   - **Token A**: Your token (paste contract address `0xA2f60C005A22c7c5bAB54d0153b39ee1050324C4`, or select EPASS if listed).  
   - **Token B**: USDC (`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`) or WETH.

4. **Amounts**  
   Enter EPASS and USDC (or ETH) amounts. Ratio sets initial price, e.g.:  
   - 6,000 EPASS + 6,000 USDC → ~1 EPASS = 1 USDC;  
   - 6,000 EPASS + 3,000 USDC → ~1 EPASS = 0.5 USDC.

5. **Approve + add**  
   Click **Approve** for each token if prompted; then **Supply** / **Add Liquidity**, confirm tx.

6. **Result**  
   You receive **LP tokens** (Uniswap V2 Pair) representing your share; manage in Pools → Remove liquidity later.

---

## Option 2: Script (optional)

To add liquidity via script (fixed ratio, reproducible), use Hardhat + ethers to call Uniswap V2 Router.

**Uniswap V2 mainnet:**

- Router02: `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`
- Factory: `0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f`

**Outline:**

1. In `.env`: `CONTRACT_ADDRESS` (EPASS), private key (wallet holding EPASS and USDC), `RPC_URL`.
2. Call `approve(routerAddress, amount)` for EPASS and USDC.
3. Call Router `addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline)`; `to` = LP recipient, `deadline` = block timestamp (e.g. `Math.floor(Date.now()/1000) + 60*20`).
4. Set `amountAMin` / `amountBMin` with some slippage (e.g. 0.95) to avoid revert on price move.

You can add `scripts/add-liquidity.ts` that reads token addresses and amounts from `.env` and runs approve + addLiquidity.

---

## FAQ

| Issue | Notes |
|-------|--------|
| Token not found | Uniswap → "Manage token list" → import by contract: EPASS `0xA2f60C005A22c7c5bAB54d0153b39ee1050324C4`, USDC mainnet `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`. |
| Initial price | Your EPASS:USDC ratio when adding is the initial price (e.g. 1:1 → 1 EPASS = 1 USDC). |
| USDC from fees | 100 USDC per claim sent to `PAYMENT_RECIPIENT` can be used with reserved EPASS to add liquidity. |
| Remove liquidity | Uniswap Pools → your position → Remove liquidity to get EPASS and USDC back. |

---

## Summary

- **Recommended**: Use [Uniswap](https://app.uniswap.org) Pools → V2 liquidity, EPASS + USDC, create/add pool, Approve then Supply.
- **Optional**: Script calling Router `addLiquidity` for fixed params.
- No changes to the token contract; you only need tokens and USDC/ETH.
