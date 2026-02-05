// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title StoryStakingV2
 * @notice Advanced staking contract with dynamic multipliers, referral rewards, VIP levels
 * @dev Features:
 *      - Per-second point calculation
 *      - Dynamic multiplier: +0.1x every 30 days (max +2x)
 *      - VIP levels: Bronze/Silver/Gold/Diamond based on cumulative stake
 *      - Referral system: 10% of referee's points to referrer
 *      - Early withdrawal penalty: up to 10% tokens burned + 50% points deducted
 *      - Pausable for emergencies
 */
contract StoryStakingV2 is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    
    // Base points rate: 0.01 points per token per day
    uint256 public constant BASE_POINTS_RATE = 1e16;
    
    // Stake amount limits
    uint256 public constant MIN_STAKE_AMOUNT = 100 * 1e18;
    uint256 public constant MAX_STAKE_AMOUNT = 100_000 * 1e18;
    
    // Lock periods
    uint256 public constant LOCK_FLEXIBLE = 7 days;
    uint256 public constant LOCK_30_DAYS = 30 days;
    uint256 public constant LOCK_90_DAYS = 90 days;
    uint256 public constant LOCK_180_DAYS = 180 days;
    uint256 public constant LOCK_365_DAYS = 365 days;

    // Base multipliers (precision: 100 = 1.0x)
    uint256 public constant MULTIPLIER_FLEXIBLE = 100;
    uint256 public constant MULTIPLIER_30_DAYS = 150;
    uint256 public constant MULTIPLIER_90_DAYS = 250;
    uint256 public constant MULTIPLIER_180_DAYS = 400;
    uint256 public constant MULTIPLIER_365_DAYS = 800;

    // Dynamic multiplier: +10 (0.1x) every 30 days, max +200 (2.0x)
    uint256 public constant DYNAMIC_BONUS_PER_PERIOD = 10;
    uint256 public constant DYNAMIC_BONUS_PERIOD = 30 days;
    uint256 public constant DYNAMIC_BONUS_MAX = 200;

    // Penalties
    uint256 public constant MAX_POINTS_PENALTY_PERCENT = 50;
    uint256 public constant MAX_TOKEN_PENALTY_PERCENT = 10;
    
    // Referral reward: 10%
    uint256 public constant REFERRAL_REWARD_PERCENT = 10;
    
    // Max stakes per user
    uint256 public constant MAX_STAKES_PER_USER = 50;

    // VIP thresholds (cumulative stake amount)
    uint256 public constant VIP_SILVER_THRESHOLD = 10_000 * 1e18;
    uint256 public constant VIP_GOLD_THRESHOLD = 50_000 * 1e18;
    uint256 public constant VIP_DIAMOND_THRESHOLD = 100_000 * 1e18;
    
    // VIP bonus multipliers
    uint256 public constant VIP_SILVER_BONUS = 20;   // +0.2x
    uint256 public constant VIP_GOLD_BONUS = 50;     // +0.5x
    uint256 public constant VIP_DIAMOND_BONUS = 100; // +1.0x

    // Dead address for burning
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // ============ State Variables ============
    
    IERC20 public immutable storyToken;
    
    struct Stake {
        uint256 amount;
        uint256 lockPeriod;
        uint256 startTime;
        uint256 endTime;
        uint256 baseMultiplier;
        uint256 lastClaimTime;
        bool active;
    }
    
    // User => StakeID => Stake
    mapping(address => mapping(uint256 => Stake)) public stakes;
    mapping(address => uint256) public stakeCount;
    mapping(address => uint256) public userPoints;
    mapping(address => uint256) public userTotalStaked;
    mapping(address => uint256) public userCumulativeStaked; // Historical cumulative stake (for VIP levels)
    
    // Referral system
    mapping(address => address) public referrer; // user => referrer
    mapping(address => uint256) public referralPoints; // referrer => earned points from referrals
    mapping(string => address) public referralCodes; // code => owner
    mapping(address => string) public userReferralCode; // user => their code
    
    // Global stats
    uint256 public totalStaked;
    uint256 public totalPointsDistributed;
    uint256 public totalTokensBurned;

    // ============ Events ============
    
    event Staked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 lockPeriod,
        uint256 baseMultiplier,
        address indexed referrer
    );
    event Unstaked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 pointsEarned,
        uint256 pointsPenalty,
        uint256 tokensBurned
    );
    event PointsClaimed(address indexed user, uint256 indexed stakeId, uint256 points);
    event PointsSpent(address indexed user, uint256 amount, string reason);
    event PointsAdded(address indexed user, uint256 amount, string reason);
    event ReferralReward(address indexed referrer, address indexed referee, uint256 points);
    event ReferralCodeRegistered(address indexed user, string code);
    event VIPLevelUp(address indexed user, uint256 newLevel, uint256 cumulativeStaked);

    // ============ Constructor ============
    
    constructor(address _storyToken) Ownable(msg.sender) {
        require(_storyToken != address(0), "Invalid token address");
        storyToken = IERC20(_storyToken);
    }

    // ============ External Functions ============
    
    /**
     * @notice Register a custom referral code
     * @param code Unique referral code (3-20 chars, alphanumeric)
     */
    function registerReferralCode(string calldata code) external {
        require(bytes(code).length >= 3 && bytes(code).length <= 20, "Code must be 3-20 chars");
        require(referralCodes[code] == address(0), "Code already taken");
        require(bytes(userReferralCode[msg.sender]).length == 0, "Already have a code");
        
        // Validate alphanumeric only
        bytes memory b = bytes(code);
        for (uint i = 0; i < b.length; i++) {
            require(
                (b[i] >= 0x30 && b[i] <= 0x39) || // 0-9
                (b[i] >= 0x41 && b[i] <= 0x5A) || // A-Z
                (b[i] >= 0x61 && b[i] <= 0x7A),   // a-z
                "Only alphanumeric chars"
            );
        }
        
        referralCodes[code] = msg.sender;
        userReferralCode[msg.sender] = code;
        
        emit ReferralCodeRegistered(msg.sender, code);
    }

    /**
     * @notice Stake STORY tokens
     * @param amount Stake amount
     * @param lockPeriod Lock period
     * @param referralCode Optional referral code
     */
    function stake(
        uint256 amount,
        uint256 lockPeriod,
        string calldata referralCode
    ) external nonReentrant whenNotPaused {
        require(amount >= MIN_STAKE_AMOUNT, "Amount below minimum");
        require(amount <= MAX_STAKE_AMOUNT, "Amount above maximum");
        require(stakeCount[msg.sender] < MAX_STAKES_PER_USER, "Max stakes reached");
        
        uint256 baseMultiplier = _getBaseMultiplier(lockPeriod);
        require(baseMultiplier > 0, "Invalid lock period");
        
        // Handle referral relationship
        if (referrer[msg.sender] == address(0) && bytes(referralCode).length > 0) {
            address ref = referralCodes[referralCode];
            if (ref != address(0) && ref != msg.sender) {
                referrer[msg.sender] = ref;
            }
        }
        
        storyToken.safeTransferFrom(msg.sender, address(this), amount);
        
        uint256 stakeId = stakeCount[msg.sender];
        stakes[msg.sender][stakeId] = Stake({
            amount: amount,
            lockPeriod: lockPeriod,
            startTime: block.timestamp,
            endTime: block.timestamp + lockPeriod,
            baseMultiplier: baseMultiplier,
            lastClaimTime: block.timestamp,
            active: true
        });
        
        stakeCount[msg.sender]++;
        userTotalStaked[msg.sender] += amount;
        userCumulativeStaked[msg.sender] += amount;
        totalStaked += amount;
        
        // Check VIP level upgrade
        _checkVIPLevelUp(msg.sender);
        
        emit Staked(msg.sender, stakeId, amount, lockPeriod, baseMultiplier, referrer[msg.sender]);
    }

    /**
     * @notice Unstake tokens (early withdrawal has penalties)
     */
    function unstake(uint256 stakeId) external nonReentrant {
        Stake storage s = stakes[msg.sender][stakeId];
        require(s.active, "Stake not active");
        
        // Calculate pending points
        uint256 pendingPoints = _calculatePendingPoints(msg.sender, stakeId);
        
        // Calculate penalties
        (uint256 pointsPenalty, uint256 tokenPenalty) = _calculatePenalties(
            s.startTime, s.endTime, s.lockPeriod, pendingPoints, s.amount
        );
        
        uint256 pointsAfterPenalty = pendingPoints - pointsPenalty;
        uint256 tokensAfterPenalty = s.amount - tokenPenalty;
        
        // Distribute points
        if (pointsAfterPenalty > 0) {
            _distributePoints(msg.sender, pointsAfterPenalty);
        }
        
        uint256 amount = s.amount;
        
        // Update state
        s.active = false;
        userTotalStaked[msg.sender] -= amount;
        totalStaked -= amount;
        
        // Burn penalty tokens
        if (tokenPenalty > 0) {
            storyToken.safeTransfer(DEAD_ADDRESS, tokenPenalty);
            totalTokensBurned += tokenPenalty;
        }
        
        // Return tokens
        storyToken.safeTransfer(msg.sender, tokensAfterPenalty);
        
        emit Unstaked(msg.sender, stakeId, amount, pointsAfterPenalty, pointsPenalty, tokenPenalty);
    }

    /**
     * @notice Claim points for a stake
     */
    function claimPoints(uint256 stakeId) external nonReentrant whenNotPaused {
        Stake storage s = stakes[msg.sender][stakeId];
        require(s.active, "Stake not active");
        
        uint256 pendingPoints = _calculatePendingPoints(msg.sender, stakeId);
        require(pendingPoints > 0, "No points to claim");
        
        s.lastClaimTime = block.timestamp;
        _distributePoints(msg.sender, pendingPoints);
        
        emit PointsClaimed(msg.sender, stakeId, pendingPoints);
    }

    /**
     * @notice Claim all points from all stakes
     */
    function claimAllPoints() external nonReentrant whenNotPaused {
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
        _distributePoints(msg.sender, totalPending);
    }

    // ============ Admin Functions ============
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function spendPoints(address user, uint256 amount, string calldata reason) external onlyOwner {
        require(userPoints[user] >= amount, "Insufficient points");
        userPoints[user] -= amount;
        emit PointsSpent(user, amount, reason);
    }
    
    function addPoints(address user, uint256 amount, string calldata reason) external onlyOwner {
        require(user != address(0), "Invalid user");
        require(amount > 0, "Amount must be > 0");
        userPoints[user] += amount;
        totalPointsDistributed += amount;
        emit PointsAdded(user, amount, reason);
    }
    
    function batchAddPoints(
        address[] calldata users,
        uint256[] calldata amounts,
        string calldata reason
    ) external onlyOwner {
        require(users.length == amounts.length, "Length mismatch");
        require(users.length <= 100, "Too many users");
        
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] != address(0) && amounts[i] > 0) {
                userPoints[users[i]] += amounts[i];
                totalPointsDistributed += amounts[i];
                emit PointsAdded(users[i], amounts[i], reason);
            }
        }
    }

    // ============ View Functions ============
    
    function getPendingPoints(address user, uint256 stakeId) external view returns (uint256) {
        return _calculatePendingPoints(user, stakeId);
    }
    
    function getTotalPendingPoints(address user) external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < stakeCount[user]; i++) {
            if (stakes[user][i].active) {
                total += _calculatePendingPoints(user, i);
            }
        }
        return total;
    }
    
    function getUserActiveStakes(address user) external view returns (
        uint256[] memory ids,
        uint256[] memory amounts,
        uint256[] memory endTimes,
        uint256[] memory effectiveMultipliers,
        uint256[] memory pendingPoints
    ) {
        uint256 count = stakeCount[user];
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < count; i++) {
            if (stakes[user][i].active) activeCount++;
        }
        
        ids = new uint256[](activeCount);
        amounts = new uint256[](activeCount);
        endTimes = new uint256[](activeCount);
        effectiveMultipliers = new uint256[](activeCount);
        pendingPoints = new uint256[](activeCount);
        
        uint256 idx = 0;
        for (uint256 i = 0; i < count; i++) {
            Stake storage s = stakes[user][i];
            if (s.active) {
                ids[idx] = i;
                amounts[idx] = s.amount;
                endTimes[idx] = s.endTime;
                effectiveMultipliers[idx] = _getEffectiveMultiplier(user, i);
                pendingPoints[idx] = _calculatePendingPoints(user, i);
                idx++;
            }
        }
    }
    
    function getVIPLevel(address user) external view returns (uint256 level, uint256 bonusMultiplier) {
        uint256 cumulative = userCumulativeStaked[user];
        if (cumulative >= VIP_DIAMOND_THRESHOLD) {
            return (3, VIP_DIAMOND_BONUS);
        } else if (cumulative >= VIP_GOLD_THRESHOLD) {
            return (2, VIP_GOLD_BONUS);
        } else if (cumulative >= VIP_SILVER_THRESHOLD) {
            return (1, VIP_SILVER_BONUS);
        }
        return (0, 0);
    }
    
    function getPenalties(address user, uint256 stakeId) external view returns (
        uint256 pointsPenaltyPercent,
        uint256 tokenPenaltyPercent
    ) {
        Stake storage s = stakes[user][stakeId];
        if (!s.active) return (0, 0);
        
        if (block.timestamp >= s.endTime || s.lockPeriod == LOCK_FLEXIBLE) {
            return (0, 0);
        }
        
        uint256 remainingTime = s.endTime - block.timestamp;
        uint256 totalTime = s.endTime - s.startTime;
        
        pointsPenaltyPercent = (remainingTime * MAX_POINTS_PENALTY_PERCENT) / totalTime;
        tokenPenaltyPercent = (remainingTime * MAX_TOKEN_PENALTY_PERCENT) / totalTime;
    }
    
    function getReferralInfo(address user) external view returns (
        address myReferrer,
        string memory myCode,
        uint256 earnedFromReferrals
    ) {
        return (referrer[user], userReferralCode[user], referralPoints[user]);
    }

    // ============ Internal Functions ============
    
    function _getBaseMultiplier(uint256 lockPeriod) internal pure returns (uint256) {
        if (lockPeriod == LOCK_FLEXIBLE) return MULTIPLIER_FLEXIBLE;
        if (lockPeriod == LOCK_30_DAYS) return MULTIPLIER_30_DAYS;
        if (lockPeriod == LOCK_90_DAYS) return MULTIPLIER_90_DAYS;
        if (lockPeriod == LOCK_180_DAYS) return MULTIPLIER_180_DAYS;
        if (lockPeriod == LOCK_365_DAYS) return MULTIPLIER_365_DAYS;
        return 0;
    }
    
    function _getEffectiveMultiplier(address user, uint256 stakeId) internal view returns (uint256) {
        Stake storage s = stakes[user][stakeId];
        if (!s.active) return 0;
        
        // Base multiplier
        uint256 multiplier = s.baseMultiplier;
        
        // Dynamic multiplier bonus (stake duration)
        uint256 stakedDuration = block.timestamp - s.startTime;
        uint256 dynamicBonus = (stakedDuration / DYNAMIC_BONUS_PERIOD) * DYNAMIC_BONUS_PER_PERIOD;
        if (dynamicBonus > DYNAMIC_BONUS_MAX) {
            dynamicBonus = DYNAMIC_BONUS_MAX;
        }
        multiplier += dynamicBonus;
        
        // VIP level bonus
        (, uint256 vipBonus) = this.getVIPLevel(user);
        multiplier += vipBonus;
        
        return multiplier;
    }
    
    function _calculatePendingPoints(address user, uint256 stakeId) internal view returns (uint256) {
        Stake storage s = stakes[user][stakeId];
        if (!s.active) return 0;
        
        uint256 endTime = block.timestamp;
        if (endTime > s.endTime) {
            endTime = s.endTime;
        }
        
        if (endTime <= s.lastClaimTime) return 0;
        
        uint256 seconds_ = endTime - s.lastClaimTime;
        uint256 effectiveMultiplier = _getEffectiveMultiplier(user, stakeId);
        
        // points = amount * rate * multiplier * seconds / (100 * 1e18 * 1 day)
        return (s.amount * BASE_POINTS_RATE * effectiveMultiplier * seconds_) / (100 * 1e18 * 1 days);
    }
    
    function _calculatePenalties(
        uint256 startTime,
        uint256 endTime,
        uint256 lockPeriod,
        uint256 points,
        uint256 amount
    ) internal view returns (uint256 pointsPenalty, uint256 tokenPenalty) {
        // Expired or flexible stake, no penalty
        if (block.timestamp >= endTime || lockPeriod == LOCK_FLEXIBLE) {
            return (0, 0);
        }
        
        uint256 remainingTime = endTime - block.timestamp;
        uint256 totalTime = endTime - startTime;
        
        // Points penalty: max 50%
        pointsPenalty = (points * remainingTime * MAX_POINTS_PENALTY_PERCENT) / (totalTime * 100);
        
        // Token penalty: max 10%
        tokenPenalty = (amount * remainingTime * MAX_TOKEN_PENALTY_PERCENT) / (totalTime * 100);
    }
    
    function _distributePoints(address user, uint256 points) internal {
        userPoints[user] += points;
        totalPointsDistributed += points;
        
        // Referral reward
        address ref = referrer[user];
        if (ref != address(0)) {
            uint256 reward = (points * REFERRAL_REWARD_PERCENT) / 100;
            if (reward > 0) {
                userPoints[ref] += reward;
                referralPoints[ref] += reward;
                totalPointsDistributed += reward;
                emit ReferralReward(ref, user, reward);
            }
        }
    }
    
    function _checkVIPLevelUp(address user) internal {
        uint256 cumulative = userCumulativeStaked[user];
        uint256 level = 0;
        
        if (cumulative >= VIP_DIAMOND_THRESHOLD) {
            level = 3;
        } else if (cumulative >= VIP_GOLD_THRESHOLD) {
            level = 2;
        } else if (cumulative >= VIP_SILVER_THRESHOLD) {
            level = 1;
        }
        
        if (level > 0) {
            emit VIPLevelUp(user, level, cumulative);
        }
    }
}
