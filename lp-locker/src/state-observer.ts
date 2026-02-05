/**
 * State Observer Module
 * Corresponds to "I. Multimodal State Observation Space ($S_t$)" in architecture
 * 
 * Responsible for collecting and aggregating multi-source market data:
 * - On-Chain Market Data (Vector $m_t$)
 * - EIP-8004 Modular Signals (States $e_t$)
 * - Protocol Health Metrics (Risks $r_t$)
 */

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// Type Definitions
// ============================================

/**
 * Market data vector $m_t$
 */
export interface MarketDataVector {
  price: number;              // Current price
  price24hChange: number;     // 24h price change (%)
  volume24h: number;          // 24h trading volume
  liquidity: number;          // Liquidity depth
  marketCap: number;          // Market cap
  txCount24h: number;         // 24h transaction count
  buyPressure: number;        // Buy pressure (0-1)
  sellPressure: number;       // Sell pressure (0-1)
}

/**
 * EIP-8004 modular signal state $e_t$
 */
export interface ModularSignals {
  totalLocked: bigint;        // Total locked amount
  activeLocks: number;        // Active lock count
  avgLockDuration: number;    // Average lock duration (seconds)
  flexibleRatio: number;      // Flexible lock ratio
  timeLockedRatio: number;    // Time-locked ratio
  conditionalRatio: number;   // Conditional lock ratio
  permanentRatio: number;     // Permanent lock ratio
  recentUnlocks: number;      // Recent unlock count
  pendingUnlocks: number;     // Pending unlocks (within 7 days)
}

/**
 * Protocol health metrics $r_t$
 */
export interface ProtocolHealthMetrics {
  tvl: number;                // Total value locked (USD)
  volatility: number;         // Volatility (0-1)
  liquidityRatio: number;     // Liquidity ratio
  concentrationRisk: number;  // Concentration risk (0-1)
  smartMoneyFlow: number;     // Smart money flow (-1 to 1)
  whaleActivity: number;      // Whale activity index
  gasPrice: number;           // Current gas price
  networkCongestion: number;  // Network congestion (0-1)
}

/**
 * Health status enum (synced with contract)
 */
export enum HealthStatus {
  Healthy = 0,
  Warning = 1,
  Critical = 2,
  Emergency = 3
}

/**
 * Fused state tensor $S_t$
 * Output of "State Tensor Aggregator" in architecture
 */
export interface FusedState {
  market: MarketDataVector;
  modular: ModularSignals;
  health: ProtocolHealthMetrics;
  healthStatus: HealthStatus;
  timestamp: number;
  stateHash: string;          // State hash (for on-chain verification)
}

// ============================================
// Configuration
// ============================================

interface ObserverConfig {
  rpcUrl: string;
  lpLockerAddress: string;
  lpTokenAddress: string;
  dexScreenerPairId: string;
  etherscanApiKey?: string;
}

// ============================================
// State Observer Class
// ============================================

export class StateObserver {
  private provider: ethers.JsonRpcProvider;
  private lpLocker: ethers.Contract;
  private lpToken: ethers.Contract;
  private config: ObserverConfig;

  // Historical data cache (for trend calculation)
  private priceHistory: number[] = [];
  private volumeHistory: number[] = [];

  // LP Locker ABI (simplified)
  private static LOCKER_ABI = [
    'function lockRecords(uint256) view returns (address lpToken, uint256 amount, uint256 lockTime, uint256 unlockTime, uint8 lockType, address owner, bool isLocked, bytes32 conditionHash)',
    'function lockIdCounter() view returns (uint256)',
    'function latestMarketState() view returns (uint256 tvl, uint256 volatility, uint256 liquidityDepth, uint256 priceImpact, uint256 timestamp, uint8 health)',
  ];

  // ERC20 ABI
  private static ERC20_ABI = [
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
  ];

  constructor(config: ObserverConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.lpLocker = new ethers.Contract(
      config.lpLockerAddress,
      StateObserver.LOCKER_ABI,
      this.provider
    );
    this.lpToken = new ethers.Contract(
      config.lpTokenAddress,
      StateObserver.ERC20_ABI,
      this.provider
    );
  }

  /**
   * Get complete fused state $S_t$
   * Corresponds to "State Tensor Aggregator" in architecture
   */
  async getFusedState(): Promise<FusedState> {
    console.log('[StateObserver] Fetching fused state...');

    // Fetch all data sources in parallel
    const [market, modular, health] = await Promise.all([
      this.fetchMarketData(),
      this.fetchModularSignals(),
      this.fetchHealthMetrics()
    ]);

    // Calculate health status
    const healthStatus = this.calculateHealthStatus(market, health);

    // Generate state hash
    const stateHash = this.computeStateHash(market, modular, health);

    const fusedState: FusedState = {
      market,
      modular,
      health,
      healthStatus,
      timestamp: Date.now(),
      stateHash
    };

    console.log('[StateObserver] Fused state computed:', {
      healthStatus: HealthStatus[healthStatus],
      tvl: health.tvl,
      volatility: health.volatility
    });

    return fusedState;
  }

