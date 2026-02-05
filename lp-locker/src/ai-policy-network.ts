/**
 * AI Policy Network Module
 * Corresponds to "II. EIP-8004 Neural Locking Agent ($\pi_\theta$)" in architecture
 * 
 * Core components:
 * - EIP-8004 Verification Layer
 * - Deep Policy Network (RNN+Attention simulation)
 * - Constraint Optimization Module
 */

import OpenAI from 'openai';
import { FusedState, HealthStatus } from './state-observer';

// ============================================
// Type Definitions
// ============================================

/**
 * AI action type (synced with contract)
 */
export enum ActionType {
  Lock = 0,
  Unlock = 1,
  ExtendLock = 2,
  ModifyAmount = 3,
  EmergencyUnlock = 4
}

/**
 * AI decision output
 * Corresponds to "Optimal Action $a_t^*$" in architecture
 */
export interface AIDecision {
  action: ActionType;
  lockId?: number;          // Target lock ID (if applicable)
  amount?: bigint;          // Operation amount
  duration?: number;        // Duration (seconds)
  confidence: number;       // Confidence (0-1)
  reasoning: string;        // Decision reasoning
  constraints: string[];    // Met constraints
  riskAssessment: string;   // Risk assessment
}

/**
 * Constraint configuration
 * Corresponds to "Constraint Optimization Module" in architecture
 */
export interface ConstraintConfig {
  maxUnlockRatio: number;     // Maximum unlock ratio per action
  minLockDuration: number;    // Minimum lock duration
  maxGasPrice: number;        // Maximum acceptable gas price
  emergencyThreshold: HealthStatus; // Emergency action threshold
  cooldownPeriod: number;     // Action cooldown period (seconds)
}

/**
 * Policy network configuration
 */
export interface PolicyNetworkConfig {
  openaiApiKey: string;
  model: string;
  constraints: ConstraintConfig;
}

// ============================================
// Default Constraints
// ============================================

const DEFAULT_CONSTRAINTS: ConstraintConfig = {
  maxUnlockRatio: 0.1,        // Max 10% unlock per action
  minLockDuration: 86400,     // Min 1 day lock
  maxGasPrice: 100,           // Max 100 Gwei
  emergencyThreshold: HealthStatus.Critical,
  cooldownPeriod: 300         // 5 minute cooldown
};

// ============================================
// AI Policy Network Class
// ============================================

export class AIPolicyNetwork {
  private openai: OpenAI;
  private config: PolicyNetworkConfig;
  private lastActionTime: number = 0;

  /**
   * System prompt
   * Defines AI Agent role and decision framework
   */
  private static SYSTEM_PROMPT = `You are an advanced AI agent managing LP (Liquidity Provider) token locks for the EIP-8004 protocol. Your role is to make optimal decisions about locking and unlocking LP tokens based on market conditions.

## Your Capabilities:
1. **Lock** - Lock LP tokens with specific parameters
2. **Unlock** - Release locked LP tokens
3. **ExtendLock** - Extend the lock duration
4. **ModifyAmount** - Adjust locked amounts
5. **EmergencyUnlock** - Force unlock in critical situations

## Decision Framework:

### Market Analysis
- Price trends (bullish/bearish/sideways)
- Volume patterns (increasing/decreasing)
- Liquidity depth changes
- Buy/sell pressure ratio

### Risk Assessment
- Volatility levels
- Concentration risk
- Smart money movements
- Protocol health status

### Constraint Compliance
- Maximum unlock ratio per action
- Minimum lock duration requirements
- Gas price limits
- Cooldown periods between actions

## Output Format:
You must respond with a JSON object containing:
{
  "action": "LOCK|UNLOCK|EXTEND_LOCK|MODIFY_AMOUNT|EMERGENCY_UNLOCK|HOLD",
  "lockId": number or null,
  "amount": string (in wei) or null,
  "duration": number (seconds) or null,
  "confidence": number (0-1),
  "reasoning": "detailed explanation",
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL"
}

## Important Rules:
1. Prefer HOLD when uncertain - capital preservation is key
2. Never unlock more than the configured max ratio at once
3. Always consider gas costs vs. potential gains
4. Emergency unlocks only when health status is Critical or Emergency
5. Explain your reasoning clearly for audit purposes`;

  constructor(config: PolicyNetworkConfig) {
    this.config = {
      ...config,
      constraints: { ...DEFAULT_CONSTRAINTS, ...config.constraints }
    };
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
  }

