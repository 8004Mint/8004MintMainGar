// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StoryToken
 * @notice Participate-to-mint: agent scores user content; score >= 60 allows one claim with backend signature.
 *         100 tokens per claim, 1,000,000 total supply.
 *         RESERVED_FOR_LP (400,000 = 40%) reserved for owner to add liquidity.
 *         Mint cost: 10 USDC per claim (enforced off-chain).
 */
contract EssayGatedToken is ERC20, EIP712, Ownable {
    using ECDSA for bytes32;

    uint256 public constant MAX_SUPPLY = 1_000_000 * 1e18;
    /// @dev Reserved for owner to add LP (40% of total supply); minted to owner at deploy
    uint256 public constant RESERVED_FOR_LP = 400_000 * 1e18;
    uint256 public constant MINT_AMOUNT = 100 * 1e18;
    uint256 public constant MIN_SCORE = 60;
    uint256 public constant CAMPAIGN_ID = 1;

    address public issuer;

    mapping(address => bool) public claimed;
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    bytes32 private constant CLAIM_TYPEHASH =
        keccak256(
            "Claim(address recipient,bytes32 textHash,uint256 score,uint256 nonce,uint256 deadline,uint256 campaignId)"
        );

    event IssuerUpdated(address indexed issuer);
    event Claimed(address indexed recipient, bytes32 indexed textHash, uint256 score, uint256 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        address issuer_
    ) ERC20(name_, symbol_) EIP712(name_, "1") Ownable(msg.sender) {
        issuer = issuer_;
        emit IssuerUpdated(issuer_);
        // Pre-mint reserved supply to owner for liquidity with fee proceeds
        _mint(msg.sender, RESERVED_FOR_LP);
    }

    function setIssuer(address newIssuer) external onlyOwner {
        require(newIssuer != address(0), "issuer=0");
        issuer = newIssuer;
        emit IssuerUpdated(newIssuer);
    }

    function claim(
        bytes32 textHash,
        uint256 score,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, "expired");
        require(!claimed[msg.sender], "already claimed");
        require(!usedNonces[msg.sender][nonce], "nonce used");
        require(score >= MIN_SCORE, "score too low");
        require(totalSupply() + MINT_AMOUNT <= MAX_SUPPLY, "max supply reached");

        bytes32 structHash = keccak256(
            abi.encode(
                CLAIM_TYPEHASH,
                msg.sender,
                textHash,
                score,
                nonce,
                deadline,
                CAMPAIGN_ID
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = digest.recover(signature);
        require(recovered == issuer, "bad signature");

        usedNonces[msg.sender][nonce] = true;
        claimed[msg.sender] = true;

        _mint(msg.sender, MINT_AMOUNT);
        emit Claimed(msg.sender, textHash, score, MINT_AMOUNT);
    }
}
