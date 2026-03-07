// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title HumanDrop - Sybil-resistant airdrop distribution via CRE + World ID
/// @notice Airdrops are created by anyone, claims are executed by CRE operator after World ID verification.
contract HumanDrop is Ownable {
    using SafeERC20 for IERC20;

    error AirdropNotActive();
    error AlreadyClaimed();
    error AirdropExpired();
    error InvalidLevel();
    error NotOperator();
    error InsufficientBalance();
    error MaxClaimsReached();
    error NotAuthorized();

    event AirdropCreated(uint256 indexed airdropId, address indexed token, address indexed creator, uint256 expiry);
    event Claimed(uint256 indexed airdropId, uint256 indexed nullifierHash, address receiver, uint256 amount, uint8 level);
    event AirdropPaused(uint256 indexed airdropId, bool paused);
    event OperatorUpdated(address indexed operator, bool status);
    event Withdrawn(uint256 indexed airdropId, address indexed recipient, uint256 amount);

    struct Airdrop {
        address token;
        uint256 amountOrb;
        uint256 amountDevice;
        uint256 totalClaimed;
        uint256 maxClaims;
        uint256 expiry;
        address creator;
        bool active;
    }

    uint256 public nextAirdropId;
    mapping(uint256 => Airdrop) public airdrops;
    mapping(uint256 => mapping(uint256 => bool)) public claimed;
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

    /// @notice Create a new airdrop campaign. Creator must transfer tokens to this contract separately.
    function createAirdrop(
        address token,
        uint256 amountOrb,
        uint256 amountDevice,
        uint256 maxClaims,
        uint256 expiry
    ) external returns (uint256 airdropId) {
        airdropId = nextAirdropId++;
        airdrops[airdropId] = Airdrop({
            token: token,
            amountOrb: amountOrb,
            amountDevice: amountDevice,
            totalClaimed: 0,
            maxClaims: maxClaims,
            expiry: expiry,
            creator: msg.sender,
            active: true
        });
        emit AirdropCreated(airdropId, token, msg.sender, expiry);
    }

    /// @notice Claim tokens for a verified human. Only callable by CRE operator.
    /// @param airdropId The airdrop campaign ID
    /// @param nullifierHash World ID nullifier hash (unique per human per action)
    /// @param receiver Address to receive tokens
    /// @param verificationLevel 1 = Device, 2 = Orb
    function claim(
        uint256 airdropId,
        uint256 nullifierHash,
        address receiver,
        uint8 verificationLevel
    ) external onlyOperator {
        Airdrop storage a = airdrops[airdropId];
        if (!a.active) revert AirdropNotActive();
        if (block.timestamp > a.expiry) revert AirdropExpired();
        if (claimed[airdropId][nullifierHash]) revert AlreadyClaimed();
        if (verificationLevel < 1 || verificationLevel > 2) revert InvalidLevel();
        if (a.totalClaimed >= a.maxClaims) revert MaxClaimsReached();

        uint256 amount = verificationLevel == 2 ? a.amountOrb : a.amountDevice;
        if (IERC20(a.token).balanceOf(address(this)) < amount) revert InsufficientBalance();

        claimed[airdropId][nullifierHash] = true;
        a.totalClaimed++;

        IERC20(a.token).safeTransfer(receiver, amount);

        emit Claimed(airdropId, nullifierHash, receiver, amount, verificationLevel);
    }

    /// @notice Pause/unpause an airdrop. Only creator or owner.
    function setAirdropActive(uint256 airdropId, bool active) external {
        Airdrop storage a = airdrops[airdropId];
        if (msg.sender != a.creator && msg.sender != owner()) revert NotAuthorized();
        a.active = active;
        emit AirdropPaused(airdropId, !active);
    }

    /// @notice Check if a nullifier has already claimed a specific airdrop.
    function hasClaimed(uint256 airdropId, uint256 nullifierHash) external view returns (bool) {
        return claimed[airdropId][nullifierHash];
    }

    /// @notice Check if a user is eligible to claim an airdrop.
    /// @dev For now, all active airdrops are open to everyone. Can extend with merkle proofs later.
    function isEligible(uint256 airdropId, uint256 nullifierHash) external view returns (bool) {
        Airdrop memory a = airdrops[airdropId];
        if (!a.active) return false;
        if (block.timestamp > a.expiry) return false;
        if (claimed[airdropId][nullifierHash]) return false;
        if (a.totalClaimed >= a.maxClaims) return false;
        return true;
    }

    /// @notice Get full airdrop details.
    function getAirdrop(uint256 airdropId) external view returns (Airdrop memory) {
        return airdrops[airdropId];
    }

    /// @notice Withdraw unclaimed tokens after expiry. Only creator.
    function withdraw(uint256 airdropId) external {
        Airdrop storage a = airdrops[airdropId];
        if (msg.sender != a.creator) revert NotAuthorized();
        if (block.timestamp <= a.expiry) revert AirdropNotActive();

        uint256 balance = IERC20(a.token).balanceOf(address(this));
        if (balance == 0) revert InsufficientBalance();

        IERC20(a.token).safeTransfer(a.creator, balance);
        emit Withdrawn(airdropId, a.creator, balance);
    }
}
