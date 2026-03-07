// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {HumanDrop} from "../src/HumanDrop.sol";
import {WorldIDVerifier} from "../src/WorldIDVerifier.sol";
import {HumanDropToken} from "../src/HumanDropToken.sol";

contract HumanDropTest is Test {
    HumanDrop public drop;
    WorldIDVerifier public verifier;
    HumanDropToken public token;

    address owner = address(this);
    address operator = address(0xC4E);
    address creator = address(0xBEEF);
    address receiver = address(0xCAFE);

    uint256 constant AMOUNT_ORB = 100e18;
    uint256 constant AMOUNT_DEVICE = 50e18;
    uint256 constant MAX_CLAIMS = 1000;
    uint256 constant SUPPLY = 1_000_000e18;

    uint256 airdropId;

    function setUp() public {
        drop = new HumanDrop();
        verifier = new WorldIDVerifier();
        token = new HumanDropToken(SUPPLY);

        // Set CRE operator
        drop.setOperator(operator, true);
        verifier.setOperator(operator, true);

        // Creator creates airdrop
        vm.prank(creator);
        airdropId = drop.createAirdrop(
            address(token),
            AMOUNT_ORB,
            AMOUNT_DEVICE,
            MAX_CLAIMS,
            block.timestamp + 30 days
        );

        // Fund the contract
        token.transfer(address(drop), SUPPLY / 2);
    }

    // --- HumanDrop Tests ---

    function test_createAirdrop() public view {
        HumanDrop.Airdrop memory a = drop.getAirdrop(airdropId);
        assertEq(a.token, address(token));
        assertEq(a.amountOrb, AMOUNT_ORB);
        assertEq(a.amountDevice, AMOUNT_DEVICE);
        assertEq(a.totalClaimed, 0);
        assertEq(a.maxClaims, MAX_CLAIMS);
        assertEq(a.creator, creator);
        assertTrue(a.active);
    }

    function test_claimOrb() public {
        uint256 nullifier = 12345;
        vm.prank(operator);
        drop.claim(airdropId, nullifier, receiver, 2); // Orb = level 2

        assertEq(token.balanceOf(receiver), AMOUNT_ORB);
        assertTrue(drop.hasClaimed(airdropId, nullifier));

        HumanDrop.Airdrop memory a = drop.getAirdrop(airdropId);
        assertEq(a.totalClaimed, 1);
    }

    function test_claimDevice() public {
        uint256 nullifier = 67890;
        vm.prank(operator);
        drop.claim(airdropId, nullifier, receiver, 1); // Device = level 1

        assertEq(token.balanceOf(receiver), AMOUNT_DEVICE);
        assertTrue(drop.hasClaimed(airdropId, nullifier));
    }

    function test_revert_doubleClaim() public {
        uint256 nullifier = 11111;
        vm.prank(operator);
        drop.claim(airdropId, nullifier, receiver, 2);

        vm.expectRevert(HumanDrop.AlreadyClaimed.selector);
        vm.prank(operator);
        drop.claim(airdropId, nullifier, receiver, 2);
    }

    function test_revert_notOperator() public {
        vm.expectRevert(HumanDrop.NotOperator.selector);
        vm.prank(address(0xBAD));
        drop.claim(airdropId, 99999, receiver, 1);
    }

    function test_revert_expired() public {
        vm.warp(block.timestamp + 31 days);

        vm.expectRevert(HumanDrop.AirdropExpired.selector);
        vm.prank(operator);
        drop.claim(airdropId, 22222, receiver, 1);
    }

    function test_revert_invalidLevel() public {
        vm.expectRevert(HumanDrop.InvalidLevel.selector);
        vm.prank(operator);
        drop.claim(airdropId, 33333, receiver, 3);
    }

    function test_revert_paused() public {
        vm.prank(creator);
        drop.setAirdropActive(airdropId, false);

        vm.expectRevert(HumanDrop.AirdropNotActive.selector);
        vm.prank(operator);
        drop.claim(airdropId, 44444, receiver, 1);
    }

    function test_pauseUnpause() public {
        vm.prank(creator);
        drop.setAirdropActive(airdropId, false);

        HumanDrop.Airdrop memory a = drop.getAirdrop(airdropId);
        assertFalse(a.active);

        vm.prank(creator);
        drop.setAirdropActive(airdropId, true);

        a = drop.getAirdrop(airdropId);
        assertTrue(a.active);
    }

    function test_multipleAirdrops() public {
        vm.prank(creator);
        uint256 id2 = drop.createAirdrop(
            address(token), 200e18, 100e18, 500, block.timestamp + 7 days
        );
        assertEq(id2, 1);
        assertEq(drop.nextAirdropId(), 2);
    }

    function test_sameNullifierDifferentAirdrops() public {
        vm.prank(creator);
        uint256 id2 = drop.createAirdrop(
            address(token), AMOUNT_ORB, AMOUNT_DEVICE, MAX_CLAIMS, block.timestamp + 30 days
        );

        uint256 nullifier = 55555;

        vm.prank(operator);
        drop.claim(airdropId, nullifier, receiver, 2);

        // Same nullifier, different airdrop should succeed
        vm.prank(operator);
        drop.claim(id2, nullifier, receiver, 2);

        assertEq(token.balanceOf(receiver), AMOUNT_ORB * 2);
    }

    // --- WorldIDVerifier Tests ---

    function test_registerHuman() public {
        uint256 nullifier = 77777;
        vm.prank(operator);
        verifier.registerHuman(nullifier, 2);

        assertTrue(verifier.isVerifiedHuman(nullifier));

        WorldIDVerifier.Verification memory v = verifier.getVerification(nullifier);
        assertTrue(v.verified);
        assertEq(v.level, 2);
        assertEq(v.timestamp, block.timestamp);
    }

    function test_revert_doubleRegister() public {
        uint256 nullifier = 88888;
        vm.prank(operator);
        verifier.registerHuman(nullifier, 1);

        vm.expectRevert(WorldIDVerifier.AlreadyVerified.selector);
        vm.prank(operator);
        verifier.registerHuman(nullifier, 2);
    }

    function test_notVerifiedByDefault() public view {
        assertFalse(verifier.isVerifiedHuman(99999));
    }

    function test_verifier_revert_notOperator() public {
        vm.expectRevert(WorldIDVerifier.NotOperator.selector);
        vm.prank(address(0xBAD));
        verifier.registerHuman(11111, 1);
    }
}
