// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title VestingVault - Linear token vesting with cliff for Manna
/// @notice Creators lock tokens for recipients with cliff + linear vesting. Optionally revocable.
contract VestingVault is Ownable {
    using SafeERC20 for IERC20;

    error NotRecipient();
    error NotCreator();
    error BeforeCliff();
    error AlreadyRevoked();
    error NotRevocable();
    error NothingToClaim();
    error InvalidDuration();
    error InvalidRecipient();
    error InvalidAmount();

    event ScheduleCreated(
        uint256 indexed scheduleId,
        address indexed token,
        address indexed recipient,
        address creator,
        uint256 totalAmount,
        uint256 start,
        uint256 cliff,
        uint256 duration,
        bool revocable
    );
    event TokensClaimed(uint256 indexed scheduleId, address indexed recipient, uint256 amount);
    event ScheduleRevoked(uint256 indexed scheduleId, address indexed creator, uint256 unvestedReturned);

    struct Schedule {
        address token;
        address creator;
        address recipient;
        uint256 totalAmount;
        uint256 claimed;
        uint256 start;
        uint256 cliff;
        uint256 duration;
        bool revocable;
        bool revoked;
    }

    uint256 public nextScheduleId;
    mapping(uint256 => Schedule) public schedules;
    mapping(address => uint256[]) public recipientSchedules;
    mapping(address => uint256[]) public creatorSchedules;

    constructor() Ownable(msg.sender) {}

    /// @notice Create a vesting schedule. Caller must have approved this contract for `amount`.
    /// @param token ERC20 token address
    /// @param recipient Who receives vested tokens
    /// @param amount Total tokens to vest
    /// @param cliffDays Days before any tokens are claimable
    /// @param durationDays Total vesting duration in days (must be >= cliffDays)
    /// @param revocable Whether creator can revoke unvested tokens
    /// @return scheduleId The ID of the created schedule
    function create(
        address token,
        address recipient,
        uint256 amount,
        uint256 cliffDays,
        uint256 durationDays,
        bool revocable
    ) external returns (uint256 scheduleId) {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        if (durationDays == 0) revert InvalidDuration();

        scheduleId = nextScheduleId++;

        uint256 cliffSeconds = cliffDays * 1 days;
        uint256 durationSeconds = durationDays * 1 days;

        schedules[scheduleId] = Schedule({
            token: token,
            creator: msg.sender,
            recipient: recipient,
            totalAmount: amount,
            claimed: 0,
            start: block.timestamp,
            cliff: block.timestamp + cliffSeconds,
            duration: durationSeconds,
            revocable: revocable,
            revoked: false
        });

        recipientSchedules[recipient].push(scheduleId);
        creatorSchedules[msg.sender].push(scheduleId);

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit ScheduleCreated(
            scheduleId, token, recipient, msg.sender, amount, block.timestamp, block.timestamp + cliffSeconds, durationSeconds, revocable
        );
    }

    /// @notice Claim vested tokens for a schedule.
    /// @param scheduleId The schedule to claim from
    function claim(uint256 scheduleId) external {
        Schedule storage s = schedules[scheduleId];
        if (msg.sender != s.recipient) revert NotRecipient();
        if (s.revoked) revert AlreadyRevoked();
        if (block.timestamp < s.cliff) revert BeforeCliff();

        uint256 vested = vestedAmount(scheduleId);
        uint256 claimable = vested - s.claimed;
        if (claimable == 0) revert NothingToClaim();

        s.claimed += claimable;

        IERC20(s.token).safeTransfer(s.recipient, claimable);

        emit TokensClaimed(scheduleId, s.recipient, claimable);
    }

    /// @notice Revoke a schedule, returning unvested tokens to creator.
    /// @param scheduleId The schedule to revoke
    function revoke(uint256 scheduleId) external {
        Schedule storage s = schedules[scheduleId];
        if (msg.sender != s.creator) revert NotCreator();
        if (!s.revocable) revert NotRevocable();
        if (s.revoked) revert AlreadyRevoked();

        uint256 vested = vestedAmount(scheduleId);
        uint256 unvested = s.totalAmount - vested;

        s.revoked = true;

        if (unvested > 0) {
            IERC20(s.token).safeTransfer(s.creator, unvested);
        }

        emit ScheduleRevoked(scheduleId, s.creator, unvested);
    }

    /// @notice Calculate how many tokens have vested so far.
    /// @param scheduleId The schedule to check
    /// @return The total vested amount (not accounting for claimed)
    function vestedAmount(uint256 scheduleId) public view returns (uint256) {
        Schedule storage s = schedules[scheduleId];

        if (block.timestamp < s.cliff) {
            return 0;
        }

        uint256 elapsed = block.timestamp - s.start;

        if (elapsed >= s.duration) {
            return s.totalAmount;
        }

        return (s.totalAmount * elapsed) / s.duration;
    }

    /// @notice Get full schedule details.
    function getSchedule(uint256 scheduleId) external view returns (Schedule memory) {
        return schedules[scheduleId];
    }

    /// @notice Get all schedule IDs for a recipient.
    function getRecipientSchedules(address recipient) external view returns (uint256[] memory) {
        return recipientSchedules[recipient];
    }

    /// @notice Get all schedule IDs for a creator.
    function getCreatorSchedules(address creator) external view returns (uint256[] memory) {
        return creatorSchedules[creator];
    }
}
