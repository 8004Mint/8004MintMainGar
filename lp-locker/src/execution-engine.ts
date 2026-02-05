/**
 * Execution Engine Module
 * Corresponds to "III. Action Execution & State Transition" in architecture
 * 
 * Core components:
 * - EIP-8004 TX Generator
 * - Blockchain Entry Point
 * - Smart Liquidity Pool interaction
 * - EIP-8004 Modular Registry updates
 */

import { ethers, Wallet, Contract, TransactionReceipt } from 'ethers';
import { AIDecision, ActionType } from './ai-policy-network';
import { FusedState } from './state-observer';

// ============================================
// Type Definitions
// ============================================

/**
 * Transaction execution result
 */
export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  error?: string;
  stateProof?: string;      // State update proof
}

/**
 * AI Action structure (synced with contract)
 */
interface AIActionStruct {
  lockId: bigint;
  actionType: number;
  amount: bigint;
  stateHash: string;
  expiry: bigint;
}

/**
 * Execution engine configuration
 */
export interface ExecutionEngineConfig {
  rpcUrl: string;
  lpLockerAddress: string;
  lpTokenAddress: string;
  privateKey: string;
  maxGasLimit: bigint;
  maxPriorityFee: bigint;
}

// ============================================
// Contract ABIs
// ============================================

const LP_LOCKER_ABI = [
  // Lock function
  'function lock(address lpToken, uint256 amount, uint8 lockType, uint256 duration, bytes32 conditionHash) returns (uint256)',
  
  // Unlock function
  'function unlock(uint256 lockId)',
  
  // AI action execution
  'function executeAIAction((uint256 lockId, uint8 actionType, uint256 amount, bytes32 stateHash, uint256 expiry) action, bytes signature)',
  
  // Market state update
  'function updateMarketState(uint256 tvl, uint256 volatility, uint256 liquidityDepth, uint256 priceImpact, uint8 health, bytes signature)',
  
  // Query functions
  'function lockRecords(uint256) view returns (address lpToken, uint256 amount, uint256 lockTime, uint256 unlockTime, uint8 lockType, address owner, bool isLocked, bytes32 conditionHash)',
  'function aiNonces(address) view returns (uint256)',
  'function DOMAIN_SEPARATOR() view returns (bytes32)',
  
  // Events
  'event LPLocked(uint256 indexed lockId, address indexed owner, address indexed lpToken, uint256 amount, uint8 lockType, uint256 unlockTime)',
  'event LPUnlocked(uint256 indexed lockId, address indexed owner, uint256 amount, uint256 penalty)',
  'event AIActionExecuted(uint256 indexed lockId, uint8 actionType, bytes32 stateHash)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
];

// ============================================
// EIP-712 Type Definitions
// ============================================

const EIP712_DOMAIN = {
  name: 'EIP8004LPLocker',
  version: '1',
};

