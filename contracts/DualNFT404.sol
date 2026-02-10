// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DualNFT404
 * @notice ERC-404 style contract: Combined ERC-721 + ERC-20
 * 
 * Features:
 * - Each NFT is bound to 100 tokens (1 NFT = 100 $DUAL)
 * - Transfer NFT = Transfer 100 tokens together
 * - Accumulate 100 tokens = Auto-mint NFT
 * - Transfer 100 tokens = Auto-transfer NFT
 * 
 * Minting:
 * - Pay 10 STORY to mint
 * - 2 STORY burned, 8 STORY returned
 * - Receive 1 NFT + 100 $DUAL tokens
 */
contract DualNFT404 is Ownable, ReentrancyGuard {
    // ERC-165 Interface IDs
    bytes4 private constant _INTERFACE_ID_ERC165 = 0x01ffc9a7;
    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 private constant _INTERFACE_ID_ERC721_METADATA = 0x5b5e139f;
    bytes4 private constant _INTERFACE_ID_ERC721_ENUMERABLE = 0x780e9d63;
    // ============ Constants ============
    
    string public constant name = "DualNFT";
    string public constant symbol = "DUAL";
    uint8 public constant decimals = 18;
    
    uint256 public constant TOKENS_PER_NFT = 100 * 10**18;  // 100 tokens per NFT
    uint256 public constant MAX_NFT_SUPPLY = 10000;
    uint256 public constant MINT_PRICE = 10 * 10**18;       // 10 STORY
    uint256 public constant BURN_AMOUNT = 2 * 10**18;       // 2 STORY burned
    uint256 public constant RETURN_AMOUNT = 8 * 10**18;     // 8 STORY returned
    
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    // ============ State ============
    
    IERC20 public immutable storyToken;
    string public baseURI;
    bool public mintingEnabled = true;
    
    // ERC-20 state
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ERC-721 state
    uint256 public totalNFTSupply;
    uint256 private _nextTokenId;
    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256[]) private _ownedTokens;
    mapping(uint256 => uint256) private _ownedTokensIndex;
    mapping(uint256 => address) public getApproved;
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    
    // Whitelist: addresses exempt from auto NFT mint/burn (e.g., pools, routers)
    mapping(address => bool) public whitelist;
    
    // ============ Events ============
    
    // ERC-20 events
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);
    
    // ERC-721 events
    event NFTTransfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event NFTApproval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    
    // Custom events
    event Mint(address indexed to, uint256 tokenId, uint256 tokenAmount);
    
    // ============ Constructor ============
    
    constructor(address _storyToken, string memory _baseURI) Ownable(msg.sender) {
        storyToken = IERC20(_storyToken);
        baseURI = _baseURI;
    }
    
    // ============ Mint Function ============
    
    /**
     * @notice Mint 1 NFT + 100 DUAL tokens
     * @dev Requires 10 STORY approval. 2 burned, 8 returned.
     */
    function mint() external nonReentrant returns (uint256 tokenId) {
        require(mintingEnabled, "Minting disabled");
        require(totalNFTSupply < MAX_NFT_SUPPLY, "Max supply reached");
        
        // Transfer STORY from user
        require(storyToken.transferFrom(msg.sender, address(this), MINT_PRICE), "Transfer failed");
        
        // Burn 2 STORY
        require(storyToken.transfer(DEAD_ADDRESS, BURN_AMOUNT), "Burn failed");
        
        // Return 8 STORY
        require(storyToken.transfer(msg.sender, RETURN_AMOUNT), "Return failed");
        
        // Mint NFT
        tokenId = _nextTokenId++;
        _mintNFT(msg.sender, tokenId);
        
        // Mint 100 tokens
        _mintTokens(msg.sender, TOKENS_PER_NFT);
        
        emit Mint(msg.sender, tokenId, TOKENS_PER_NFT);
    }
    
    // ============ ERC-20 Functions ============
    
    /**
     * @notice Transfer tokens (and potentially NFTs)
     */
    function transfer(address to, uint256 amount) public returns (bool) {
        return _transfer(msg.sender, to, amount);
    }
    
    /**
     * @notice Transfer tokens from another address
     */
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "Insufficient allowance");
            allowance[from][msg.sender] = allowed - amount;
        }
        return _transfer(from, to, amount);
    }
    
    /**
     * @notice Approve token spending
     */
    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    // ============ ERC-721 Functions ============
    
    /**
     * @notice Transfer NFT (and 100 tokens with it)
     */
    function transferNFT(address from, address to, uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized");
        _transferNFT(from, to, tokenId);
        
        // Transfer 100 tokens with the NFT
        _transferTokensOnly(from, to, TOKENS_PER_NFT);
    }
    
    /**
     * @notice Approve NFT transfer
     */
    function approveNFT(address to, uint256 tokenId) public {
        address owner = ownerOf[tokenId];
        require(msg.sender == owner || isApprovedForAll[owner][msg.sender], "Not authorized");
        getApproved[tokenId] = to;
        emit NFTApproval(owner, to, tokenId);
    }
    
    /**
     * @notice Set approval for all NFTs
     */
    function setApprovalForAll(address operator, bool approved) public {
        isApprovedForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }
    
    // ============ ERC-165 ============
    
    /**
     * @notice Check if contract supports interface (required for OpenSea)
     */
    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return interfaceId == _INTERFACE_ID_ERC165 ||
               interfaceId == _INTERFACE_ID_ERC721 ||
               interfaceId == _INTERFACE_ID_ERC721_METADATA ||
               interfaceId == _INTERFACE_ID_ERC721_ENUMERABLE;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get number of NFTs owned by address
     */
    function nftBalanceOf(address owner) public view returns (uint256) {
        return _ownedTokens[owner].length;
    }
    
    /**
     * @notice Get token ID at index for owner
     */
    function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256) {
        require(index < _ownedTokens[owner].length, "Index out of bounds");
        return _ownedTokens[owner][index];
    }
    
    /**
     * @notice Get all NFT IDs owned by address
     */
    function tokensOfOwner(address owner) public view returns (uint256[] memory) {
        return _ownedTokens[owner];
    }
    
    /**
     * @notice Get token URI
     */
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(ownerOf[tokenId] != address(0), "Token does not exist");
        return string(abi.encodePacked(baseURI, _toString(tokenId), ".json"));
    }
    
    // ============ Admin Functions ============
    
    function setBaseURI(string memory _baseURI) external onlyOwner {
        baseURI = _baseURI;
    }
    
    function setMintingEnabled(bool _enabled) external onlyOwner {
        mintingEnabled = _enabled;
    }
    
    function setWhitelist(address account, bool whitelisted) external onlyOwner {
        whitelist[account] = whitelisted;
    }
    
    // ============ Internal Functions ============
    
    function _transfer(address from, address to, uint256 amount) internal returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        
        // Calculate NFTs to transfer
        uint256 nftsToTransfer = amount / TOKENS_PER_NFT;
        
        // Update balances
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(from, to, amount);
        
        // Handle NFT transfers (if not whitelisted)
        if (nftsToTransfer > 0 && !whitelist[from] && !whitelist[to]) {
            // Transfer NFTs from sender to receiver
            uint256 senderNFTs = _ownedTokens[from].length;
            uint256 toTransfer = nftsToTransfer > senderNFTs ? senderNFTs : nftsToTransfer;
            
            for (uint256 i = 0; i < toTransfer; i++) {
                uint256 tokenId = _ownedTokens[from][_ownedTokens[from].length - 1];
                _transferNFT(from, to, tokenId);
            }
        }
        
        // Handle auto-burn (if sender has excess NFTs)
        if (!whitelist[from]) {
            uint256 expectedNFTs = balanceOf[from] / TOKENS_PER_NFT;
            while (_ownedTokens[from].length > expectedNFTs) {
                uint256 tokenId = _ownedTokens[from][_ownedTokens[from].length - 1];
                _burnNFT(from, tokenId);
            }
        }
        
        // Handle auto-mint (if receiver should get more NFTs)
        if (!whitelist[to]) {
            uint256 expectedNFTs = balanceOf[to] / TOKENS_PER_NFT;
            while (_ownedTokens[to].length < expectedNFTs && totalNFTSupply < MAX_NFT_SUPPLY) {
                uint256 tokenId = _nextTokenId++;
                _mintNFT(to, tokenId);
            }
        }
        
        return true;
    }
    
    function _transferTokensOnly(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "Insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
    
    function _mintTokens(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function _mintNFT(address to, uint256 tokenId) internal {
        ownerOf[tokenId] = to;
        _ownedTokensIndex[tokenId] = _ownedTokens[to].length;
        _ownedTokens[to].push(tokenId);
        totalNFTSupply++;
        emit NFTTransfer(address(0), to, tokenId);
    }
    
    function _transferNFT(address from, address to, uint256 tokenId) internal {
        require(ownerOf[tokenId] == from, "Not owner");
        require(to != address(0), "Transfer to zero");
        
        // Clear approval
        getApproved[tokenId] = address(0);
        
        // Remove from sender
        uint256 lastIndex = _ownedTokens[from].length - 1;
        uint256 tokenIndex = _ownedTokensIndex[tokenId];
        if (tokenIndex != lastIndex) {
            uint256 lastTokenId = _ownedTokens[from][lastIndex];
            _ownedTokens[from][tokenIndex] = lastTokenId;
            _ownedTokensIndex[lastTokenId] = tokenIndex;
        }
        _ownedTokens[from].pop();
        
        // Add to receiver
        ownerOf[tokenId] = to;
        _ownedTokensIndex[tokenId] = _ownedTokens[to].length;
        _ownedTokens[to].push(tokenId);
        
        emit NFTTransfer(from, to, tokenId);
    }
    
    function _burnNFT(address from, uint256 tokenId) internal {
        require(ownerOf[tokenId] == from, "Not owner");
        
        // Clear approval
        getApproved[tokenId] = address(0);
        
        // Remove from owner
        uint256 lastIndex = _ownedTokens[from].length - 1;
        uint256 tokenIndex = _ownedTokensIndex[tokenId];
        if (tokenIndex != lastIndex) {
            uint256 lastTokenId = _ownedTokens[from][lastIndex];
            _ownedTokens[from][tokenIndex] = lastTokenId;
            _ownedTokensIndex[lastTokenId] = tokenIndex;
        }
        _ownedTokens[from].pop();
        
        // Clear ownership
        ownerOf[tokenId] = address(0);
        totalNFTSupply--;
        
        emit NFTTransfer(from, address(0), tokenId);
    }
    
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = ownerOf[tokenId];
        return (spender == owner || getApproved[tokenId] == spender || isApprovedForAll[owner][spender]);
    }
    
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
