// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title DualNFT - Image-Token Duality NFT
 * @author 8004 Mint Team
 * @notice NFT with bound tokens - each NFT represents 100 NFT tokens
 * @dev Built on EIP-8004 platform
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         DualNFT Architecture                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                          │
 * │   User sends 10 STORY to contract                                       │
 * │         │                                                                │
 * │         ├──► 2 STORY burned (sent to dead address)                      │
 * │         ├──► 8 STORY returned to user                                   │
 * │         └──► 1 NFT minted (bound to 100 NFT tokens)                     │
 * │                                                                          │
 * │   ┌─────────────────────────────────────────────────────────────────┐   │
 * │   │  NFT #1234                                                       │   │
 * │   │  ┌─────────────┐  ┌─────────────────────────────────────────┐  │   │
 * │   │  │   Image     │  │  100 NFT Tokens (bound, non-separable)  │  │   │
 * │   │  │   (ERC-721) │  │  Transfer together with NFT             │  │   │
 * │   │  └─────────────┘  └─────────────────────────────────────────┘  │   │
 * │   └─────────────────────────────────────────────────────────────────┘   │
 * │                                                                          │
 * │   Total Supply: 10,000 NFTs = 1,000,000 NFT Tokens                      │
 * │                                                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
contract DualNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Strings for uint256;

    // ============================================
    // Constants
    // ============================================
    
    /// @notice Amount of STORY required to mint (10 STORY with 18 decimals)
    uint256 public constant MINT_PRICE = 10 * 10**18;
    
    /// @notice Amount of STORY to burn (2 STORY)
    uint256 public constant BURN_AMOUNT = 2 * 10**18;
    
    /// @notice Amount of STORY to return (8 STORY)
    uint256 public constant RETURN_AMOUNT = 8 * 10**18;
    
    /// @notice Tokens bound to each NFT
    uint256 public constant TOKENS_PER_NFT = 100;
    
    /// @notice Maximum NFT supply
    uint256 public constant MAX_SUPPLY = 10000;
    
    /// @notice Total token supply (MAX_SUPPLY * TOKENS_PER_NFT)
    uint256 public constant TOTAL_TOKEN_SUPPLY = MAX_SUPPLY * TOKENS_PER_NFT;
    
    /// @notice Dead address for burning
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // ============================================
    // State Variables
    // ============================================
    
    /// @notice STORY token contract
    IERC20 public immutable storyToken;
    
    /// @notice Current token ID counter
    uint256 private _tokenIdCounter;
    
    /// @notice Base URI for metadata
    string private _baseTokenURI;
    
    /// @notice Mapping from token ID to mint timestamp
    mapping(uint256 => uint256) public mintTimestamp;
    
    /// @notice Mapping from token ID to minter address
    mapping(uint256 => address) public minter;
    
    /// @notice Total STORY burned
    uint256 public totalStoryBurned;
    
    /// @notice Minting enabled flag
    bool public mintingEnabled = true;

    // ============================================
    // Events
    // ============================================
    
    /// @notice Emitted when NFT is minted
    event NFTMinted(
        address indexed user,
        uint256 indexed tokenId,
        uint256 storyBurned,
        uint256 storyReturned,
        uint256 boundTokens
    );
    
    /// @notice Emitted when NFT is transferred (with bound tokens)
    event DualTransfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId,
        uint256 boundTokens
    );
    
    /// @notice Emitted when base URI is updated
    event BaseURIUpdated(string newBaseURI);
    
    /// @notice Emitted when minting is toggled
    event MintingToggled(bool enabled);

    // ============================================
    // Errors
    // ============================================
    
    error MintingDisabled();
    error MaxSupplyReached();
    error InsufficientAllowance();
    error TransferFailed();
    error InvalidTokenId();

    // ============================================
    // Constructor
    // ============================================
    
    /**
     * @notice Initialize DualNFT contract
     * @param _storyToken Address of STORY token contract
     * @param _initialBaseURI Initial base URI for metadata
     */
    constructor(
        address _storyToken,
        string memory _initialBaseURI
    ) ERC721("DualNFT", "NFT") Ownable(msg.sender) {
        storyToken = IERC20(_storyToken);
        _baseTokenURI = _initialBaseURI;
    }

    // ============================================
    // Minting Functions
    // ============================================
    
    /**
     * @notice Mint a new NFT by spending 10 STORY
     * @dev User must approve contract to spend 10 STORY first
     *      2 STORY burned, 8 STORY returned, 1 NFT minted
     * @return tokenId The ID of the newly minted NFT
     */
    function mint() external nonReentrant returns (uint256 tokenId) {
        if (!mintingEnabled) revert MintingDisabled();
        if (_tokenIdCounter >= MAX_SUPPLY) revert MaxSupplyReached();
        
        // Check allowance
        uint256 allowance = storyToken.allowance(msg.sender, address(this));
        if (allowance < MINT_PRICE) revert InsufficientAllowance();
        
        // Transfer 10 STORY from user to contract
        bool success = storyToken.transferFrom(msg.sender, address(this), MINT_PRICE);
        if (!success) revert TransferFailed();
        
        // Burn 2 STORY (send to dead address)
        success = storyToken.transfer(DEAD_ADDRESS, BURN_AMOUNT);
        if (!success) revert TransferFailed();
        
        // Return 8 STORY to user
        success = storyToken.transfer(msg.sender, RETURN_AMOUNT);
        if (!success) revert TransferFailed();
        
        // Mint NFT
        tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(msg.sender, tokenId);
        
        // Record mint info
        mintTimestamp[tokenId] = block.timestamp;
        minter[tokenId] = msg.sender;
        totalStoryBurned += BURN_AMOUNT;
        
        emit NFTMinted(msg.sender, tokenId, BURN_AMOUNT, RETURN_AMOUNT, TOKENS_PER_NFT);
        
        return tokenId;
    }
    
    /**
     * @notice Batch mint multiple NFTs
     * @param amount Number of NFTs to mint
     * @return tokenIds Array of minted token IDs
     */
    function batchMint(uint256 amount) external nonReentrant returns (uint256[] memory tokenIds) {
        if (!mintingEnabled) revert MintingDisabled();
        if (_tokenIdCounter + amount > MAX_SUPPLY) revert MaxSupplyReached();
        
        uint256 totalCost = MINT_PRICE * amount;
        uint256 allowance = storyToken.allowance(msg.sender, address(this));
        if (allowance < totalCost) revert InsufficientAllowance();
        
        // Transfer all STORY from user
        bool success = storyToken.transferFrom(msg.sender, address(this), totalCost);
        if (!success) revert TransferFailed();
        
        // Burn portion
        uint256 totalBurn = BURN_AMOUNT * amount;
        success = storyToken.transfer(DEAD_ADDRESS, totalBurn);
        if (!success) revert TransferFailed();
        
        // Return portion
        uint256 totalReturn = RETURN_AMOUNT * amount;
        success = storyToken.transfer(msg.sender, totalReturn);
        if (!success) revert TransferFailed();
        
        // Mint NFTs
        tokenIds = new uint256[](amount);
        for (uint256 i = 0; i < amount; i++) {
            uint256 tokenId = _tokenIdCounter;
            _tokenIdCounter++;
            
            _safeMint(msg.sender, tokenId);
            
            mintTimestamp[tokenId] = block.timestamp;
            minter[tokenId] = msg.sender;
            tokenIds[i] = tokenId;
            
            emit NFTMinted(msg.sender, tokenId, BURN_AMOUNT, RETURN_AMOUNT, TOKENS_PER_NFT);
        }
        
        totalStoryBurned += totalBurn;
        
        return tokenIds;
    }

    // ============================================
    // Token Balance Functions (Dual Nature)
    // ============================================
    
    /**
     * @notice Get NFT token balance for an address
     * @dev Each NFT represents 100 NFT tokens
     * @param account Address to query
     * @return Token balance (NFT count × 100)
     */
    function tokenBalanceOf(address account) external view returns (uint256) {
        return balanceOf(account) * TOKENS_PER_NFT;
    }
    
    /**
     * @notice Get total circulating NFT tokens
     * @return Total minted NFTs × 100
     */
    function circulatingTokenSupply() external view returns (uint256) {
        return _tokenIdCounter * TOKENS_PER_NFT;
    }
    
    /**
     * @notice Get bound tokens for a specific NFT
     * @param tokenId NFT token ID
     * @return Always returns TOKENS_PER_NFT (100) if token exists
     */
    function boundTokens(uint256 tokenId) external view returns (uint256) {
        if (tokenId >= _tokenIdCounter) revert InvalidTokenId();
        return TOKENS_PER_NFT;
    }

    // ============================================
    // View Functions
    // ============================================
    
    /**
     * @notice Get current minted supply
     */
    function totalSupply() public view override(ERC721Enumerable) returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @notice Get remaining mintable NFTs
     */
    function remainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - _tokenIdCounter;
    }
    
    /**
     * @notice Get mint info for a token
     * @param tokenId Token ID to query
     * @return mintTime Timestamp when minted
     * @return minterAddr Address that minted
     * @return tokens Bound token amount
     */
    function getMintInfo(uint256 tokenId) external view returns (
        uint256 mintTime,
        address minterAddr,
        uint256 tokens
    ) {
        if (tokenId >= _tokenIdCounter) revert InvalidTokenId();
        return (mintTimestamp[tokenId], minter[tokenId], TOKENS_PER_NFT);
    }
    
    /**
     * @notice Get all token IDs owned by an address
     * @param owner Address to query
     * @return Array of token IDs
     */
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokens = new uint256[](tokenCount);
        
        for (uint256 i = 0; i < tokenCount; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return tokens;
    }

    // ============================================
    // Admin Functions
    // ============================================
    
    /**
     * @notice Set base URI for metadata
     * @param newBaseURI New base URI
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }
    
    /**
     * @notice Toggle minting enabled/disabled
     */
    function toggleMinting() external onlyOwner {
        mintingEnabled = !mintingEnabled;
        emit MintingToggled(mintingEnabled);
    }
    
    /**
     * @notice Emergency withdraw stuck tokens
     * @param token Token address to withdraw
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).transfer(to, amount);
    }

    // ============================================
    // Override Functions
    // ============================================
    
    /**
     * @dev Override transfer to emit DualTransfer event
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);
        address result = super._update(to, tokenId, auth);
        
        // Emit dual transfer event (NFT + bound tokens)
        if (from != address(0) && to != address(0)) {
            emit DualTransfer(from, to, tokenId, TOKENS_PER_NFT);
        }
        
        return result;
    }
    
    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
    
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        if (tokenId >= _tokenIdCounter) revert InvalidTokenId();
        
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 
            ? string(abi.encodePacked(baseURI, tokenId.toString(), ".json"))
            : "";
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
