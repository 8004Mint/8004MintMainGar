// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StoryStaking
 * @notice Stake STORY tokens to earn points with different lock period multipliers
 * @dev Points system (calculated per second for precision):
 *      - Flexible: 1.0x multiplier
 *      - 30 days: 1.5x multiplier
 *      - 90 days: 2.5x multiplier
 *      - 180 days: 4.0x multiplier
 *      - 365 days: 8.0x multiplier
 *      
 *      Points accumulate every second (not daily), providing real-time precision.
 *      Formula: amount * rate * multiplier * seconds / (100 * 1e18 * 86400)
 *      
 *      All stakes can be withdrawn anytime, but early withdrawal has penalty:
 *      Penalty = (remaining time / total lock time) * 50%
 *      No penalty after lock period ends
 *      
 *      Max 50 stakes per user
 *      Stake amount: 100 ~ 100,000 STORY
 */
contract StoryStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    
    // Base points rate: 0.01 points per token per day (precision 1e18)
    // Actual calculation is per-second: rate / 86400 per second
    uint256 public constant BASE_POINTS_RATE = 1e16; // 0.01 points per token per day
    
    // Stake amount limits
    uint256 public constant MIN_STAKE_AMOUNT = 100 * 1e18;      // Min 100 STORY
    uint256 public constant MAX_STAKE_AMOUNT = 100_000 * 1e18;  // Max 100,000 STORY
    
    // Lock period types
    uint256 public constant LOCK_FLEXIBLE = 7 days;
    uint256 public constant LOCK_30_DAYS = 30 days;
    uint256 public constant LOCK_90_DAYS = 90 days;
    uint256 public constant LOCK_180_DAYS = 180 days;
    uint256 public constant LOCK_365_DAYS = 365 days;

    // Points multipliers (precision: 100 = 1.0x)
    uint256 public constant MULTIPLIER_FLEXIBLE = 100;  // 1.0x
    uint256 public constant MULTIPLIER_30_DAYS = 150;   // 1.5x
    uint256 public constant MULTIPLIER_90_DAYS = 250;   // 2.5x
    uint256 public constant MULTIPLIER_180_DAYS = 400;  // 4.0x
    uint256 public constant MULTIPLIER_365_DAYS = 800;  // 8.0x

    // Max penalty: 50% of points deducted for early withdrawal
    uint256 public constant MAX_PENALTY_PERCENT = 50;
    
    // Max stakes per user (prevent gas issues)
    uint256 public constant MAX_STAKES_PER_USER = 50;

    // ============ State Variables ============
    
    IERC20 public immutable storyToken;
    
    // Stake record
    struct Stake {
        uint256 amount;           // Staked amount
        uint256 lockPeriod;       // Lock period (seconds)
        uint256 startTime;        // Start timestamp
        uint256 endTime;          // End timestamp
        uint256 multiplier;       // Points multiplier
        uint256 lastClaimTime;    // Last claim timestamp
        bool active;              // Is active
    }
    
    // User => StakeID => Stake info
    mapping(address => mapping(uint256 => Stake)) public stakes;
    // User => Stake count
    mapping(address => uint256) public stakeCount;
    // User => Total points
    mapping(address => uint256) public userPoints;
    // User => Total staked amount
    mapping(address => uint256) public userTotalStaked;
    
    // Global stats
    uint256 public totalStaked;
    uint256 public totalPointsDistributed;

    // ============ Events ============
    
    event Staked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 lockPeriod,
        uint256 multiplier
    );
    event Unstaked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 pointsEarned,
        uint256 penaltyPercent,
        uint256 pointsDeducted
    );
    event PointsClaimed(
        address indexed user,
        uint256 indexed stakeId,
        uint256 points
    );
    event PointsSpent(
        address indexed user,
        uint256 amount,
        string reason
    );
    event PointsAdded(
        address indexed user,
        uint256 amount,
        string reason
    );

    // ============ Constructor ============
    
    constructor(address _storyToken) Ownable(msg.sender) {
        require(_storyToken != address(0), "Invalid token address");
        storyToken = IERC20(_storyToken);
    }

    // ============ External Functions ============
    
    /**
     * @notice Stake STORY tokens
     * @param amount Stake amount
     * @param lockPeriod Lock period (seconds): 7d, 30d, 90d, 180d, 365d
     */
    function stake(uint256 amount, uint256 lockPeriod) external nonReentrant {
        require(amount >= MIN_STAKE_AMOUNT, "Amount below minimum (100 STORY)");
        require(amount <= MAX_STAKE_AMOUNT, "Amount above maximum (100,000 STORY)");
        require(stakeCount[msg.sender] < MAX_STAKES_PER_USER, "Max stakes reached (50)");
        
        uint256 multiplier = _getMultiplier(lockPeriod);
        require(multiplier > 0, "Invalid lock period");
        
        // Transfer tokens in
        storyToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Create stake record
        uint256 stakeId = stakeCount[msg.sender];
        stakes[msg.sender][stakeId] = Stake({
            amount: amount,
            lockPeriod: lockPeriod,
            startTime: block.timestamp,
            endTime: block.timestamp + lockPeriod,
            multiplier: multiplier,
            lastClaimTime: block.timestamp,
            active: true
        });
        
        // Update stats
        stakeCount[msg.sender]++;
        userTotalStaked[msg.sender] += amount;
        totalStaked += amount;
        
        emit Staked(msg.sender, stakeId, amount, lockPeriod, multiplier);
    }

    /**
     * @notice Unstake (withdraw anytime, early withdrawal has penalty)
     * @param stakeId Stake ID
     * @dev Penalty formula: (remaining time / total lock time) * 50%
     *      No penalty after lock period ends
     */
    function unstake(uint256 stakeId) external nonReentrant {
        Stake storage s = stakes[msg.sender][stakeId];
        require(s.active, "Stake not active");
        
        // Calculate pending points
        uint256 pendingPoints = _calculatePendingPoints(msg.sender, stakeId);
        
        // Calculate penalty
        uint256 penaltyPercent = _calculatePenaltyPercent(s.startTime, s.endTime, s.lockPeriod);
        uint256 pointsAfterPenalty = pendingPoints * (100 - penaltyPercent) / 100;
        uint256 pointsDeducted = pendingPoints - pointsAfterPenalty;
        
        if (pointsAfterPenalty > 0) {
            userPoints[msg.sender] += pointsAfterPenalty;
            totalPointsDistributed += pointsAfterPenalty;
        }
        
        uint256 amount = s.amount;
        
        // Update state
        s.active = false;
        userTotalStaked[msg.sender] -= amount;
        totalStaked -= amount;
        
        // Transfer tokens out
        storyToken.safeTransfer(msg.sender, amount);
        
        emit Unstaked(msg.sender, stakeId, amount, pointsAfterPenalty, penaltyPercent, pointsDeducted);
    }

    /**
     * @notice Claim points for a specific stake
     * @param stakeId Stake ID
     */
    function claimPoints(uint256 stakeId) external nonReentrant {
        Stake storage s = stakes[msg.sender][stakeId];
        require(s.active, "Stake not active");
        
        uint256 pendingPoints = _calculatePendingPoints(msg.sender, stakeId);
        require(pendingPoints > 0, "No points to claim");
        
        s.lastClaimTime = block.timestamp;
        userPoints[msg.sender] += pendingPoints;
        totalPointsDistributed += pendingPoints;
        
        emit PointsClaimed(msg.sender, stakeId, pendingPoints);
    }

    /**
     * @notice Claim all points from all active stakes
     */
    function claimAllPoints() external nonReentrant {
        uint256 totalPending = 0;
        uint256 count = stakeCount[msg.sender];
        
        for (uint256 i = 0; i < count; i++) {
            Stake storage s = stakes[msg.sender][i];
            if (s.active) {
                uint256 pending = _calculatePendingPoints(msg.sender, i);
                if (pending > 0) {
                    s.lastClaimTime = block.timestamp;
                    totalPending += pending;
                    emit PointsClaimed(msg.sender, i, pending);
                }
            }
        }
        
        require(totalPending > 0, "No points to claim");
        userPoints[msg.sender] += totalPending;
        totalPointsDistributed += totalPending;
    }

    /**
     * @notice Spend user points (admin only, for redeeming benefits)
     * @param user User address
     * @param amount Amount to spend
     * @param reason Reason for spending
     */
    function spendPoints(
        address user,
        uint256 amount,
        string calldata reason
    ) external onlyOwner {
        require(userPoints[user] >= amount, "Insufficient points");
        userPoints[user] -= amount;
        emit PointsSpent(user, amount, reason);
    }

    /**
     * @notice Add points to user (admin only, for rewards/airdrops/migration)
     * @param user User address
     * @param amount Amount to add
     * @param reason Reason for adding
     */
    function addPoints(
        address user,
        uint256 amount,
        string calldata reason
    ) external onlyOwner {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        userPoints[user] += amount;
        totalPointsDistributed += amount;
        emit PointsAdded(user, amount, reason);
    }

    /**
     * @notice Batch add points to multiple users (admin only)
     * @param users Array of user addresses
     * @param amounts Array of amounts to add
     * @param reason Reason for adding
     */
    function batchAddPoints(
        address[] calldata users,
        uint256[] calldata amounts,
        string calldata reason
    ) external onlyOwner {
        require(users.length == amounts.length, "Arrays length mismatch");
        require(users.length <= 100, "Too many users (max 100)");
        
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] != address(0) && amounts[i] > 0) {
                userPoints[users[i]] += amounts[i];
                totalPointsDistributed += amounts[i];
                emit PointsAdded(users[i], amounts[i], reason);
            }
        }
    }

    // ============ View Functions ============
    
    /**
     * @notice Get pending points for a specific stake
     */
    function getPendingPoints(
        address user,
        uint256 stakeId
    ) external view returns (uint256) {
        return _calculatePendingPoints(user, stakeId);
    }

    /**
     * @notice Get total pending points for all user stakes
     */
    function getTotalPendingPoints(address user) external view returns (uint256) {
        uint256 total = 0;
        uint256 count = stakeCount[user];
        
        for (uint256 i = 0; i < count; i++) {
            if (stakes[user][i].active) {
                total += _calculatePendingPoints(user, i);
            }
        }
        return total;
    }

    /**
     * @notice Get all active stakes for a user
     */
    function getUserActiveStakes(
        address user
    ) external view returns (
        uint256[] memory ids,
        uint256[] memory amounts,
        uint256[] memory endTimes,
        uint256[] memory multipliers,
        uint256[] memory pendingPoints
    ) {
        uint256 count = stakeCount[user];
        uint256 activeCount = 0;
        
        // Count active stakes
        for (uint256 i = 0; i < count; i++) {
            if (stakes[user][i].active) {
                activeCount++;
            }
        }
        
        // Initialize arrays
        ids = new uint256[](activeCount);
        amounts = new uint256[](activeCount);
        endTimes = new uint256[](activeCount);
        multipliers = new uint256[](activeCount);
        pendingPoints = new uint256[](activeCount);
        
        // Fill data
        uint256 index = 0;
        for (uint256 i = 0; i < count; i++) {
            Stake storage s = stakes[user][i];
            if (s.active) {
                ids[index] = i;
                amounts[index] = s.amount;
                endTimes[index] = s.endTime;
                multipliers[index] = s.multiplier;
                pendingPoints[index] = _calculatePendingPoints(user, i);
                index++;
            }
        }
    }

    /**
     * @notice Get multiplier for a lock period
     */
    function getMultiplier(uint256 lockPeriod) external pure returns (uint256) {
        return _getMultiplier(lockPeriod);
    }

    /**
     * @notice Estimate daily points for a stake
     */
    function estimateDailyPoints(
        uint256 amount,
        uint256 lockPeriod
    ) external pure returns (uint256) {
        uint256 multiplier = _getMultiplier(lockPeriod);
        if (multiplier == 0) return 0;
        return (amount * BASE_POINTS_RATE * multiplier) / (100 * 1e18);
    }

    // ============ Internal Functions ============
    
    /**
     * @dev Get multiplier for lock period
     */
    function _getMultiplier(uint256 lockPeriod) internal pure returns (uint256) {
        if (lockPeriod == LOCK_FLEXIBLE) return MULTIPLIER_FLEXIBLE;
        if (lockPeriod == LOCK_30_DAYS) return MULTIPLIER_30_DAYS;
        if (lockPeriod == LOCK_90_DAYS) return MULTIPLIER_90_DAYS;
        if (lockPeriod == LOCK_180_DAYS) return MULTIPLIER_180_DAYS;
        if (lockPeriod == LOCK_365_DAYS) return MULTIPLIER_365_DAYS;
        return 0;
    }

    /**
     * @dev Calculate pending points (per-second precision)
     * Formula: amount * rate * multiplier * seconds / (100 * 1e18 * 86400)
     * This provides real-time point accumulation instead of daily snapshots
     */
    function _calculatePendingPoints(
        address user,
        uint256 stakeId
    ) internal view returns (uint256) {
        Stake storage s = stakes[user][stakeId];
        if (!s.active) return 0;
        
        uint256 endTime = block.timestamp;
        // If expired, only calculate up to end time
        if (endTime > s.endTime) {
            endTime = s.endTime;
        }
        
        if (endTime <= s.lastClaimTime) return 0;
        
        uint256 seconds_ = endTime - s.lastClaimTime;
        
        // points = amount * BASE_POINTS_RATE * multiplier * seconds / (100 * 1e18 * 1 day)
        // Using 1 day (86400 seconds) as divisor to maintain same daily rate
        return (s.amount * BASE_POINTS_RATE * s.multiplier * seconds_) / (100 * 1e18 * 1 days);
    }

    /**
     * @dev Calculate early withdrawal penalty percent
     * Formula: (remaining time / total lock time) * MAX_PENALTY_PERCENT
     * @return Penalty percent (0-50)
     */
    function _calculatePenaltyPercent(
        uint256 startTime,
        uint256 endTime,
        uint256 lockPeriod
    ) internal view returns (uint256) {
        // Expired, no penalty
        if (block.timestamp >= endTime) {
            return 0;
        }
        
        // Flexible stake, no penalty
        if (lockPeriod == LOCK_FLEXIBLE) {
            return 0;
        }
        
        // Calculate remaining time ratio
        uint256 remainingTime = endTime - block.timestamp;
        uint256 totalTime = endTime - startTime;
        
        // Penalty = (remaining / total) * max penalty
        return (remainingTime * MAX_PENALTY_PERCENT) / totalTime;
    }

    /**
     * @notice Get early withdrawal penalty percent
     * @param stakeId Stake ID
     * @return penaltyPercent Penalty percent (0-50)
     */
    function getPenaltyPercent(
        address user,
        uint256 stakeId
    ) external view returns (uint256) {
        Stake storage s = stakes[user][stakeId];
        if (!s.active) return 0;
        return _calculatePenaltyPercent(s.startTime, s.endTime, s.lockPeriod);
    }
}