const AI_ACTION_TYPES = {
  AIAction: [
    { name: 'lockId', type: 'uint256' },
    { name: 'actionType', type: 'uint8' },
    { name: 'amount', type: 'uint256' },
    { name: 'stateHash', type: 'bytes32' },
    { name: 'expiry', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
};

// ============================================
// Execution Engine Class
// ============================================

export class ExecutionEngine {
  private provider: ethers.JsonRpcProvider;
  private wallet: Wallet;
  private lpLocker: Contract;
  private lpToken: Contract;
  private config: ExecutionEngineConfig;

  constructor(config: ExecutionEngineConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new Wallet(config.privateKey, this.provider);
    this.lpLocker = new Contract(config.lpLockerAddress, LP_LOCKER_ABI, this.wallet);
    this.lpToken = new Contract(config.lpTokenAddress, ERC20_ABI, this.wallet);
  }

  /**
   * Execute AI decision
   * Corresponds to "EIP-8004 TX Generator" -> "Blockchain Entry Point"
   */
  async executeDecision(
    decision: AIDecision,
    state: FusedState
  ): Promise<ExecutionResult> {
    console.log('[ExecutionEngine] Executing decision:', ActionType[decision.action]);

    try {
      // Route to appropriate handler based on action type
      switch (decision.action) {
        case ActionType.Lock:
          return await this.executeLock(decision, state);
        
        case ActionType.Unlock:
          return await this.executeUnlock(decision, state);
        
        case ActionType.ExtendLock:
          return await this.executeExtendLock(decision, state);
        
        case ActionType.EmergencyUnlock:
          return await this.executeEmergencyUnlock(decision, state);
        
        default:
          return { success: true, stateProof: 'HOLD - No action taken' };
      }
    } catch (error: any) {
      console.error('[ExecutionEngine] Execution error:', error);
      return {
        success: false,
        error: error.message || 'Unknown execution error'
      };
    }
  }

  /**
   * Execute lock operation
   */
  private async executeLock(
    decision: AIDecision,
    state: FusedState
  ): Promise<ExecutionResult> {
    if (!decision.amount || decision.amount <= 0n) {
      return { success: false, error: 'Invalid lock amount' };
    }

    // Check balance
    const balance = await this.lpToken.balanceOf(this.wallet.address);
    if (balance < decision.amount) {
      return { success: false, error: 'Insufficient LP token balance' };
    }

    // Check allowance
    const allowance = await this.lpToken.allowance(
      this.wallet.address,
      this.config.lpLockerAddress
    );
    
    if (allowance < decision.amount) {
      console.log('[ExecutionEngine] Approving LP token...');
      const approveTx = await this.lpToken.approve(
        this.config.lpLockerAddress,
        ethers.MaxUint256
      );
      await approveTx.wait();
    }

    // Execute lock
    console.log('[ExecutionEngine] Locking LP tokens...');
    const tx = await this.lpLocker.lock(
      this.config.lpTokenAddress,
      decision.amount,
      1, // TimeLocked
      decision.duration || 86400 * 30, // Default 30 days
      ethers.ZeroHash, // No condition hash
      await this.getGasOptions()
    );

    const receipt = await tx.wait();
    
    return this.parseReceipt(receipt, state);
  }

  /**
   * Execute unlock operation (via AI Action)
   */
  private async executeUnlock(
    decision: AIDecision,
    state: FusedState
  ): Promise<ExecutionResult> {
    if (decision.lockId === undefined) {
      return { success: false, error: 'Lock ID required for unlock' };
    }

    // Generate AI Action signature
    const action: AIActionStruct = {
      lockId: BigInt(decision.lockId),
      actionType: ActionType.Unlock,
      amount: decision.amount || 0n,
      stateHash: state.stateHash,
      expiry: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour expiry
    };

    const signature = await this.signAIAction(action);

    // Execute AI action
    console.log('[ExecutionEngine] Executing AI unlock...');
    const tx = await this.lpLocker.executeAIAction(
      action,
      signature,
      await this.getGasOptions()
    );

    const receipt = await tx.wait();
    
    return this.parseReceipt(receipt, state);
  }

  /**
   * Execute extend lock operation
   */
  private async executeExtendLock(
    decision: AIDecision,
    state: FusedState
  ): Promise<ExecutionResult> {
    if (decision.lockId === undefined) {
      return { success: false, error: 'Lock ID required for extend' };
    }

    const action: AIActionStruct = {
      lockId: BigInt(decision.lockId),
      actionType: ActionType.ExtendLock,
      amount: BigInt(decision.duration || 86400 * 30), // Extension duration as amount
      stateHash: state.stateHash,
      expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
    };

    const signature = await this.signAIAction(action);

    console.log('[ExecutionEngine] Executing AI extend lock...');
    const tx = await this.lpLocker.executeAIAction(
      action,
      signature,
      await this.getGasOptions()
    );

    const receipt = await tx.wait();
    
    return this.parseReceipt(receipt, state);
  }

  /**
   * Execute emergency unlock operation
   */
  private async executeEmergencyUnlock(
    decision: AIDecision,
    state: FusedState
  ): Promise<ExecutionResult> {
    if (decision.lockId === undefined) {
      return { success: false, error: 'Lock ID required for emergency unlock' };
    }

    const action: AIActionStruct = {
      lockId: BigInt(decision.lockId),
      actionType: ActionType.EmergencyUnlock,
      amount: 0n,
      stateHash: state.stateHash,
      expiry: BigInt(Math.floor(Date.now() / 1000) + 300), // 5 minute expiry (emergency)
    };

    const signature = await this.signAIAction(action);

    console.log('[ExecutionEngine] Executing emergency unlock...');
    const tx = await this.lpLocker.executeAIAction(
      action,
      signature,
      await this.getGasOptions()
    );

    const receipt = await tx.wait();
    
    return this.parseReceipt(receipt, state);
  }

  /**
   * Update on-chain market state
   * Corresponds to "State Update Proof" -> "EIP-8004 Modular Registry"
   */
  async updateOnChainState(state: FusedState): Promise<ExecutionResult> {
    console.log('[ExecutionEngine] Updating on-chain market state...');

    try {
      // Generate state update signature
      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ['uint256', 'uint256', 'uint256', 'uint256', 'uint8', 'uint256'],
          [
            BigInt(Math.floor(state.health.tvl * 1e8)),
            BigInt(Math.floor(state.health.volatility * 10000)),
            BigInt(Math.floor(state.market.liquidity * 1e8)),
            BigInt(Math.floor((state.market.volume24h / state.market.liquidity) * 10000)),
            state.healthStatus,
            BigInt(Math.floor(Date.now() / 3600000)) // Round to hour
          ]
        )
      );

      const signature = await this.wallet.signMessage(ethers.getBytes(messageHash));

      const tx = await this.lpLocker.updateMarketState(
        BigInt(Math.floor(state.health.tvl * 1e8)),
        BigInt(Math.floor(state.health.volatility * 10000)),
        BigInt(Math.floor(state.market.liquidity * 1e8)),
        BigInt(Math.floor((state.market.volume24h / state.market.liquidity) * 10000)),
        state.healthStatus,
        signature,
        await this.getGasOptions()
      );

      const receipt = await tx.wait();
      
      return {
        success: true,
        txHash: receipt?.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed,
        stateProof: state.stateHash
      };
    } catch (error: any) {
      console.error('[ExecutionEngine] State update error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sign AI Action (EIP-712)
   */
  private async signAIAction(action: AIActionStruct): Promise<string> {
    const nonce = await this.lpLocker.aiNonces(this.wallet.address);
    const chainId = (await this.provider.getNetwork()).chainId;

    const domain = {
      ...EIP712_DOMAIN,
      chainId: Number(chainId),
      verifyingContract: this.config.lpLockerAddress,
    };

    const value = {
      lockId: action.lockId,
      actionType: action.actionType,
      amount: action.amount,
      stateHash: action.stateHash,
      expiry: action.expiry,
      nonce: nonce,
    };

    return await this.wallet.signTypedData(domain, AI_ACTION_TYPES, value);
  }

  /**
   * Get gas options
   */
  private async getGasOptions(): Promise<{ gasLimit: bigint; maxPriorityFeePerGas: bigint }> {
    return {
      gasLimit: this.config.maxGasLimit,
      maxPriorityFeePerGas: this.config.maxPriorityFee,
    };
  }

  /**
   * Parse transaction receipt
   */
  private parseReceipt(
    receipt: TransactionReceipt | null,
    state: FusedState
  ): ExecutionResult {
    if (!receipt) {
      return { success: false, error: 'Transaction failed - no receipt' };
    }

    return {
      success: receipt.status === 1,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      stateProof: state.stateHash,
    };
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Get wallet ETH balance
   */
  async getEthBalance(): Promise<bigint> {
    return await this.provider.getBalance(this.wallet.address);
  }

  /**
   * Get LP Token balance
   */
  async getLPBalance(): Promise<bigint> {
    return await this.lpToken.balanceOf(this.wallet.address);
  }
}
