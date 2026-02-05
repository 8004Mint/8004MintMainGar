// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IIdentityRegistry.sol";

/**
 * @title ValidationRegistry
 * @dev ERC-8004 Validation Registry: agents request validation, validators respond.
 */
contract ValidationRegistry {
    IIdentityRegistry public identityRegistry;

    struct Request {
        address validatorAddress;
        uint256 agentId;
        uint8 response;
        bytes32 responseHash;
        string tag;
        uint256 lastUpdate;
        bool exists;
    }

    mapping(bytes32 => Request) public requests;
    mapping(uint256 => bytes32[]) private _agentValidations;
    mapping(address => bytes32[]) private _validatorRequests;

    event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestURI, bytes32 indexed requestHash);
    event ValidationResponse(
        address indexed validatorAddress,
        uint256 indexed agentId,
        bytes32 indexed requestHash,
        uint8 response,
        string responseURI,
        bytes32 responseHash,
        string tag
    );

    constructor() {
        identityRegistry = IIdentityRegistry(address(0));
    }

    function initialize(address identityRegistry_) external {
        require(address(identityRegistry) == address(0), "already init");
        identityRegistry = IIdentityRegistry(identityRegistry_);
    }

    function getIdentityRegistry() external view returns (address) {
        return address(identityRegistry);
    }

    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestURI,
        bytes32 requestHash
    ) external {
        address owner = identityRegistry.ownerOf(agentId);
        require(owner != address(0), "invalid agent");
        require(
            msg.sender == owner || msg.sender == identityRegistry.getApproved(agentId) || identityRegistry.isApprovedForAll(owner, msg.sender),
            "not owner or operator"
        );
        require(!requests[requestHash].exists, "request exists");
        requests[requestHash] = Request({
            validatorAddress: validatorAddress,
            agentId: agentId,
            response: 0,
            responseHash: bytes32(0),
            tag: "",
            lastUpdate: block.timestamp,
            exists: true
        });
        _agentValidations[agentId].push(requestHash);
        _validatorRequests[validatorAddress].push(requestHash);
        emit ValidationRequest(validatorAddress, agentId, requestURI, requestHash);
    }

    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external {
        Request storage r = requests[requestHash];
        require(r.exists, "no request");
        require(r.validatorAddress == msg.sender, "not validator");
        require(response <= 100, "response > 100");
        r.response = response;
        r.responseHash = responseHash;
        r.tag = tag;
        r.lastUpdate = block.timestamp;
        emit ValidationResponse(r.validatorAddress, r.agentId, requestHash, response, responseURI, responseHash, tag);
    }

    function getValidationStatus(bytes32 requestHash)
        external
        view
        returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 responseHash, string memory tag, uint256 lastUpdate)
    {
        Request storage r = requests[requestHash];
        require(r.exists, "no request");
        return (r.validatorAddress, r.agentId, r.response, r.responseHash, r.tag, r.lastUpdate);
    }

    function getSummary(
        uint256 agentId,
        address[] calldata validatorAddresses,
        string calldata tagFilter
    ) external view returns (uint64 count, uint8 averageResponse) {
        bytes32[] storage hashes = _agentValidations[agentId];
        uint256 sum = 0;
        count = 0;
        for (uint256 i = 0; i < hashes.length; i++) {
            Request storage r = requests[hashes[i]];
            if (validatorAddresses.length > 0) {
                bool ok = false;
                for (uint256 j = 0; j < validatorAddresses.length; j++) {
                    if (r.validatorAddress == validatorAddresses[j]) { ok = true; break; }
                }
                if (!ok) continue;
            }
            if (bytes(tagFilter).length > 0 && keccak256(bytes(r.tag)) != keccak256(bytes(tagFilter))) continue;
            count++;
            sum += r.response;
        }
        averageResponse = count > 0 ? uint8(sum / count) : 0;
        return (count, averageResponse);
    }

    function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory) {
        return _agentValidations[agentId];
    }

    function getValidatorRequests(address validatorAddress) external view returns (bytes32[] memory) {
        return _validatorRequests[validatorAddress];
    }
}
