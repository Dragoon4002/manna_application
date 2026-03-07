// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title StakingVault - Lock-and-earn staking for Manna tokens
/// @notice Users stake tokens with a lock period and earn rewards based on a configurable APY rate.
contract StakingVault is Ownable {
    using SafeERC20 for IERC20;

    error NotPositionOwner();
    error PositionNotActive();
    error LockNotExpired();
    error ZeroAmount();
    error NoRewardsPending();
    error InsufficientRewardBalance();

    event Staked(uint256 indexed positionId, address indexed user, uint256 amount, uint256 lockUntil);
    event Unstaked(uint256 indexed positionId, address indexed user, uint256 principal, uint256 rewards);
    event RewardsClaimed(uint256 indexed positionId, address indexed user, uint256 rewards);

    struct Position {
        uint256 amount;
        uint256 stakedAt;
        uint256 lockUntil;
        uint256 rewardsClaimed;
        bool active;
    }

    IERC20 public stakingToken;
    uint256 public rewardRateBps; // e.g. 1250 = 12.5% APY
    uint256 public nextPositionId;

    mapping(uint256 => Position) public positions;
    mapping(uint256 => address) public positionOwner;
    mapping(address => uint256[]) public userPositions;

    constructor(address _token, uint256 _rewardRateBps) Ownable(msg.sender) {
        stakingToken = IERC20(_token);
        rewardRateBps = _rewardRateBps;
    }

    /// @notice Stake tokens with a lock period.
    /// @param amount Amount of tokens to stake.
    /// @param lockDays Number of days to lock the position.
    /// @return positionId The ID of the newly created position.
    function stake(uint256 amount, uint256 lockDays) external returns (uint256 positionId) {
        if (amount == 0) revert ZeroAmount();

        positionId = nextPositionId++;
        uint256 lockUntil = block.timestamp + (lockDays * 1 days);

        positions[positionId] = Position({
            amount: amount,
            stakedAt: block.timestamp,
            lockUntil: lockUntil,
            rewardsClaimed: 0,
            active: true
        });
        positionOwner[positionId] = msg.sender;
        userPositions[msg.sender].push(positionId);

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(positionId, msg.sender, amount, lockUntil);
    }

    /// @notice Unstake a position after lock expires. Returns principal + pending rewards.
    /// @param positionId The position to unstake.
    function unstake(uint256 positionId) external {
        if (positionOwner[positionId] != msg.sender) revert NotPositionOwner();
        Position storage pos = positions[positionId];
        if (!pos.active) revert PositionNotActive();
        if (block.timestamp < pos.lockUntil) revert LockNotExpired();

        uint256 rewards = _pendingRewards(positionId);
        uint256 principal = pos.amount;

        pos.active = false;
        pos.rewardsClaimed += rewards;

        // Transfer principal + rewards
        uint256 total = principal + rewards;
        if (stakingToken.balanceOf(address(this)) < total) revert InsufficientRewardBalance();
        stakingToken.safeTransfer(msg.sender, total);

        emit Unstaked(positionId, msg.sender, principal, rewards);
    }

    /// @notice Claim accrued rewards without unstaking.
    /// @param positionId The position to claim rewards for.
    function claimRewards(uint256 positionId) external {
        if (positionOwner[positionId] != msg.sender) revert NotPositionOwner();
        Position storage pos = positions[positionId];
        if (!pos.active) revert PositionNotActive();

        uint256 rewards = _pendingRewards(positionId);
        if (rewards == 0) revert NoRewardsPending();

        pos.rewardsClaimed += rewards;

        if (stakingToken.balanceOf(address(this)) < rewards) revert InsufficientRewardBalance();
        stakingToken.safeTransfer(msg.sender, rewards);

        emit RewardsClaimed(positionId, msg.sender, rewards);
    }

    /// @notice Calculate pending (unclaimed) rewards for a position.
    /// @param positionId The position to query.
    /// @return Pending reward amount.
    function pendingRewards(uint256 positionId) public view returns (uint256) {
        return _pendingRewards(positionId);
    }

    /// @notice Get all position IDs for a user.
    function getPositions(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }

    /// @notice Get full position details.
    function getPosition(uint256 positionId) external view returns (Position memory) {
        return positions[positionId];
    }

    function _pendingRewards(uint256 positionId) internal view returns (uint256) {
        Position storage pos = positions[positionId];
        if (!pos.active) return 0;

        uint256 elapsed = block.timestamp - pos.stakedAt;
        uint256 totalRewards = (pos.amount * rewardRateBps * elapsed) / (10000 * 365 days);
        return totalRewards - pos.rewardsClaimed;
    }
}
