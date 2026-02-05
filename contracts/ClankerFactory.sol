// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ClankerToken
 * @notice AI-generated ERC-20 token deployed by Clanker Factory
 */
contract ClankerToken is ERC20, Ownable {
    uint8 private _decimals;
    
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 totalSupply_,
        address creator_
    ) ERC20(name_, symbol_) Ownable(creator_) {
        _decimals = decimals_;
        _mint(creator_, totalSupply_);
    }
    
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}

/**
 * @title ClankerFactory
 * @notice AI-powered token deployment factory with automatic LP creation
 * @dev Integrates with Uniswap V3 for liquidity provisioning
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        CLANKER FACTORY                                   │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
 * │  │ AI Intent    │───▶│ Token Deploy │───▶│  LP Creation │              │
 * │  │ Parser       │    │   Engine     │    │   (Uni V3)   │              │
 * │  └──────────────┘    └──────────────┘    └──────────────┘              │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
contract ClankerFactory is Ownable, ReentrancyGuard {
    
    // ============================================
    // Type Definitions
    // ============================================
    
    struct TokenConfig {
        string name;
        string symbol;
        uint8 decimals;
        uint256 totalSupply;
        uint256 lpAllocation;      // Percentage for LP (basis points)
        uint256 creatorAllocation; // Percentage for creator
        uint24 feeTier;            // Uniswap V3 fee tier
    }
    
    struct DeployedToken {
        address tokenAddress;
        address creator;
        address lpPool;
        uint256 deployTime;
        uint256 totalSupply;
        string name;
        string symbol;
        bool lpCreated;
    }
    
    // ============================================
    // State Variables
    // ============================================
    
    /// @notice AI Agent signer address
    address public aiAgent;
    
    /// @notice Uniswap V3 Factory
    address public immutable uniswapFactory;
    
    /// @notice Uniswap V3 Position Manager
    address public immutable positionManager;
    
    /// @notice WETH address for pairing
    address public immutable weth;
    
    /// @notice Deployment counter
    uint256 public deploymentCount;
    
    /// @notice Deployed tokens mapping
    mapping(uint256 => DeployedToken) public deployedTokens;
    
    /// @notice Token address to deployment ID
    mapping(address => uint256) public tokenToDeployId;
    
    /// @notice Creator to their token IDs
    mapping(address => uint256[]) public creatorTokens;
    
    /// @notice Fee recipient for protocol fees
    address public feeRecipient;
    
    /// @notice Protocol fee (basis points)
    uint256 public protocolFee = 100; // 1%
    
    /// @notice Minimum deployment fee
    uint256 public minDeploymentFee = 0.001 ether;
    
    /// @notice Used signatures (replay protection)
    mapping(bytes32 => bool) public usedSignatures;
    
    // ============================================
    // Constants
    // ============================================
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant DEFAULT_TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens
    uint256 public constant DEFAULT_LP_ALLOCATION = 8000; // 80%
    uint24 public constant DEFAULT_FEE_TIER = 3000; // 0.3%
    
    // EIP-712 Domain
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    
    bytes32 public constant DEPLOY_TYPEHASH = keccak256(
        "Deploy(string name,string symbol,uint256 totalSupply,address creator,uint256 nonce,uint256 deadline)"
    );
    
    bytes32 public immutable DOMAIN_SEPARATOR;
    
    // ============================================
    // Events
    // ============================================
    
    event TokenDeployed(
        uint256 indexed deployId,
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        uint256 totalSupply
    );
    
    event LiquidityAdded(
        uint256 indexed deployId,
        address indexed tokenAddress,
        address indexed lpPool,
        uint256 tokenAmount,
        uint256 ethAmount
    );
    
    event AIAgentUpdated(address indexed oldAgent, address indexed newAgent);
    
    event ProtocolFeeUpdated(uint256 oldFee, uint256 newFee);
    
    // ============================================
    // Errors
    // ============================================
    
    error InvalidSignature();
    error SignatureExpired();
    error SignatureUsed();
    error InvalidName();
    error InvalidSymbol();
    error InsufficientFee();
    error InvalidAllocation();
    error TokenAlreadyExists();
    error UnauthorizedAgent();
    
    // ============================================
    // Constructor
    // ============================================
    
    constructor(
        address _aiAgent,
        address _uniswapFactory,
        address _positionManager,
        address _weth,
        address _feeRecipient
    ) Ownable(msg.sender) {
        require(_aiAgent != address(0), "Invalid AI agent");
        
        aiAgent = _aiAgent;
        uniswapFactory = _uniswapFactory;
        positionManager = _positionManager;
        weth = _weth;
        feeRecipient = _feeRecipient;
        
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256("ClankerFactory"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }
    
    // ============================================
    // External Functions
    // ============================================
    
    /**
     * @notice Deploy a new token via AI agent
     * @param name Token name
     * @param symbol Token symbol
     * @param totalSupply Total supply
     * @param creator Token creator address
     * @param deadline Signature deadline
     * @param signature AI agent signature
     */
    function deployToken(
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        address creator,
        uint256 deadline,
        bytes calldata signature
    ) external payable nonReentrant returns (address tokenAddress, uint256 deployId) {
        // Validate inputs
        if (bytes(name).length == 0 || bytes(name).length > 32) revert InvalidName();
        if (bytes(symbol).length == 0 || bytes(symbol).length > 8) revert InvalidSymbol();
        if (msg.value < minDeploymentFee) revert InsufficientFee();
        
        // Verify signature
        _verifySignature(name, symbol, totalSupply, creator, deadline, signature);
        
        // Set default supply if zero
        uint256 supply = totalSupply > 0 ? totalSupply : DEFAULT_TOTAL_SUPPLY;
        
        // Deploy token
        ClankerToken token = new ClankerToken(
            name,
            symbol,
            18,
            supply,
            address(this)
        );
        
        tokenAddress = address(token);
        deployId = deploymentCount++;
        
        // Store deployment info
        deployedTokens[deployId] = DeployedToken({
            tokenAddress: tokenAddress,
            creator: creator,
            lpPool: address(0),
            deployTime: block.timestamp,
            totalSupply: supply,
            name: name,
            symbol: symbol,
            lpCreated: false
        });
        
        tokenToDeployId[tokenAddress] = deployId;
        creatorTokens[creator].push(deployId);
        
        // Transfer creator allocation
        uint256 creatorAmount = (supply * (BASIS_POINTS - DEFAULT_LP_ALLOCATION)) / BASIS_POINTS;
        token.transfer(creator, creatorAmount);
        
        // Handle protocol fee
        if (msg.value > 0) {
            uint256 fee = (msg.value * protocolFee) / BASIS_POINTS;
            if (fee > 0) {
                payable(feeRecipient).transfer(fee);
            }
        }
        
        emit TokenDeployed(deployId, tokenAddress, creator, name, symbol, supply);
    }
    
    /**
     * @notice Add liquidity for a deployed token
     * @param deployId Deployment ID
     */
    function addLiquidity(uint256 deployId) external payable nonReentrant {
        DeployedToken storage deployed = deployedTokens[deployId];
        require(deployed.tokenAddress != address(0), "Token not found");
        require(!deployed.lpCreated, "LP already created");
        require(msg.value > 0, "ETH required");
        
        // Implementation would interact with Uniswap V3
        // Simplified here - actual implementation needs position manager calls
        
        deployed.lpCreated = true;
        
        emit LiquidityAdded(deployId, deployed.tokenAddress, address(0), 0, msg.value);
    }
    
    // ============================================
    // View Functions
    // ============================================
    
    /**
     * @notice Get all tokens created by an address
     */
    function getCreatorTokens(address creator) external view returns (uint256[] memory) {
        return creatorTokens[creator];
    }
    
    /**
     * @notice Get deployment details
     */
    function getDeployment(uint256 deployId) external view returns (DeployedToken memory) {
        return deployedTokens[deployId];
    }
    
    /**
     * @notice Get total deployments
     */
    function getTotalDeployments() external view returns (uint256) {
        return deploymentCount;
    }
    
    // ============================================
    // Admin Functions
    // ============================================
    
    function setAIAgent(address _aiAgent) external onlyOwner {
        require(_aiAgent != address(0), "Invalid agent");
        address oldAgent = aiAgent;
        aiAgent = _aiAgent;
        emit AIAgentUpdated(oldAgent, _aiAgent);
    }
    
    function setProtocolFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high"); // Max 10%
        uint256 oldFee = protocolFee;
        protocolFee = _fee;
        emit ProtocolFeeUpdated(oldFee, _fee);
    }
    
    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");
        feeRecipient = _recipient;
    }
    
    function setMinDeploymentFee(uint256 _fee) external onlyOwner {
        minDeploymentFee = _fee;
    }
    
    // ============================================
    // Internal Functions
    // ============================================
    
    function _verifySignature(
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        address creator,
        uint256 deadline,
        bytes calldata signature
    ) internal {
        if (block.timestamp > deadline) revert SignatureExpired();
        
        bytes32 structHash = keccak256(
            abi.encode(
                DEPLOY_TYPEHASH,
                keccak256(bytes(name)),
                keccak256(bytes(symbol)),
                totalSupply,
                creator,
                deploymentCount, // nonce
                deadline
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );
        
        if (usedSignatures[digest]) revert SignatureUsed();
        usedSignatures[digest] = true;
        
        address signer = _recover(digest, signature);
        if (signer != aiAgent) revert InvalidSignature();
    }
    
    function _recover(bytes32 hash, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) revert InvalidSignature();
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        
        if (v < 27) v += 27;
        
        return ecrecover(hash, v, r, s);
    }
    
    receive() external payable {}
}