  /**
   * Analyze state and generate decision
   * Corresponds to "Deep Policy Network (RNN+Attention)" + "Constraint Optimization Module"
   * 
   * @param state Fused market state
   * @param activeLocks Current active lock records
   */
  async analyzeAndDecide(
    state: FusedState,
    activeLocks: LockInfo[]
  ): Promise<AIDecision> {
    console.log('[PolicyNetwork] Analyzing state and making decision...');

    // Check cooldown period
    const now = Date.now();
    if (now - this.lastActionTime < this.config.constraints.cooldownPeriod * 1000) {
      console.log('[PolicyNetwork] In cooldown period, returning HOLD');
      return this.createHoldDecision('Cooldown period active');
    }

    // Check gas price
    if (state.health.gasPrice > this.config.constraints.maxGasPrice) {
      console.log('[PolicyNetwork] Gas price too high, returning HOLD');
      return this.createHoldDecision(`Gas price (${state.health.gasPrice} Gwei) exceeds limit`);
    }

    // Build context prompt
    const userPrompt = this.buildAnalysisPrompt(state, activeLocks);

    try {
      // Call AI model
      const response = await this.openai.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: AIPolicyNetwork.SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Low temperature for consistency
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AI');
      }

      // Parse AI response
      const aiResponse = JSON.parse(content);
      
      // Apply constraint optimization
      const optimizedDecision = this.applyConstraints(aiResponse, state, activeLocks);
      
      // Update last action time
      if (optimizedDecision.action !== ActionType.Lock) {
        this.lastActionTime = now;
      }

      console.log('[PolicyNetwork] Decision made:', {
        action: ActionType[optimizedDecision.action],
        confidence: optimizedDecision.confidence,
        reasoning: optimizedDecision.reasoning.substring(0, 100) + '...'
      });

      return optimizedDecision;
    } catch (error) {
      console.error('[PolicyNetwork] Error in AI analysis:', error);
      return this.createHoldDecision('AI analysis error, defaulting to HOLD');
    }
  }

  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(state: FusedState, activeLocks: LockInfo[]): string {
    return `## Current Market State (${new Date(state.timestamp).toISOString()})

### Market Data ($m_t$)
- Price: $${state.market.price.toFixed(6)}
- 24h Change: ${state.market.price24hChange.toFixed(2)}%
- 24h Volume: $${state.market.volume24h.toLocaleString()}
- Liquidity: $${state.market.liquidity.toLocaleString()}
- Buy Pressure: ${(state.market.buyPressure * 100).toFixed(1)}%
- Sell Pressure: ${(state.market.sellPressure * 100).toFixed(1)}%

### Protocol Signals ($e_t$)
- Total Locked: ${state.modular.totalLocked.toString()} wei
- Active Locks: ${state.modular.activeLocks}
- Avg Lock Duration: ${(state.modular.avgLockDuration / 86400).toFixed(1)} days
- Flexible/TimeLocked/Conditional/Permanent Ratio: ${(state.modular.flexibleRatio * 100).toFixed(0)}%/${(state.modular.timeLockedRatio * 100).toFixed(0)}%/${(state.modular.conditionalRatio * 100).toFixed(0)}%/${(state.modular.permanentRatio * 100).toFixed(0)}%
- Recent Unlocks (24h): ${state.modular.recentUnlocks}
- Pending Unlocks (7d): ${state.modular.pendingUnlocks}

### Health Metrics ($r_t$)
- TVL: $${state.health.tvl.toLocaleString()}
- Volatility: ${(state.health.volatility * 100).toFixed(2)}%
- Concentration Risk: ${(state.health.concentrationRisk * 100).toFixed(1)}%
- Smart Money Flow: ${state.health.smartMoneyFlow.toFixed(2)}
- Whale Activity: ${state.health.whaleActivity.toFixed(2)}
- Gas Price: ${state.health.gasPrice.toFixed(0)} Gwei
- Network Congestion: ${(state.health.networkCongestion * 100).toFixed(0)}%
- **Health Status: ${HealthStatus[state.healthStatus]}**

### Active Locks
${activeLocks.length > 0 ? activeLocks.map(lock => 
  `- Lock #${lock.id}: ${lock.amount} tokens, Type: ${lock.type}, Unlock: ${lock.unlockTime ? new Date(lock.unlockTime * 1000).toISOString() : 'N/A'}`
).join('\n') : 'No active locks'}

