// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title WorldIDVerifier - Public good human registry on chains without native World ID
/// @notice Stores CRE-bridged World ID verification results. Any protocol can check isVerifiedHuman().
contract WorldIDVerifier is Ownable {
    error AlreadyVerified();
    error NotOperator();

    event HumanVerified(uint256 indexed nullifierHash, uint8 verificationLevel, uint256 timestamp);
    event OperatorUpdated(address indexed operator, bool status);

    struct Verification {
        bool verified;
        uint8 level; // 1 = Device, 2 = Orb
        uint256 timestamp;
    }

    mapping(uint256 => Verification) public verifications;
    mapping(address => bool) public operators;

    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != owner()) revert NotOperator();
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setOperator(address op, bool status) external onlyOwner {
        operators[op] = status;
        emit OperatorUpdated(op, status);
    }

    /// @notice Register a verified human. Called by CRE operator after proof verification.
    function registerHuman(uint256 nullifierHash, uint8 verificationLevel) external onlyOperator {
        if (verifications[nullifierHash].verified) revert AlreadyVerified();
        verifications[nullifierHash] = Verification(true, verificationLevel, block.timestamp);
        emit HumanVerified(nullifierHash, verificationLevel, block.timestamp);
    }

    /// @notice Public good: any protocol can check if a nullifier represents a verified human.
    function isVerifiedHuman(uint256 nullifierHash) external view returns (bool) {
        return verifications[nullifierHash].verified;
    }

    function getVerification(uint256 nullifierHash) external view returns (Verification memory) {
        return verifications[nullifierHash];
    }
}
