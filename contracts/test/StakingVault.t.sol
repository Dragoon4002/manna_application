// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StakingVault} from "../src/StakingVault.sol";
import {HumanDropToken} from "../src/HumanDropToken.sol";

contract StakingVaultTest is Test {
    StakingVault public vault;
    HumanDropToken public token;

    address owner = address(this);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    uint256 constant SUPPLY = 1_000_000e18;
    uint256 constant STAKE_AMOUNT = 10_000e18;
    uint256 constant REWARD_RATE_BPS = 1250; // 12.5% APY

    function setUp() public {
        token = new HumanDropToken(SUPPLY);
        vault = new StakingVault(address(token), REWARD_RATE_BPS);

        // Fund alice and bob
        token.transfer(alice, 100_000e18);
        token.transfer(bob, 100_000e18);

        // Fund vault with reward tokens
        token.transfer(address(vault), 500_000e18);

        // Approve vault for alice and bob
        vm.prank(alice);
        token.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        token.approve(address(vault), type(uint256).max);
    }

    // --- Staking ---

    function test_stake() public {
        vm.prank(alice);
        uint256 positionId = vault.stake(STAKE_AMOUNT, 30);

        assertEq(positionId, 0);
        assertEq(vault.nextPositionId(), 1);
        assertEq(vault.positionOwner(positionId), alice);

        StakingVault.Position memory pos = vault.getPosition(positionId);
        assertEq(pos.amount, STAKE_AMOUNT);
        assertEq(pos.stakedAt, block.timestamp);
        assertEq(pos.lockUntil, block.timestamp + 30 days);
        assertEq(pos.rewardsClaimed, 0);
        assertTrue(pos.active);

        // Token transferred from alice to vault
        assertEq(token.balanceOf(alice), 100_000e18 - STAKE_AMOUNT);

        // User positions array updated
        uint256[] memory ids = vault.getPositions(alice);
        assertEq(ids.length, 1);
        assertEq(ids[0], 0);
    }

    // --- Unstake after lock ---

    function test_unstakeAfterLock() public {
        vm.prank(alice);
        uint256 positionId = vault.stake(STAKE_AMOUNT, 30);

        uint256 balBefore = token.balanceOf(alice);

        // Warp past lock period
        vm.warp(block.timestamp + 31 days);

        vm.prank(alice);
        vault.unstake(positionId);

        // Position deactivated
        StakingVault.Position memory pos = vault.getPosition(positionId);
        assertFalse(pos.active);

        // Expected rewards: 10000e18 * 1250 * 31 days / (10000 * 365 days)
        uint256 expectedRewards = (STAKE_AMOUNT * REWARD_RATE_BPS * 31 days) / (10000 * 365 days);
        uint256 balAfter = token.balanceOf(alice);
        assertEq(balAfter - balBefore, STAKE_AMOUNT + expectedRewards);
    }

    // --- Revert: unstake before lock ---

    function test_revert_unstakeBeforeLock() public {
        vm.prank(alice);
        uint256 positionId = vault.stake(STAKE_AMOUNT, 30);

        // Only 15 days passed, lock is 30
        vm.warp(block.timestamp + 15 days);

        vm.expectRevert(StakingVault.LockNotExpired.selector);
        vm.prank(alice);
        vault.unstake(positionId);
    }

    // --- Claim rewards ---

    function test_claimRewards() public {
        vm.prank(alice);
        uint256 positionId = vault.stake(STAKE_AMOUNT, 90);

        // Warp 30 days
        vm.warp(block.timestamp + 30 days);

        uint256 expectedRewards = (STAKE_AMOUNT * REWARD_RATE_BPS * 30 days) / (10000 * 365 days);
        uint256 pending = vault.pendingRewards(positionId);
        assertEq(pending, expectedRewards);

        uint256 balBefore = token.balanceOf(alice);

        vm.prank(alice);
        vault.claimRewards(positionId);

        uint256 balAfter = token.balanceOf(alice);
        assertEq(balAfter - balBefore, expectedRewards);

        // Position still active, rewardsClaimed updated
        StakingVault.Position memory pos = vault.getPosition(positionId);
        assertTrue(pos.active);
        assertEq(pos.rewardsClaimed, expectedRewards);

        // Pending should be 0 right after claim
        assertEq(vault.pendingRewards(positionId), 0);
    }

    // --- Pending rewards calculation ---

    function test_pendingRewards() public {
        vm.prank(alice);
        uint256 positionId = vault.stake(STAKE_AMOUNT, 365);

        // After exactly 1 year, rewards should be amount * rateBps / 10000
        vm.warp(block.timestamp + 365 days);

        uint256 pending = vault.pendingRewards(positionId);
        uint256 expected = (STAKE_AMOUNT * REWARD_RATE_BPS) / 10000; // 12.5% of 10000e18 = 1250e18
        assertEq(pending, expected);
    }

    // --- Revert: not position owner ---

    function test_revert_notOwner() public {
        vm.prank(alice);
        uint256 positionId = vault.stake(STAKE_AMOUNT, 30);

        vm.warp(block.timestamp + 31 days);

        // Bob tries to unstake alice's position
        vm.expectRevert(StakingVault.NotPositionOwner.selector);
        vm.prank(bob);
        vault.unstake(positionId);

        // Bob tries to claim alice's rewards
        vm.expectRevert(StakingVault.NotPositionOwner.selector);
        vm.prank(bob);
        vault.claimRewards(positionId);
    }

    // --- Multiple positions ---

    function test_multiplePositions() public {
        vm.startPrank(alice);
        uint256 id0 = vault.stake(STAKE_AMOUNT, 30);
        uint256 id1 = vault.stake(STAKE_AMOUNT * 2, 60);
        uint256 id2 = vault.stake(STAKE_AMOUNT / 2, 90);
        vm.stopPrank();

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(vault.nextPositionId(), 3);

        uint256[] memory ids = vault.getPositions(alice);
        assertEq(ids.length, 3);
        assertEq(ids[0], 0);
        assertEq(ids[1], 1);
        assertEq(ids[2], 2);

        // Verify each position has correct amount
        assertEq(vault.getPosition(id0).amount, STAKE_AMOUNT);
        assertEq(vault.getPosition(id1).amount, STAKE_AMOUNT * 2);
        assertEq(vault.getPosition(id2).amount, STAKE_AMOUNT / 2);
    }

    // --- Edge cases ---

    function test_revert_zeroAmount() public {
        vm.expectRevert(StakingVault.ZeroAmount.selector);
        vm.prank(alice);
        vault.stake(0, 30);
    }

    function test_revert_unstakeInactivePosition() public {
        vm.prank(alice);
        uint256 positionId = vault.stake(STAKE_AMOUNT, 0); // no lock

        vm.prank(alice);
        vault.unstake(positionId);

        vm.expectRevert(StakingVault.PositionNotActive.selector);
        vm.prank(alice);
        vault.unstake(positionId);
    }

    function test_claimThenUnstake() public {
        vm.prank(alice);
        uint256 positionId = vault.stake(STAKE_AMOUNT, 30);

        // Claim at 15 days
        vm.warp(block.timestamp + 15 days);
        vm.prank(alice);
        vault.claimRewards(positionId);
        uint256 claimed15 = vault.getPosition(positionId).rewardsClaimed;

        // Unstake at 31 days
        vm.warp(block.timestamp + 16 days); // total 31 days
        vm.prank(alice);
        vault.unstake(positionId);

        // Total received = principal + full 31-day rewards
        uint256 expectedTotal = (STAKE_AMOUNT * REWARD_RATE_BPS * 31 days) / (10000 * 365 days);
        StakingVault.Position memory pos = vault.getPosition(positionId);
        assertEq(pos.rewardsClaimed, expectedTotal);
        assertGt(pos.rewardsClaimed, claimed15);
    }
}
