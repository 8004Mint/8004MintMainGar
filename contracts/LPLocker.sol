// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title EIP8004LPLocker
 * @notice AI-powered dynamic LP locking contract
 * @dev Implements modular locking mechanism with AI Agent support for dynamic parameter adjustment based on market state
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    EIP-8004 LP Locker                           │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
 * │  │ Modular  │───▶│  Lock    │───▶│ Verify   │                  │
 * │  │ Registry │    │  Engine  │    │  Layer   │                  │
 * │  └──────────┘    └──────────┘    └──────────┘                  │
 * └─────────────────────────────────────────────────────────────────┘
 */
contract EIP8004LPLocker is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ============================================
    // Type Definitions
    // ============================================

    /**
     * @notice Lock type enumeration
     * @dev Corresponds to "Modular Locks" concept in architecture
     */
    enum LockType {
        Flexible,       // Flexible lock, can unlock anytime (with penalty)
        TimeLocked,     // Time-based lock, unlockable after expiry
        ConditionalAI,  // AI conditional lock, unlockable when conditions met
        Permanent       // Permanent lock
    }

    /**
     * @notice Protocol health status enumeration
     * @dev Corresponds to "Protocol Health Metrics" in architecture
     */
    enum HealthStatus {
        Healthy,        // Normal operation
        Warning,        // Elevated risk
        Critical,       // High risk
        Emergency       // Severe risk - triggers pause
    }

    /**
     * @notice LP lock record structure
     */
    struct LockRecord {
        address lpToken;        // LP Token address
        uint256 amount;         // Locked amount
        uint256 lockTime;       // Lock timestamp
        uint256 unlockTime;     // Unlock timestamp (for TimeLocked type)
        LockType lockType;      // Lock type
        address owner;          // Lock owner
        bool isLocked;          // Whether currently locked
        bytes32 conditionHash;  // AI condition hash (for ConditionalAI type)
    }

    /**
     * @notice Market state snapshot
     * @dev Output of "State Tensor Aggregator" in architecture
     */
    struct MarketState {
        uint256 tvl;            // Total value locked
        uint256 volatility;     // Volatility (basis points, 10000 = 100%)
        uint256 liquidityDepth; // Liquidity depth
        uint256 priceImpact;    // Price impact
        uint256 timestamp;      // Snapshot timestamp
        HealthStatus health;    // Health status
    }

    /**
     * @notice AI Agent action structure
     * @dev Represents "Optimal Action $a_t^*$" in architecture
     */
    struct AIAction {
        uint256 lockId;         // Lock record ID
        ActionType actionType;  // Action type
        uint256 amount;         // Operation amount
        bytes32 stateHash;      // State hash (for verification)
        uint256 expiry;         // Signature expiry timestamp
    }

    enum ActionType {
        Lock,           // Lock LP tokens
        Unlock,         // Unlock LP tokens
        ExtendLock,     // Extend lock period
        ModifyAmount,   // Modify locked amount
        EmergencyUnlock // Emergency unlock
    }

    // ============================================
    // State Variables
    // ============================================

    /// @notice AI Agent signer address
    address public aiSigner;

    /// @notice Current lock ID counter
    uint256 public lockIdCounter;

    /// @notice Latest market state
    MarketState public latestMarketState;

    /// @notice Lock records mapping
    mapping(uint256 => LockRecord) public lockRecords;

    /// @notice User's lock ID list
    mapping(address => uint256[]) public userLocks;

    /// @notice Supported LP token whitelist
    mapping(address => bool) public supportedLPTokens;

    /// @notice Used action signatures (replay protection)
    mapping(bytes32 => bool) public usedSignatures;

    /// @notice Module registry: condition type => verifier contract address
    mapping(bytes32 => address) public conditionVerifiers;

    /// @notice Early unlock penalty ratio (basis points, 10000 = 100%)
    uint256 public earlyUnlockPenalty = 1000; // 10%

    /// @notice Penalty receiver address
    address public penaltyReceiver;

    /// @notice AI action nonce (replay protection)
    mapping(address => uint256) public aiNonces;

    // ============================================
    // Constants
    // ============================================

    uint256 public constant PRECISION = 10000;
    uint256 public constant MIN_LOCK_DURATION = 1 days;
    uint256 public constant MAX_LOCK_DURATION = 365 days * 4; // 4 years

    // EIP-712 Domain
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    
    bytes32 public constant ACTION_TYPEHASH = keccak256(
        "AIAction(uint256 lockId,uint8 actionType,uint256 amount,bytes32 stateHash,uint256 expiry,uint256 nonce)"
    );

    bytes32 public immutable DOMAIN_SEPARATOR;

    // ============================================
    // Events
    // ============================================

    event LPLocked(
        uint256 indexed lockId,
        address indexed owner,
        address indexed lpToken,
        uint256 amount,
        LockType lockType,
        uint256 unlockTime
    );

    event LPUnlocked(
        uint256 indexed lockId,
        address indexed owner,
        uint256 amount,
        uint256 penalty
    );

    event LockExtended(
        uint256 indexed lockId,
        uint256 oldUnlockTime,
        uint256 newUnlockTime
    );

    event MarketStateUpdated(
        uint256 tvl,
        uint256 volatility,
        HealthStatus health,
        uint256 timestamp
    );

    event AIActionExecuted(
        uint256 indexed lockId,
        ActionType actionType,
        bytes32 stateHash
    );

    event ConditionVerifierRegistered(
        bytes32 indexed conditionType,
        address verifier
    );

    event EmergencyUnlock(
        uint256 indexed lockId,
        address indexed triggeredBy,
        string reason
    );

    // ============================================
    // Errors
    // ============================================

    error InvalidLPToken();
    error InvalidAmount();
    error InvalidLockType();
    error InvalidDuration();
    error LockNotFound();
    error NotLockOwner();
    error LockStillActive();
    error AlreadyUnlocked();
    error InvalidSignature();
    error SignatureExpired();
    error SignatureUsed();
    error ConditionNotMet();
    error InvalidHealthStatus();
    error UnauthorizedAction();

    // ============================================
    // Constructor
    // ============================================

    constructor(
        address _aiSigner,
        address _penaltyReceiver
    ) Ownable(msg.sender) {
        require(_aiSigner != address(0), "Invalid signer");
        require(_penaltyReceiver != address(0), "Invalid penalty receiver");
        
        aiSigner = _aiSigner;
        penaltyReceiver = _penaltyReceiver;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256("EIP8004LPLocker"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    // ============================================
    // External Functions: Locking
    // ============================================

    /**
     * @notice Lock LP Tokens
     * @param lpToken LP Token address
     * @param amount Amount to lock
     * @param lockType Lock type
     * @param duration Lock duration (only for TimeLocked type)
     * @param conditionHash AI condition hash (only for ConditionalAI type)
     */
    function lock(
        address lpToken,
        uint256 amount,
        LockType lockType,
        uint256 duration,
        bytes32 conditionHash
    ) external nonReentrant whenNotPaused returns (uint256 lockId) {
        // Validate LP Token
        if (!supportedLPTokens[lpToken]) revert InvalidLPToken();
        if (amount == 0) revert InvalidAmount();

        // Calculate unlock time
        uint256 unlockTime;
        if (lockType == LockType.TimeLocked) {
            if (duration < MIN_LOCK_DURATION || duration > MAX_LOCK_DURATION) {
                revert InvalidDuration();
            }
            unlockTime = block.timestamp + duration;
        } else if (lockType == LockType.Permanent) {
            unlockTime = type(uint256).max;
        }

        // Transfer LP Token
        IERC20(lpToken).safeTransferFrom(msg.sender, address(this), amount);

        // Create lock record
        lockId = lockIdCounter++;
        lockRecords[lockId] = LockRecord({
            lpToken: lpToken,
            amount: amount,
            lockTime: block.timestamp,
            unlockTime: unlockTime,
            lockType: lockType,
            owner: msg.sender,
            isLocked: true,
            conditionHash: conditionHash
        });

        userLocks[msg.sender].push(lockId);

        emit LPLocked(lockId, msg.sender, lpToken, amount, lockType, unlockTime);
    }

    /**
     * @notice Unlock LP Token (regular user)
     * @param lockId Lock record ID
     */
    function unlock(uint256 lockId) external nonReentrant {
        LockRecord storage record = lockRecords[lockId];
        
        if (record.owner == address(0)) revert LockNotFound();
        if (record.owner != msg.sender) revert NotLockOwner();
        if (!record.isLocked) revert AlreadyUnlocked();

        uint256 penalty = 0;
        
        // Check lock type and unlock conditions
        if (record.lockType == LockType.Permanent) {
            revert LockStillActive();
        } else if (record.lockType == LockType.TimeLocked) {
            if (block.timestamp < record.unlockTime) {
                // Early unlock - apply penalty
                penalty = (record.amount * earlyUnlockPenalty) / PRECISION;
            }
        } else if (record.lockType == LockType.ConditionalAI) {
            // AI conditional lock requires AI Action to unlock
            revert LockStillActive();
        }
        // Flexible type can unlock anytime

        _executeUnlock(lockId, penalty);
    }

    /**
     * @notice Execute AI Agent action
     * @dev Corresponds to "EIP-8004 TX Generator" and "Execution Interface" in architecture
     * @param action AI action parameters
     * @param signature AI Agent signature
     */
    function executeAIAction(
        AIAction calldata action,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        // Verify signature
        _verifyAISignature(action, signature);

        // Execute based on action type
        if (action.actionType == ActionType.Lock) {
            _aiLock(action);
        } else if (action.actionType == ActionType.Unlock) {
            _aiUnlock(action);
        } else if (action.actionType == ActionType.ExtendLock) {
            _aiExtendLock(action);
        } else if (action.actionType == ActionType.EmergencyUnlock) {
            _aiEmergencyUnlock(action);
        }

        emit AIActionExecuted(action.lockId, action.actionType, action.stateHash);
    }

    // ============================================
    // External Functions: State Updates
    // ============================================

    /**
     * @notice Update market state
     * @dev Corresponds to "State Tensor Aggregator" functionality in architecture
     * @param tvl Total value locked
     * @param volatility Volatility
     * @param liquidityDepth Liquidity depth
     * @param priceImpact Price impact
     * @param health Health status
     * @param signature AI Agent signature
     */
    function updateMarketState(
        uint256 tvl,
        uint256 volatility,
        uint256 liquidityDepth,
        uint256 priceImpact,
        HealthStatus health,
        bytes calldata signature
    ) external {
        // Verify signature (simplified version, should use EIP-712 in production)
        bytes32 messageHash = keccak256(
            abi.encodePacked(tvl, volatility, liquidityDepth, priceImpact, uint8(health), block.timestamp / 1 hours)
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);
        
        if (signer != aiSigner) revert InvalidSignature();

        latestMarketState = MarketState({
            tvl: tvl,
            volatility: volatility,
            liquidityDepth: liquidityDepth,
            priceImpact: priceImpact,
            timestamp: block.timestamp,
            health: health
        });

        emit MarketStateUpdated(tvl, volatility, health, block.timestamp);

        // Auto-pause if health status is Emergency
        if (health == HealthStatus.Emergency) {
            _pause();
        }
    }

    // ============================================
    // External Functions: Admin
    // ============================================

    /**
     * @notice Add supported LP Token
     */
    function addSupportedLPToken(address lpToken) external onlyOwner {
        supportedLPTokens[lpToken] = true;
    }

    /**
     * @notice Remove supported LP Token
     */
    function removeSupportedLPToken(address lpToken) external onlyOwner {
        supportedLPTokens[lpToken] = false;
    }

    /**
     * @notice Register condition verifier
     * @dev Corresponds to "EIP-8004 Modular Registry" in architecture
     */
    function registerConditionVerifier(
        bytes32 conditionType,
        address verifier
    ) external onlyOwner {
        conditionVerifiers[conditionType] = verifier;
        emit ConditionVerifierRegistered(conditionType, verifier);
    }

    /**
     * @notice Update AI Signer
     */
    function setAISigner(address _aiSigner) external onlyOwner {
        require(_aiSigner != address(0), "Invalid signer");
        aiSigner = _aiSigner;
    }

    /**
     * @notice Update penalty ratio
     */
    function setEarlyUnlockPenalty(uint256 _penalty) external onlyOwner {
        require(_penalty <= 5000, "Penalty too high"); // Max 50%
        earlyUnlockPenalty = _penalty;
    }

    /**
     * @notice Pause/Unpause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ============================================
    // View Functions
    // ============================================

    /**
     * @notice Get all lock records for a user
     */
    function getUserLocks(address user) external view returns (LockRecord[] memory) {
        uint256[] memory lockIds = userLocks[user];
        LockRecord[] memory records = new LockRecord[](lockIds.length);
        
        for (uint256 i = 0; i < lockIds.length; i++) {
            records[i] = lockRecords[lockIds[i]];
        }
        
        return records;
    }

    /**
     * @notice Get lock record details
     */
    function getLockRecord(uint256 lockId) external view returns (LockRecord memory) {
        return lockRecords[lockId];
    }

    /**
     * @notice Check if lock can be unlocked
     */
    function canUnlock(uint256 lockId) external view returns (bool, string memory) {
        LockRecord storage record = lockRecords[lockId];
        
        if (!record.isLocked) {
            return (false, "Already unlocked");
        }
        
        if (record.lockType == LockType.Permanent) {
            return (false, "Permanent lock");
        }
        
        if (record.lockType == LockType.TimeLocked) {
            if (block.timestamp >= record.unlockTime) {
                return (true, "Ready to unlock");
            } else {
                return (true, "Early unlock with penalty");
            }
        }
        
        if (record.lockType == LockType.ConditionalAI) {
            return (false, "Requires AI action");
        }
        
        return (true, "Flexible - can unlock anytime");
    }

    /**
     * @notice Calculate early unlock penalty
     */
    function calculatePenalty(uint256 lockId) external view returns (uint256) {
        LockRecord storage record = lockRecords[lockId];
        
        if (record.lockType != LockType.TimeLocked) {
            return 0;
        }
        
        if (block.timestamp >= record.unlockTime) {
            return 0;
        }
        
        return (record.amount * earlyUnlockPenalty) / PRECISION;
    }

    // ============================================
    // Internal Functions
    // ============================================

    /**
     * @notice Execute unlock logic
     */
    function _executeUnlock(uint256 lockId, uint256 penalty) internal {
        LockRecord storage record = lockRecords[lockId];
        
        record.isLocked = false;
        
        uint256 returnAmount = record.amount - penalty;
        
        // Transfer LP Token
        IERC20(record.lpToken).safeTransfer(record.owner, returnAmount);
        
        // Transfer penalty to penalty receiver if applicable
        if (penalty > 0) {
            IERC20(record.lpToken).safeTransfer(penaltyReceiver, penalty);
        }
        
        emit LPUnlocked(lockId, record.owner, returnAmount, penalty);
    }

    /**
     * @notice Verify AI action signature
     */
    function _verifyAISignature(
        AIAction calldata action,
        bytes calldata signature
    ) internal {
        if (block.timestamp > action.expiry) revert SignatureExpired();
        
        uint256 nonce = aiNonces[aiSigner]++;
        
        bytes32 structHash = keccak256(
            abi.encode(
                ACTION_TYPEHASH,
                action.lockId,
                uint8(action.actionType),
                action.amount,
                action.stateHash,
                action.expiry,
                nonce
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );
        
        if (usedSignatures[digest]) revert SignatureUsed();
        usedSignatures[digest] = true;
        
        address signer = digest.recover(signature);
        if (signer != aiSigner) revert InvalidSignature();
    }

    /**
     * @notice AI-driven lock
     */
    function _aiLock(AIAction calldata action) internal {
        // AI can execute locks on behalf of users (requires pre-authorization)
        // Simplified here, actual implementation needs more complex authorization
    }

    /**
     * @notice AI-driven unlock
     */
    function _aiUnlock(AIAction calldata action) internal {
        LockRecord storage record = lockRecords[action.lockId];
        
        if (!record.isLocked) revert AlreadyUnlocked();
        
        // AI can unlock ConditionalAI type locks
        if (record.lockType != LockType.ConditionalAI) {
            revert UnauthorizedAction();
        }
        
        _executeUnlock(action.lockId, 0);
    }

    /**
     * @notice AI-driven lock extension
     */
    function _aiExtendLock(AIAction calldata action) internal {
        LockRecord storage record = lockRecords[action.lockId];
        
        if (!record.isLocked) revert AlreadyUnlocked();
        
        uint256 oldUnlockTime = record.unlockTime;
        record.unlockTime = block.timestamp + action.amount; // amount used as new lock duration
        
        emit LockExtended(action.lockId, oldUnlockTime, record.unlockTime);
    }

    /**
     * @notice AI-driven emergency unlock
     */
    function _aiEmergencyUnlock(AIAction calldata action) internal {
        LockRecord storage record = lockRecords[action.lockId];
        
        if (!record.isLocked) revert AlreadyUnlocked();
        
        // Emergency unlock requires market state to be Critical or Emergency
        if (latestMarketState.health != HealthStatus.Critical && 
            latestMarketState.health != HealthStatus.Emergency) {
            revert InvalidHealthStatus();
        }
        
        _executeUnlock(action.lockId, 0);
        
        emit EmergencyUnlock(action.lockId, msg.sender, "AI Emergency Protocol");
    }
}