  /**
   * Fetch market data vector $m_t$
   * Corresponds to "On-Chain Market Data" in architecture
   */
  async fetchMarketData(): Promise<MarketDataVector> {
    try {
      // Fetch data from DexScreener
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/pairs/ethereum/${this.config.dexScreenerPairId}`
      );

      const pair = response.data.pairs?.[0];

      if (!pair) {
        throw new Error('Pair not found');
      }

      const price = parseFloat(pair.priceUsd);
      const volume24h = parseFloat(pair.volume?.h24 || '0');
      const liquidity = parseFloat(pair.liquidity?.usd || '0');
      const price24hChange = parseFloat(pair.priceChange?.h24 || '0');

      // Calculate buy/sell pressure
      const buys = pair.txns?.h24?.buys || 0;
      const sells = pair.txns?.h24?.sells || 0;
      const totalTxns = buys + sells;
      const buyPressure = totalTxns > 0 ? buys / totalTxns : 0.5;
      const sellPressure = totalTxns > 0 ? sells / totalTxns : 0.5;

      // Update history cache
      this.priceHistory.push(price);
      this.volumeHistory.push(volume24h);
      if (this.priceHistory.length > 100) this.priceHistory.shift();
      if (this.volumeHistory.length > 100) this.volumeHistory.shift();

      return {
        price,
        price24hChange,
        volume24h,
        liquidity,
        marketCap: parseFloat(pair.fdv || '0'),
        txCount24h: totalTxns,
        buyPressure,
        sellPressure
      };
    } catch (error) {
      console.error('[StateObserver] Error fetching market data:', error);
      // Return default values
      return {
        price: 0,
        price24hChange: 0,
        volume24h: 0,
        liquidity: 0,
        marketCap: 0,
        txCount24h: 0,
        buyPressure: 0.5,
        sellPressure: 0.5
      };
    }
  }

  /**
   * Fetch EIP-8004 modular signals $e_t$
   * Corresponds to "EIP-8004 Modular Signals" in architecture
   */
  async fetchModularSignals(): Promise<ModularSignals> {
    try {
      const lockCount = await this.lpLocker.lockIdCounter();
      
      let totalLocked = 0n;
      let activeLocks = 0;
      let totalDuration = 0;
      let flexibleCount = 0;
      let timeLockedCount = 0;
      let conditionalCount = 0;
      let permanentCount = 0;
      let recentUnlocks = 0;
      let pendingUnlocks = 0;

      const now = Math.floor(Date.now() / 1000);
      const sevenDaysLater = now + 7 * 24 * 60 * 60;

      // Iterate through all lock records
      for (let i = 0; i < Number(lockCount); i++) {
        try {
          const record = await this.lpLocker.lockRecords(i);
          
          if (record.isLocked) {
            activeLocks++;
            totalLocked += record.amount;
            totalDuration += now - Number(record.lockTime);

            // Count lock types
            switch (Number(record.lockType)) {
              case 0: flexibleCount++; break;
              case 1: timeLockedCount++; break;
              case 2: conditionalCount++; break;
              case 3: permanentCount++; break;
            }

            // Check pending unlocks
            if (record.lockType === 1 && Number(record.unlockTime) <= sevenDaysLater) {
              pendingUnlocks++;
            }
          } else {
            // Check recent unlocks (within past 24 hours)
            const unlockTime = Number(record.unlockTime);
            if (unlockTime > now - 24 * 60 * 60) {
              recentUnlocks++;
            }
          }
        } catch (err) {
          // Skip invalid records
        }
      }

      const totalTypes = flexibleCount + timeLockedCount + conditionalCount + permanentCount;

      return {
        totalLocked,
        activeLocks,
        avgLockDuration: activeLocks > 0 ? totalDuration / activeLocks : 0,
        flexibleRatio: totalTypes > 0 ? flexibleCount / totalTypes : 0,
        timeLockedRatio: totalTypes > 0 ? timeLockedCount / totalTypes : 0,
        conditionalRatio: totalTypes > 0 ? conditionalCount / totalTypes : 0,
        permanentRatio: totalTypes > 0 ? permanentCount / totalTypes : 0,
        recentUnlocks,
        pendingUnlocks
      };
    } catch (error) {
      console.error('[StateObserver] Error fetching modular signals:', error);
      return {
        totalLocked: 0n,
        activeLocks: 0,
        avgLockDuration: 0,
        flexibleRatio: 0,
        timeLockedRatio: 0,
        conditionalRatio: 0,
        permanentRatio: 0,
        recentUnlocks: 0,
        pendingUnlocks: 0
      };
    }
  }

  /**
   * Fetch protocol health metrics $r_t$
   * Corresponds to "Protocol Health Metrics" in architecture
   */
  async fetchHealthMetrics(): Promise<ProtocolHealthMetrics> {
    try {
      // Get on-chain state
      const [onChainState, gasPrice, lpBalance] = await Promise.all([
        this.lpLocker.latestMarketState().catch(() => null),
        this.provider.getFeeData(),
        this.lpToken.balanceOf(this.config.lpLockerAddress)
      ]);

      // Calculate volatility (based on price history)
      const volatility = this.calculateVolatility();

      // Calculate liquidity ratio
      const market = await this.fetchMarketData();
      const liquidityRatio = market.liquidity > 0 
        ? market.volume24h / market.liquidity 
        : 0;

      // Simulate other metrics (actual implementation needs more complex data sources)
      const concentrationRisk = this.calculateConcentrationRisk();
      const smartMoneyFlow = this.calculateSmartMoneyFlow();
      const whaleActivity = this.calculateWhaleActivity();

      // Network congestion (based on gas price)
      const avgGas = 30; // Assume average 30 Gwei
      const currentGas = Number(gasPrice.gasPrice || 0n) / 1e9;
      const networkCongestion = Math.min(currentGas / (avgGas * 3), 1);

      return {
        tvl: Number(ethers.formatEther(lpBalance)) * market.price,
        volatility,
        liquidityRatio,
        concentrationRisk,
        smartMoneyFlow,
        whaleActivity,
        gasPrice: currentGas,
        networkCongestion
      };
    } catch (error) {
      console.error('[StateObserver] Error fetching health metrics:', error);
      return {
        tvl: 0,
        volatility: 0,
        liquidityRatio: 0,
        concentrationRisk: 0,
        smartMoneyFlow: 0,
        whaleActivity: 0,
        gasPrice: 0,
        networkCongestion: 0
      };
    }
  }

  /**
   * Calculate volatility (standard deviation method)
   */
  private calculateVolatility(): number {
    if (this.priceHistory.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < this.priceHistory.length; i++) {
      const ret = (this.priceHistory[i] - this.priceHistory[i - 1]) / this.priceHistory[i - 1];
      returns.push(ret);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Calculate concentration risk (simplified implementation)
   */
  private calculateConcentrationRisk(): number {
    // Actual implementation needs holding distribution analysis
    // Returns simulated value here
    return 0.3;
  }

  /**
   * Calculate smart money flow (simplified implementation)
   */
  private calculateSmartMoneyFlow(): number {
    // Actual implementation needs large transaction analysis
    // Returns value between -1 and 1
    return 0.1;
  }

  /**
   * Calculate whale activity index (simplified implementation)
   */
  private calculateWhaleActivity(): number {
    // Actual implementation needs large wallet monitoring
    return 0.2;
  }

  /**
   * Calculate health status
   * Based on multiple indicators comprehensive judgment
   */
  private calculateHealthStatus(
    market: MarketDataVector,
    health: ProtocolHealthMetrics
  ): HealthStatus {
    let riskScore = 0;

    // Price drop risk
    if (market.price24hChange < -20) riskScore += 3;
    else if (market.price24hChange < -10) riskScore += 2;
    else if (market.price24hChange < -5) riskScore += 1;

    // Volatility risk
    if (health.volatility > 0.5) riskScore += 3;
    else if (health.volatility > 0.3) riskScore += 2;
    else if (health.volatility > 0.15) riskScore += 1;

    // Liquidity risk
    if (health.liquidityRatio > 1) riskScore += 2;
    else if (health.liquidityRatio > 0.5) riskScore += 1;

    // Concentration risk
    if (health.concentrationRisk > 0.7) riskScore += 2;
    else if (health.concentrationRisk > 0.5) riskScore += 1;

    // Network congestion
    if (health.networkCongestion > 0.8) riskScore += 1;

    // Sell pressure
    if (market.sellPressure > 0.7) riskScore += 2;
    else if (market.sellPressure > 0.6) riskScore += 1;

    // Determine status
    if (riskScore >= 10) return HealthStatus.Emergency;
    if (riskScore >= 7) return HealthStatus.Critical;
    if (riskScore >= 4) return HealthStatus.Warning;
    return HealthStatus.Healthy;
  }

  /**
   * Compute state hash (for on-chain verification)
   */
  private computeStateHash(
    market: MarketDataVector,
    modular: ModularSignals,
    health: ProtocolHealthMetrics
  ): string {
    const data = ethers.solidityPacked(
      ['uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
      [
        Math.floor(market.price * 1e8),
        Math.floor(health.tvl * 1e8),
        Math.floor(health.volatility * 1e4),
        modular.activeLocks,
        Date.now()
      ]
    );
    return ethers.keccak256(data);
  }
}
