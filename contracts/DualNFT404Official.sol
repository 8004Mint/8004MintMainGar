//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC404} from "./ERC404Base.sol";

/**
 * @title DualNFT404Official
 * @notice ERC-404 NFT with STORY token minting
 * 
 * Based on official Pandora Labs ERC-404 implementation
 * https://github.com/Pandora-Labs-Org/erc404
 * 
 * Features:
 * - Pay 10 STORY to mint
 * - 2 STORY burned, 8 STORY returned
 * - Each NFT = 1 full token unit
 * - Native ERC-20 + ERC-721 support
 */
contract DualNFT404Official is Ownable, ERC404, ReentrancyGuard {
    using Strings for uint256;

    // ============ Constants ============
    
    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public constant MINT_PRICE = 10 * 10**18;       // 10 STORY
    uint256 public constant BURN_AMOUNT = 2 * 10**18;       // 2 STORY burned
    uint256 public constant RETURN_AMOUNT = 8 * 10**18;     // 8 STORY returned
    
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    // ============ State ============
    
    IERC20 public immutable storyToken;
    string public baseTokenURI;
    bool public mintingEnabled = true;
    uint256 public mintedCount;
    
    // ============ Events ============
    
    event Mint(address indexed to, uint256 amount);
    
    // ============ Constructor ============
    
    constructor(
        address _storyToken,
        string memory _baseTokenURI,
        address _initialOwner
    ) ERC404("DualNFT", "DUAL", 18) Ownable(_initialOwner) {
        storyToken = IERC20(_storyToken);
        baseTokenURI = _baseTokenURI;
        // Owner is NOT exempt - they will receive NFTs automatically
    }
    
    // ============ Mint Function ============
    
    /**
     * @notice Mint 1 NFT + 1 DUAL token
     * @dev Requires 10 STORY approval. 2 burned, 8 returned.
     */
    function mint() external nonReentrant returns (uint256) {
        require(mintingEnabled, "Minting disabled");
        require(mintedCount < MAX_SUPPLY, "Max supply reached");
        
        // Transfer STORY from user
        require(storyToken.transferFrom(msg.sender, address(this), MINT_PRICE), "Transfer failed");
        
        // Burn 2 STORY
        require(storyToken.transfer(DEAD_ADDRESS, BURN_AMOUNT), "Burn failed");
        
        // Return 8 STORY
        require(storyToken.transfer(msg.sender, RETURN_AMOUNT), "Return failed");
        
        // Mint 1 full token unit (which includes 1 NFT)
        _mintERC20(msg.sender, units);
        
        mintedCount++;
        
        emit Mint(msg.sender, units);
        
        return mintedCount - 1;
    }
    
    /**
     * @notice Batch mint multiple NFTs
     */
    function batchMint(uint256 count) external nonReentrant returns (uint256[] memory) {
        require(mintingEnabled, "Minting disabled");
        require(count > 0 && count <= 10, "Invalid count");
        require(mintedCount + count <= MAX_SUPPLY, "Exceeds max supply");
        
        uint256 totalCost = MINT_PRICE * count;
        uint256 totalBurn = BURN_AMOUNT * count;
        uint256 totalReturn = RETURN_AMOUNT * count;
        
        // Transfer STORY from user
        require(storyToken.transferFrom(msg.sender, address(this), totalCost), "Transfer failed");
        
        // Burn STORY
        require(storyToken.transfer(DEAD_ADDRESS, totalBurn), "Burn failed");
        
        // Return STORY
        require(storyToken.transfer(msg.sender, totalReturn), "Return failed");
        
        // Mint tokens
        _mintERC20(msg.sender, units * count);
        
        uint256[] memory tokenIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            tokenIds[i] = mintedCount + i;
        }
        
        mintedCount += count;
        
        emit Mint(msg.sender, units * count);
        
        return tokenIds;
    }
    
    // ============ ERC-165 Interface Support ============
    
    /// @dev ERC-721 interface ID for OpenSea compatibility
    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 private constant _INTERFACE_ID_ERC721_METADATA = 0x5b5e139f;
    
    /**
     * @notice Override supportsInterface to add ERC-721 support
     * @dev This makes OpenSea recognize the collection properly
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return 
            interfaceId == _INTERFACE_ID_ERC721 ||
            interfaceId == _INTERFACE_ID_ERC721_METADATA ||
            super.supportsInterface(interfaceId);
    }
    
    // ============ Token URI ============
    
    /// @dev ID_ENCODING_PREFIX from ERC404 base contract
    uint256 private constant _ID_ENCODING_PREFIX = 1 << 255;
    
    function tokenURI(uint256 id_) public view override returns (string memory) {
        // Decode the ERC-404 encoded ID to get the actual token ID
        // ERC-404 encodes IDs as: encodedId = ID_ENCODING_PREFIX + actualId
        uint256 actualId = id_;
        if (id_ >= _ID_ENCODING_PREFIX) {
            actualId = id_ - _ID_ENCODING_PREFIX;
        }
        return string.concat(baseTokenURI, actualId.toString(), ".json");
    }
    
    // ============ Admin Functions ============
    
    function setBaseTokenURI(string memory _baseTokenURI) external onlyOwner {
        baseTokenURI = _baseTokenURI;
    }
    
    function setMintingEnabled(bool _enabled) external onlyOwner {
        mintingEnabled = _enabled;
    }
    
    function setERC721TransferExempt(address account_, bool value_) external onlyOwner {
        _setERC721TransferExempt(account_, value_);
    }
    
    // ============ View Functions ============
    
    function totalNFTSupply() external view returns (uint256) {
        return mintedCount;
    }
}
