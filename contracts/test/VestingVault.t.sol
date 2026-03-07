// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {VestingVault} from "../src/VestingVault.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(uint256 supply) ERC20("Mock", "MCK") {
        _mint(msg.sender, supply);
    }
}

contract VestingVaultTest is Test {
    VestingVault public vault;
    MockERC20 public token;

    address creator = address(0xBEEF);
    address recipient = address(0xCAFE);
    address stranger = address(0xBAD);

    uint256 constant SUPPLY = 1_000_000e18;
    uint256 constant VEST_AMOUNT = 10_000e18;
    uint256 constant CLIFF_DAYS = 30;
    uint256 constant DURATION_DAYS = 365;

    function setUp() public {
        vault = new VestingVault();
        token = new MockERC20(SUPPLY);

        // Fund creator
        token.transfer(creator, VEST_AMOUNT * 10);
    }

    function _createSchedule(bool revocable) internal returns (uint256) {
        vm.startPrank(creator);
        token.approve(address(vault), VEST_AMOUNT);
        uint256 id = vault.create(address(token), recipient, VEST_AMOUNT, CLIFF_DAYS, DURATION_DAYS, revocable);
        vm.stopPrank();
        return id;
    }

    // --- Tests ---

    function test_createSchedule() public {
        uint256 id = _createSchedule(true);

        VestingVault.Schedule memory s = vault.getSchedule(id);
        assertEq(s.token, address(token));
        assertEq(s.creator, creator);
        assertEq(s.recipient, recipient);
        assertEq(s.totalAmount, VEST_AMOUNT);
        assertEq(s.claimed, 0);
        assertEq(s.cliff, block.timestamp + CLIFF_DAYS * 1 days);
        assertEq(s.duration, DURATION_DAYS * 1 days);
        assertTrue(s.revocable);
        assertFalse(s.revoked);

        // Token transferred to vault
        assertEq(token.balanceOf(address(vault)), VEST_AMOUNT);

        // Mappings populated
        uint256[] memory rIds = vault.getRecipientSchedules(recipient);
        assertEq(rIds.length, 1);
        assertEq(rIds[0], id);

        uint256[] memory cIds = vault.getCreatorSchedules(creator);
        assertEq(cIds.length, 1);
        assertEq(cIds[0], id);

        assertEq(vault.nextScheduleId(), 1);
    }

    function test_claimAfterCliff() public {
        uint256 id = _createSchedule(true);

        // Warp to cliff + 30 days (60 days total)
        vm.warp(block.timestamp + 60 days);

        uint256 expectedVested = (VEST_AMOUNT * 60 days) / (DURATION_DAYS * 1 days);

        vm.prank(recipient);
        vault.claim(id);

        assertEq(token.balanceOf(recipient), expectedVested);

        VestingVault.Schedule memory s = vault.getSchedule(id);
        assertEq(s.claimed, expectedVested);
    }

    function test_claimFullyVested() public {
        uint256 id = _createSchedule(true);

        // Warp past full duration
        vm.warp(block.timestamp + DURATION_DAYS * 1 days + 1);

        vm.prank(recipient);
        vault.claim(id);

        assertEq(token.balanceOf(recipient), VEST_AMOUNT);

        VestingVault.Schedule memory s = vault.getSchedule(id);
        assertEq(s.claimed, VEST_AMOUNT);
    }

    function test_revert_claimBeforeCliff() public {
        uint256 id = _createSchedule(true);

        // Warp to 1 second before cliff
        vm.warp(block.timestamp + CLIFF_DAYS * 1 days - 1);

        vm.expectRevert(VestingVault.BeforeCliff.selector);
        vm.prank(recipient);
        vault.claim(id);
    }

    function test_revoke() public {
        uint256 id = _createSchedule(true);

        // Warp to halfway
        vm.warp(block.timestamp + (DURATION_DAYS * 1 days) / 2);

        uint256 vested = vault.vestedAmount(id);
        uint256 expectedReturn = VEST_AMOUNT - vested;
        uint256 creatorBefore = token.balanceOf(creator);

        vm.prank(creator);
        vault.revoke(id);

        assertEq(token.balanceOf(creator), creatorBefore + expectedReturn);

        VestingVault.Schedule memory s = vault.getSchedule(id);
        assertTrue(s.revoked);
    }

    function test_revert_revokeNonRevocable() public {
        uint256 id = _createSchedule(false);

        vm.expectRevert(VestingVault.NotRevocable.selector);
        vm.prank(creator);
        vault.revoke(id);
    }

    function test_revert_notRecipient() public {
        uint256 id = _createSchedule(true);

        vm.warp(block.timestamp + 60 days);

        vm.expectRevert(VestingVault.NotRecipient.selector);
        vm.prank(stranger);
        vault.claim(id);
    }

    function test_vestedAmount() public {
        uint256 id = _createSchedule(true);
        uint256 duration = DURATION_DAYS * 1 days;

        // Before cliff: 0
        assertEq(vault.vestedAmount(id), 0);

        // At cliff
        vm.warp(block.timestamp + CLIFF_DAYS * 1 days);
        uint256 atCliff = (VEST_AMOUNT * CLIFF_DAYS * 1 days) / duration;
        assertEq(vault.vestedAmount(id), atCliff);

        // At 50%
        vm.warp(block.timestamp + (duration / 2) - (CLIFF_DAYS * 1 days));
        uint256 atHalf = (VEST_AMOUNT * (duration / 2)) / duration;
        assertEq(vault.vestedAmount(id), atHalf);

        // Past end: capped at totalAmount
        vm.warp(block.timestamp + duration);
        assertEq(vault.vestedAmount(id), VEST_AMOUNT);
    }
}