### Constraints
- Max Unlock Ratio: ${this.config.constraints.maxUnlockRatio * 100}%
- Min Lock Duration: ${this.config.constraints.minLockDuration / 86400} days
- Max Gas Price: ${this.config.constraints.maxGasPrice} Gwei
- Emergency Threshold: ${HealthStatus[this.config.constraints.emergencyThreshold]}

### Task
Analyze the current market state and decide on the optimal action. Consider:
1. Is this a good time to lock more LP tokens?
2. Should any existing locks be extended or unlocked?
3. Is an emergency action needed based on health status?
4. What are the risks and potential rewards?

Provide your decision in the specified JSON format.`;
  }

  /**
   * Apply constraint optimization
   * Corresponds to "Constraint Optimization Module" in architecture
   */
  private applyConstraints(
    aiResponse: any,
    state: FusedState,
    activeLocks: LockInfo[]
  ): AIDecision {
    const constraints = this.config.constraints;
    let action: ActionType;
    let adjustedAmount = aiResponse.amount ? BigInt(aiResponse.amount) : undefined;
    const constraintsMet: string[] = [];

    // Parse action type
    switch (aiResponse.action?.toUpperCase()) {
      case 'LOCK': action = ActionType.Lock; break;
      case 'UNLOCK': action = ActionType.Unlock; break;
      case 'EXTEND_LOCK': action = ActionType.ExtendLock; break;
      case 'MODIFY_AMOUNT': action = ActionType.ModifyAmount; break;
      case 'EMERGENCY_UNLOCK': action = ActionType.EmergencyUnlock; break;
      default: action = ActionType.Lock; // HOLD maps to no action
    }

    // Constraint 1: Maximum unlock ratio
    if (action === ActionType.Unlock && adjustedAmount) {
      const totalLocked = state.modular.totalLocked;
      const maxUnlock = (totalLocked * BigInt(Math.floor(constraints.maxUnlockRatio * 10000))) / 10000n;
      
      if (adjustedAmount > maxUnlock) {
        adjustedAmount = maxUnlock;
        constraintsMet.push(`Unlock amount capped to ${constraints.maxUnlockRatio * 100}% of total`);
      } else {
        constraintsMet.push('Unlock ratio within limits');
      }
    }

    // Constraint 2: Emergency unlock conditions
    if (action === ActionType.EmergencyUnlock) {
      if (state.healthStatus < constraints.emergencyThreshold) {
        // Health status doesn't meet emergency conditions, downgrade to regular unlock
        action = ActionType.Unlock;
        constraintsMet.push('Emergency downgraded: health status not critical');
      } else {
        constraintsMet.push('Emergency unlock authorized: critical health status');
      }
    }

    // Constraint 3: Minimum lock duration
    if (action === ActionType.Lock || action === ActionType.ExtendLock) {
      const duration = aiResponse.duration || 0;
      if (duration < constraints.minLockDuration) {
        constraintsMet.push(`Lock duration enforced to minimum ${constraints.minLockDuration / 86400} days`);
      } else {
        constraintsMet.push('Lock duration meets minimum requirement');
      }
    }

    // Constraint 4: Gas price check (already handled above)
    constraintsMet.push(`Gas price ${state.health.gasPrice.toFixed(0)} Gwei within limit`);

    return {
      action,
      lockId: aiResponse.lockId,
      amount: adjustedAmount,
      duration: Math.max(aiResponse.duration || 0, constraints.minLockDuration),
      confidence: Math.min(aiResponse.confidence || 0.5, 1),
      reasoning: aiResponse.reasoning || 'No reasoning provided',
      constraints: constraintsMet,
      riskAssessment: aiResponse.riskLevel || 'MEDIUM'
    };
  }

  /**
   * Create HOLD decision
   */
  private createHoldDecision(reason: string): AIDecision {
    return {
      action: ActionType.Lock, // Actually no action
      confidence: 1.0,
      reasoning: `HOLD: ${reason}`,
      constraints: ['Automatic HOLD decision'],
      riskAssessment: 'LOW'
    };
  }

  /**
   * Update constraint configuration
   */
  updateConstraints(newConstraints: Partial<ConstraintConfig>) {
    this.config.constraints = { ...this.config.constraints, ...newConstraints };
  }
}

// ============================================
// Supporting Types
// ============================================

export interface LockInfo {
  id: number;
  amount: string;
  type: string;
  unlockTime?: number;
  owner: string;
}
