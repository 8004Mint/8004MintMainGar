// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IIdentityRegistry.sol";

/**
 * @title ReputationRegistry
 * @dev ERC-8004 Reputation Registry: feedback from clients to agents.
 */
contract ReputationRegistry {
    IIdentityRegistry public identityRegistry;

    struct Feedback {
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        bool isRevoked;
    }

    mapping(uint256 => mapping(address => uint64)) public lastIndex;
    mapping(uint256 => mapping(address => mapping(uint64 => Feedback))) public feedbacks;
    mapping(uint256 => address[]) private _clients;
    mapping(uint256 => mapping(address => bool)) private _clientExists;

    mapping(uint256 => mapping(address => mapping(uint64 => string))) private _responseURIs;
    mapping(uint256 => mapping(address => mapping(uint64 => address[]))) private _responders;

    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        int128 value,
        uint8 valueDecimals,
        string indexed tag1,
        string tag1Full,
        string tag2,
        string endpoint,
        string feedbackURI,
        bytes32 feedbackHash
    );
    event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex);
    event ResponseAppended(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        address indexed responder,
        string responseURI,
        bytes32 responseHash
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

    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external {
        require(valueDecimals <= 18, "valueDecimals");
        address owner = identityRegistry.ownerOf(agentId);
        require(owner != address(0), "invalid agent");
        require(msg.sender != owner, "cannot feedback self");
        require(msg.sender != identityRegistry.getApproved(agentId), "cannot feedback as approver");
        require(!identityRegistry.isApprovedForAll(owner, msg.sender), "cannot feedback as operator");

        if (!_clientExists[agentId][msg.sender]) {
            _clientExists[agentId][msg.sender] = true;
            _clients[agentId].push(msg.sender);
        }
        uint64 idx = lastIndex[agentId][msg.sender] + 1;
        lastIndex[agentId][msg.sender] = idx;

        feedbacks[agentId][msg.sender][idx] = Feedback({
            value: value,
            valueDecimals: valueDecimals,
            tag1: tag1,
            tag2: tag2,
            isRevoked: false
        });

        emit NewFeedback(agentId, msg.sender, idx, value, valueDecimals, tag1, tag1, tag2, endpoint, feedbackURI, feedbackHash);
    }

    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        Feedback storage f = feedbacks[agentId][msg.sender][feedbackIndex];
        require(f.valueDecimals <= 18, "invalid feedback");
        require(!f.isRevoked, "already revoked");
        f.isRevoked = true;
        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    function appendResponse(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        string calldata responseURI,
        bytes32 responseHash
    ) external {
        _responders[agentId][clientAddress][feedbackIndex].push(msg.sender);
        _responseURIs[agentId][clientAddress][feedbackIndex] = responseURI;
        emit ResponseAppended(agentId, clientAddress, feedbackIndex, msg.sender, responseURI, responseHash);
    }

    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex
    ) external view returns (int128 value, uint8 valueDecimals, string memory tag1, string memory tag2, bool isRevoked) {
        Feedback storage f = feedbacks[agentId][clientAddress][feedbackIndex];
        return (f.value, f.valueDecimals, f.tag1, f.tag2, f.isRevoked);
    }

    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1Filter,
        string calldata tag2Filter
    ) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals) {
        require(clientAddresses.length > 0, "empty clients");
        count = 0;
        summaryValue = 0;
        summaryValueDecimals = 0;
        for (uint256 i = 0; i < clientAddresses.length; i++) {
            address c = clientAddresses[i];
            uint64 last = lastIndex[agentId][c];
            for (uint64 j = 1; j <= last; j++) {
                Feedback storage f = feedbacks[agentId][c][j];
                if (f.isRevoked) continue;
                if (bytes(tag1Filter).length > 0 && keccak256(bytes(f.tag1)) != keccak256(bytes(tag1Filter))) continue;
                if (bytes(tag2Filter).length > 0 && keccak256(bytes(f.tag2)) != keccak256(bytes(tag2Filter))) continue;
                count++;
                summaryValue += f.value;
                if (f.valueDecimals > summaryValueDecimals) summaryValueDecimals = f.valueDecimals;
            }
        }
        return (count, summaryValue, summaryValueDecimals);
    }

    function getClients(uint256 agentId) external view returns (address[] memory) {
        return _clients[agentId];
    }

    function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64) {
        return lastIndex[agentId][clientAddress];
    }

    function getResponseCount(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        address[] calldata respondersFilter
    ) external view returns (uint64) {
        address[] storage resps = _responders[agentId][clientAddress][feedbackIndex];
        if (respondersFilter.length == 0) return uint64(resps.length);
        uint64 n = 0;
        for (uint256 i = 0; i < resps.length; i++) {
            for (uint256 j = 0; j < respondersFilter.length; j++) {
                if (resps[i] == respondersFilter[j]) { n++; break; }
            }
        }
        return n;
    }

    /// @dev EIP-8004: agentId is the only mandatory parameter; clientAddresses empty = all clients for agent
    function readAllFeedback(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1Filter,
        string calldata tag2Filter,
        bool includeRevoked
    ) external view returns (
        address[] memory clients,
        uint64[] memory feedbackIndexes,
        int128[] memory values,
        uint8[] memory valueDecimals,
        string[] memory tag1s,
        string[] memory tag2s,
        bool[] memory revokedStatuses
    ) {
        address[] memory clientsToUse;
        if (clientAddresses.length == 0) {
            address[] storage clientList = _clients[agentId];
            clientsToUse = new address[](clientList.length);
            for (uint256 i = 0; i < clientList.length; i++) {
                clientsToUse[i] = clientList[i];
            }
        } else {
            clientsToUse = new address[](clientAddresses.length);
            for (uint256 i = 0; i < clientAddresses.length; i++) {
                clientsToUse[i] = clientAddresses[i];
            }
        }
        uint256 total = 0;
        for (uint256 i = 0; i < clientsToUse.length; i++) {
            uint64 last = lastIndex[agentId][clientsToUse[i]];
            for (uint64 j = 1; j <= last; j++) {
                Feedback storage f = feedbacks[agentId][clientsToUse[i]][j];
                if (!includeRevoked && f.isRevoked) continue;
                if (bytes(tag1Filter).length > 0 && keccak256(bytes(f.tag1)) != keccak256(bytes(tag1Filter))) continue;
                if (bytes(tag2Filter).length > 0 && keccak256(bytes(f.tag2)) != keccak256(bytes(tag2Filter))) continue;
                total++;
            }
        }
        clients = new address[](total);
        feedbackIndexes = new uint64[](total);
        values = new int128[](total);
        valueDecimals = new uint8[](total);
        tag1s = new string[](total);
        tag2s = new string[](total);
        revokedStatuses = new bool[](total);
        uint256 k = 0;
        for (uint256 i = 0; i < clientsToUse.length; i++) {
            address c = clientsToUse[i];
            uint64 last = lastIndex[agentId][c];
            for (uint64 j = 1; j <= last; j++) {
                Feedback storage f = feedbacks[agentId][c][j];
                if (!includeRevoked && f.isRevoked) continue;
                if (bytes(tag1Filter).length > 0 && keccak256(bytes(f.tag1)) != keccak256(bytes(tag1Filter))) continue;
                if (bytes(tag2Filter).length > 0 && keccak256(bytes(f.tag2)) != keccak256(bytes(tag2Filter))) continue;
                clients[k] = c;
                feedbackIndexes[k] = j;
                values[k] = f.value;
                valueDecimals[k] = f.valueDecimals;
                tag1s[k] = f.tag1;
                tag2s[k] = f.tag2;
                revokedStatuses[k] = f.isRevoked;
                k++;
            }
        }
        return (clients, feedbackIndexes, values, valueDecimals, tag1s, tag2s, revokedStatuses);
    }
}
