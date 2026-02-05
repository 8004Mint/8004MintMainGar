// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @dev EIP-1271: contract wallet signature verification
interface IERC1271 {
    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4 magicValue);
}

/**
 * @title IdentityRegistry
 * @dev ERC-8004 Identity Registry: ERC-721 with URIStorage for agent identity.
 * agentRegistry = "eip155:{chainId}:{address(this)}", agentId = tokenId.
 */
contract IdentityRegistry is ERC721URIStorage, EIP712 {
    using ECDSA for bytes32;

    bytes32 private constant SET_AGENT_WALLET_TYPEHASH =
        keccak256("SetAgentWallet(uint256 agentId,address newWallet,uint256 deadline)");

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);
    event MetadataSet(uint256 indexed agentId, string indexed metadataKeyIndexed, string metadataKey, bytes metadataValue);
    event AgentWalletSet(uint256 indexed agentId, address indexed newWallet);

    uint256 private _nextAgentId = 1;

    mapping(uint256 => address) private _agentWallets;
    mapping(uint256 => mapping(string => bytes)) private _metadata;

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        EIP712(name_, "1")
    {}

    /// @dev EIP-8004: register with no URI; agentURI is added later with setAgentURI()
    function register() external returns (uint256 agentId) {
        agentId = _nextAgentId;
        _nextAgentId++;
        _safeMint(msg.sender, agentId);
        _agentWallets[agentId] = msg.sender;
        emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encode(msg.sender));
        emit Registered(agentId, "", msg.sender);
        return agentId;
    }

    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = _nextAgentId;
        _nextAgentId++;
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);
        _agentWallets[agentId] = msg.sender;
        emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encode(msg.sender));
        emit Registered(agentId, agentURI, msg.sender);
        return agentId;
    }

    function register(string calldata agentURI, MetadataEntry[] calldata metadata) external returns (uint256 agentId) {
        agentId = _nextAgentId;
        _nextAgentId++;
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);
        _agentWallets[agentId] = msg.sender;
        emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encode(msg.sender));
        for (uint256 i = 0; i < metadata.length; i++) {
            require(keccak256(bytes(metadata[i].metadataKey)) != keccak256("agentWallet"), "reserved key");
            _metadata[agentId][metadata[i].metadataKey] = metadata[i].metadataValue;
            emit MetadataSet(agentId, metadata[i].metadataKey, metadata[i].metadataKey, metadata[i].metadataValue);
        }
        emit Registered(agentId, agentURI, msg.sender);
        return agentId;
    }

    function setAgentURI(uint256 agentId, string calldata newURI) external {
        require(ownerOf(agentId) == msg.sender || getApproved(agentId) == msg.sender || isApprovedForAll(ownerOf(agentId), msg.sender), "not owner or operator");
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    function getMetadata(uint256 agentId, string calldata metadataKey) external view returns (bytes memory) {
        require(ownerOf(agentId) != address(0), "invalid agent");
        if (keccak256(bytes(metadataKey)) == keccak256("agentWallet")) {
            return abi.encode(getAgentWallet(agentId));
        }
        return _metadata[agentId][metadataKey];
    }

    function setMetadata(uint256 agentId, string calldata metadataKey, bytes calldata metadataValue) external {
        require(ownerOf(agentId) == msg.sender || getApproved(agentId) == msg.sender || isApprovedForAll(ownerOf(agentId), msg.sender), "not owner or operator");
        require(keccak256(bytes(metadataKey)) != keccak256("agentWallet"), "reserved key");
        _metadata[agentId][metadataKey] = metadataValue;
        emit MetadataSet(agentId, metadataKey, metadataKey, metadataValue);
    }

    function getAgentWallet(uint256 agentId) public view returns (address) {
        address w = _agentWallets[agentId];
        if (w != address(0)) return w;
        return ownerOf(agentId);
    }

    function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external {
        require(block.timestamp <= deadline, "expired");
        require(ownerOf(agentId) == msg.sender, "not owner");
        bytes32 structHash = keccak256(abi.encode(SET_AGENT_WALLET_TYPEHASH, agentId, newWallet, deadline));
        bytes32 digest = _hashTypedDataV4(structHash);
        if (newWallet.code.length > 0) {
            require(
                IERC1271(newWallet).isValidSignature(digest, signature) == IERC1271.isValidSignature.selector,
                "invalid signature"
            );
        } else {
            address signer = digest.recover(signature);
            require(signer == newWallet, "invalid signature");
        }
        _agentWallets[agentId] = newWallet;
        emit AgentWalletSet(agentId, newWallet);
    }

    function unsetAgentWallet(uint256 agentId) external {
        require(ownerOf(agentId) == msg.sender, "not owner");
        _agentWallets[agentId] = address(0);
        emit AgentWalletSet(agentId, address(0));
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        from = super._update(to, tokenId, auth);
        if (to != address(0)) {
            _agentWallets[tokenId] = address(0);
        }
        return from;
    }

    struct MetadataEntry {
        string metadataKey;
        bytes metadataValue;
    }
}
