// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IRemitToken {
    function mint(address to, uint256 amount) external;
}

/**
 * @title Remittance
 * @notice Users send 10 USDC + 5 STORY, receive 9 USDC + 10 REMIT
 * @dev - No agent signature required, anyone can call if they have approved tokens
 *      - 1 USDC goes to team wallet
 *      - 5 STORY burned (sent to dead address)
 *      - 10 REMIT minted to user
 *      - Max 100 times per wallet
 *      - Max 80,000 total operations (800,000 REMIT)
 */
contract Remittance is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Token addresses
    IERC20 public immutable usdc;
    IERC20 public immutable storyToken;
    IRemitToken public immutable remitToken;
    
    // Configuration
    address public teamWallet;
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    // Amounts (USDC has 6 decimals, STORY/REMIT have 18 decimals)
    uint256 public constant USDC_REQUIRED = 10 * 10**6;      // 10 USDC
    uint256 public constant USDC_RETURN = 9 * 10**6;         // 9 USDC returned
    uint256 public constant USDC_FEE = 1 * 10**6;            // 1 USDC fee
    uint256 public constant STORY_REQUIRED = 5 * 10**18;     // 5 STORY
    uint256 public constant REMIT_REWARD = 10 * 10**18;      // 10 REMIT
    
    // Limits
    uint256 public constant MAX_PER_WALLET = 100;
    uint256 public constant MAX_TOTAL_OPERATIONS = 80_000;
    
    // State
    uint256 public totalOperations;
    mapping(address => uint256) public userOperationCount;
    
    // Events
    event Remitted(
        address indexed user,
        uint256 operationNumber,
        uint256 userTotalOperations
    );
    event TeamWalletUpdated(address indexed oldWallet, address indexed newWallet);
    
    constructor(
        address _usdc,
        address _storyToken,
        address _remitToken,
        address _teamWallet
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_storyToken != address(0), "Invalid STORY address");
        require(_remitToken != address(0), "Invalid REMIT address");
        require(_teamWallet != address(0), "Invalid team wallet");
        
        usdc = IERC20(_usdc);
        storyToken = IERC20(_storyToken);
        remitToken = IRemitToken(_remitToken);
        teamWallet = _teamWallet;
    }
    
    /**
     * @notice Execute remittance operation
     * @dev User must approve 10 USDC and 5 STORY before calling
     *      No signature required - contract verifies token balances and allowances
     */
    function remit() external nonReentrant {
        require(totalOperations < MAX_TOTAL_OPERATIONS, "Max total operations reached");
        require(userOperationCount[msg.sender] < MAX_PER_WALLET, "Max per wallet reached");
        
        // Verify user has approved enough tokens
        require(usdc.allowance(msg.sender, address(this)) >= USDC_REQUIRED, "Insufficient USDC allowance");
        require(storyToken.allowance(msg.sender, address(this)) >= STORY_REQUIRED, "Insufficient STORY allowance");
        
        // Verify user has enough balance
        require(usdc.balanceOf(msg.sender) >= USDC_REQUIRED, "Insufficient USDC balance");
        require(storyToken.balanceOf(msg.sender) >= STORY_REQUIRED, "Insufficient STORY balance");
        
        // Transfer 10 USDC from user to contract
        usdc.safeTransferFrom(msg.sender, address(this), USDC_REQUIRED);
        
        // Transfer 5 STORY from user to dead address (burn)
        storyToken.safeTransferFrom(msg.sender, DEAD_ADDRESS, STORY_REQUIRED);
        
        // Return 9 USDC to user
        usdc.safeTransfer(msg.sender, USDC_RETURN);
        
        // Send 1 USDC fee to team wallet
        usdc.safeTransfer(teamWallet, USDC_FEE);
        
        // Mint 10 REMIT to user
        remitToken.mint(msg.sender, REMIT_REWARD);
        
        // Update counters
        totalOperations++;
        userOperationCount[msg.sender]++;
        
        emit Remitted(msg.sender, totalOperations, userOperationCount[msg.sender]);
    }
    
    /**
     * @notice Update team wallet address
     */
    function setTeamWallet(address _newTeamWallet) external onlyOwner {
        require(_newTeamWallet != address(0), "Invalid address");
        address oldWallet = teamWallet;
        teamWallet = _newTeamWallet;
        emit TeamWalletUpdated(oldWallet, _newTeamWallet);
    }
    
    /**
     * @notice Get remaining operations for a user
     */
    function remainingUserOperations(address user) external view returns (uint256) {
        return MAX_PER_WALLET - userOperationCount[user];
    }
    
    /**
     * @notice Get remaining total operations
     */
    function remainingTotalOperations() external view returns (uint256) {
        return MAX_TOTAL_OPERATIONS - totalOperations;
    }
    
    /**
     * @notice Check if user can perform operation
     */
    function canRemit(address user) external view returns (bool canDo, string memory reason) {
        if (totalOperations >= MAX_TOTAL_OPERATIONS) {
            return (false, "Max total operations reached");
        }
        if (userOperationCount[user] >= MAX_PER_WALLET) {
            return (false, "Max per wallet reached");
        }
        if (usdc.balanceOf(user) < USDC_REQUIRED) {
            return (false, "Insufficient USDC balance");
        }
        if (storyToken.balanceOf(user) < STORY_REQUIRED) {
            return (false, "Insufficient STORY balance");
        }
        if (usdc.allowance(user, address(this)) < USDC_REQUIRED) {
            return (false, "USDC not approved");
        }
        if (storyToken.allowance(user, address(this)) < STORY_REQUIRED) {
            return (false, "STORY not approved");
        }
        return (true, "");
    }
    
    /**
     * @notice Emergency withdraw tokens (only owner)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
