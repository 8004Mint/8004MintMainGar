/**
 * EIP-8004 Neural LP Locker Agent
 * 
 * Main entry file, integrating all modules:
 * - State Observer (state observation)
 * - AI Policy Network (AI decision)
 * - Execution Engine (execution engine)
 * 
 * Corresponds to complete Mermaid architecture:
 * I. Observation Space -> II. Agent Core -> III. Execution Layer
 *                    <-- Feedback Loop <--
 */

import * as cron from 'node-cron';
import * as dotenv from 'dotenv';
import { StateObserver, FusedState, HealthStatus } from './state-observer';
import { AIPolicyNetwork, AIDecision, ActionType, LockInfo } from './ai-policy-network';
import { ExecutionEngine, ExecutionResult } from './execution-engine';

dotenv.config();

// ============================================
// Configuration
// ============================================

interface AgentConfig {
  // RPC configuration
  rpcUrl: string;
  
  // Contract addresses
  lpLockerAddress: string;
  lpTokenAddress: string;
  
  // DexScreener configuration
  dexScreenerPairId: string;
  
  // AI configuration
  openaiApiKey: string;
  aiModel: string;
  
  // Execution configuration
  privateKey: string;
  maxGasLimit: bigint;
  maxPriorityFee: bigint;
  
  // Scheduling configuration
  cycleInterval: string;  // cron expression
  stateUpdateInterval: string;
  
  // Constraint configuration
  maxUnlockRatio: number;
  minLockDuration: number;
  maxGasPrice: number;
}

// Load configuration from environment variables
function loadConfig(): AgentConfig {
  return {
    rpcUrl: process.env.RPC_URL || 'https://eth.llamarpc.com',
    lpLockerAddress: process.env.LP_LOCKER_ADDRESS || '',
    lpTokenAddress: process.env.LP_TOKEN_ADDRESS || '',
    dexScreenerPairId: process.env.DEXSCREENER_PAIR_ID || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    aiModel: process.env.AI_MODEL || 'gpt-4o-mini',
    privateKey: process.env.PRIVATE_KEY || '',
    maxGasLimit: BigInt(process.env.MAX_GAS_LIMIT || '500000'),
    maxPriorityFee: BigInt(process.env.MAX_PRIORITY_FEE || '2000000000'), // 2 Gwei
    cycleInterval: process.env.CYCLE_INTERVAL || '*/5 * * * *', // Every 5 minutes
    stateUpdateInterval: process.env.STATE_UPDATE_INTERVAL || '0 * * * *', // Every hour
    maxUnlockRatio: parseFloat(process.env.MAX_UNLOCK_RATIO || '0.1'),
    minLockDuration: parseInt(process.env.MIN_LOCK_DURATION || '86400'),
    maxGasPrice: parseInt(process.env.MAX_GAS_PRICE || '100'),
  };
}

// ============================================
// Neural LP Locker Agent Class
// ============================================

class NeuralLPLockerAgent {
  private observer: StateObserver;
  private policyNetwork: AIPolicyNetwork;
  private executionEngine: ExecutionEngine;
  private config: AgentConfig;
  
  // State
  private isRunning: boolean = false;
  private lastState: FusedState | null = null;
  private lastDecision: AIDecision | null = null;
  private cycleCount: number = 0;
  private successfulActions: number = 0;
  private failedActions: number = 0;

  constructor(config: AgentConfig) {
    this.config = config;
    
    // Initialize state observer
    this.observer = new StateObserver({
      rpcUrl: config.rpcUrl,
      lpLockerAddress: config.lpLockerAddress,
      lpTokenAddress: config.lpTokenAddress,
      dexScreenerPairId: config.dexScreenerPairId,
    });

    // Initialize AI policy network
    this.policyNetwork = new AIPolicyNetwork({
      openaiApiKey: config.openaiApiKey,
      model: config.aiModel,
      constraints: {
        maxUnlockRatio: config.maxUnlockRatio,
        minLockDuration: config.minLockDuration,
        maxGasPrice: config.maxGasPrice,
        emergencyThreshold: HealthStatus.Critical,
        cooldownPeriod: 300,
      },
    });

    // Initialize execution engine
    this.executionEngine = new ExecutionEngine({
      rpcUrl: config.rpcUrl,
      lpLockerAddress: config.lpLockerAddress,
      lpTokenAddress: config.lpTokenAddress,
      privateKey: config.privateKey,
      maxGasLimit: config.maxGasLimit,
      maxPriorityFee: config.maxPriorityFee,
    });
  }

  /**
   * Start Agent
   */
  async start(): Promise<void> {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('          EIP-8004 Neural LP Locker Agent Starting');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Wallet: ${this.executionEngine.getWalletAddress()}`);
    console.log(`LP Locker: ${this.config.lpLockerAddress}`);
    console.log(`LP Token: ${this.config.lpTokenAddress}`);
    console.log(`AI Model: ${this.config.aiModel}`);
    console.log(`Cycle Interval: ${this.config.cycleInterval}`);
    console.log('═══════════════════════════════════════════════════════════════');

    this.isRunning = true;

    // Check wallet balance
    const ethBalance = await this.executionEngine.getEthBalance();
    const lpBalance = await this.executionEngine.getLPBalance();
    console.log(`ETH Balance: ${ethBalance / BigInt(1e18)} ETH`);
    console.log(`LP Balance: ${lpBalance} wei`);

    // Execute one cycle immediately
    await this.runCycle();

    // Set up main loop schedule
    cron.schedule(this.config.cycleInterval, async () => {
      if (this.isRunning) {
        await this.runCycle();
      }
    });

    // Set up state sync schedule (lower frequency)
    cron.schedule(this.config.stateUpdateInterval, async () => {
      if (this.isRunning && this.lastState) {
        await this.syncStateToChain();
      }
    });

    console.log('[Agent] Scheduled cycles started');
  }

  /**
   * Stop Agent
   */
  stop(): void {
    console.log('[Agent] Stopping...');
    this.isRunning = false;
    this.printStats();
  }

  /**
   * Run a complete decision cycle
   * Corresponds to complete data flow in architecture:
   * Observation -> Agent Core -> Execution -> Feedback Loop
   */
  async runCycle(): Promise<void> {
    this.cycleCount++;
    const cycleStart = Date.now();
    
    console.log(`\n┌─────────────────────────────────────────────────────────┐`);
    console.log(`│  Cycle #${this.cycleCount} - ${new Date().toISOString()}  │`);
    console.log(`└─────────────────────────────────────────────────────────┘`);

    try {
      // ══════════════════════════════════════════════════════════
      // Phase I: State Observation ($S_t$)
      // ══════════════════════════════════════════════════════════
      console.log('\n[Phase I] Observing state...');
      const state = await this.observer.getFusedState();
      this.lastState = state;

      console.log(`  • Price: $${state.market.price.toFixed(6)}`);
      console.log(`  • 24h Change: ${state.market.price24hChange.toFixed(2)}%`);
      console.log(`  • TVL: $${state.health.tvl.toLocaleString()}`);
      console.log(`  • Health: ${HealthStatus[state.healthStatus]}`);
      console.log(`  • Active Locks: ${state.modular.activeLocks}`);

      // Get active locks list
      const activeLocks = await this.getActiveLocks();

      // ══════════════════════════════════════════════════════════
      // Phase II: AI Decision ($\pi_\theta$)
      // ══════════════════════════════════════════════════════════
      console.log('\n[Phase II] AI analyzing...');
      const decision = await this.policyNetwork.analyzeAndDecide(state, activeLocks);
      this.lastDecision = decision;

      console.log(`  • Action: ${ActionType[decision.action]}`);
      console.log(`  • Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
      console.log(`  • Risk: ${decision.riskAssessment}`);
      console.log(`  • Reasoning: ${decision.reasoning.substring(0, 80)}...`);

      // Check if action should be executed
      if (this.shouldExecute(decision, state)) {
        // ══════════════════════════════════════════════════════════
        // Phase III: Execution ($a_t^*$)
        // ══════════════════════════════════════════════════════════
        console.log('\n[Phase III] Executing action...');
        const result = await this.executionEngine.executeDecision(decision, state);

        if (result.success) {
          this.successfulActions++;
          console.log(`  ✓ Success! TX: ${result.txHash}`);
          console.log(`  • Block: ${result.blockNumber}`);
          console.log(`  • Gas Used: ${result.gasUsed}`);
        } else {
          this.failedActions++;
          console.log(`  ✗ Failed: ${result.error}`);
        }
      } else {
        console.log('\n[Phase III] No execution needed (HOLD or low confidence)');
      }

      // ══════════════════════════════════════════════════════════
      // Phase IV: Feedback Loop ($S_{t+1}$)
      // ══════════════════════════════════════════════════════════
      // State automatically updates in next cycle

    } catch (error) {
      console.error('[Cycle] Error:', error);
      this.failedActions++;
    }

    const cycleDuration = Date.now() - cycleStart;
    console.log(`\n[Cycle] Completed in ${cycleDuration}ms`);
  }

  /**
   * Determine if action should be executed
   */
  private shouldExecute(decision: AIDecision, state: FusedState): boolean {
    // Don't execute HOLD action
    if (decision.reasoning.startsWith('HOLD')) {
      return false;
    }

    // Don't execute with low confidence
    if (decision.confidence < 0.6) {
      console.log(`  [Skip] Confidence too low: ${decision.confidence}`);
      return false;
    }

    // In emergency status, only emergency unlock is allowed
    if (state.healthStatus === HealthStatus.Emergency) {
      if (decision.action !== ActionType.EmergencyUnlock) {
        console.log(`  [Skip] Emergency status - only emergency unlock allowed`);
        return false;
      }
    }

    return true;
  }

  /**
   * Get active locks list
   */
  private async getActiveLocks(): Promise<LockInfo[]> {
    // Simplified implementation - should read from chain
    // Return empty array here, let AI decide based on aggregated data
    return [];
  }

  /**
   * Sync state to chain
   */
  private async syncStateToChain(): Promise<void> {
    if (!this.lastState) return;

    console.log('\n[StateSync] Updating on-chain state...');
    try {
      const result = await this.executionEngine.updateOnChainState(this.lastState);
      if (result.success) {
        console.log(`  ✓ State synced! TX: ${result.txHash}`);
      } else {
        console.log(`  ✗ Sync failed: ${result.error}`);
      }
    } catch (error) {
      console.error('[StateSync] Error:', error);
    }
  }

  /**
   * Print statistics
   */
  private printStats(): void {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                     Agent Statistics');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total Cycles: ${this.cycleCount}`);
    console.log(`Successful Actions: ${this.successfulActions}`);
    console.log(`Failed Actions: ${this.failedActions}`);
    console.log(`Success Rate: ${this.cycleCount > 0 ? ((this.successfulActions / this.cycleCount) * 100).toFixed(1) : 0}%`);
    console.log('═══════════════════════════════════════════════════════════════');
  }

  /**
   * Manual action trigger (for testing)
   */
  async manualAction(action: ActionType, params: any): Promise<ExecutionResult> {
    const state = await this.observer.getFusedState();
    
    const decision: AIDecision = {
      action,
      lockId: params.lockId,
      amount: params.amount ? BigInt(params.amount) : undefined,
      duration: params.duration,
      confidence: 1.0,
      reasoning: 'Manual action triggered',
      constraints: ['Manual override'],
      riskAssessment: 'N/A',
    };

    return await this.executionEngine.executeDecision(decision, state);
  }
}

// ============================================
// Main Entry Point
// ============================================

async function main() {
  // Validate required environment variables
  const requiredEnvVars = [
    'RPC_URL',
    'LP_LOCKER_ADDRESS',
    'LP_TOKEN_ADDRESS',
    'OPENAI_API_KEY',
    'PRIVATE_KEY',
    'DEXSCREENER_PAIR_ID',
  ];

  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    console.error('Please check your .env file');
    process.exit(1);
  }

  // Load config and start Agent
  const config = loadConfig();
  const agent = new NeuralLPLockerAgent(config);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down...');
    agent.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down...');
    agent.stop();
    process.exit(0);
  });

  // Start
  await agent.start();
}

// Execute
main().catch(console.error);

// Export for external use
export { NeuralLPLockerAgent };
