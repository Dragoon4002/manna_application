// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {FairLaunch} from "../src/FairLaunch.sol";
import {MannaToken} from "../src/MannaToken.sol";

contract FairLaunchTest is Test {
    FairLaunch public launch;
    MannaToken public token;

    address owner = address(this);
    address operator = address(0xC4E);
    address creator = address(0xBEEF);
    address contributor1 = address(0xCAFE);
    address contributor2 = address(0xDEAD);

    uint256 constant TOTAL_TOKENS = 1_000_000e18;
    uint256 constant HARD_CAP = 100 ether;
    uint256 constant SOFT_CAP = 10 ether;
    uint256 constant DURATION = 7 days;
    uint256 constant MAX_PER_WALLET = 20 ether;
    uint256 constant START_PRICE = 0.0001 ether; // per token
    uint256 constant END_PRICE = 0.001 ether; // per token

    uint256 launchId;

    function setUp() public {
        launch = new FairLaunch();
        launch.setOperator(operator, true);

        // Creator deploys token
        vm.startPrank(creator);
        token = new MannaToken("Launch Token", "LAUNCH", TOTAL_TOKENS, 18, creator, false);
        token.approve(address(launch), TOTAL_TOKENS);

        // Create launch
        launchId = launch.createLaunch(
            address(token),
            TOTAL_TOKENS,
            HARD_CAP,
            SOFT_CAP,
            DURATION,
            MAX_PER_WALLET,
            START_PRICE,
            END_PRICE
        );
        vm.stopPrank();

        // Fund contributors
        vm.deal(contributor1, 100 ether);
        vm.deal(contributor2, 100 ether);
    }

    // --- Creation Tests ---

    function test_createLaunch() public view {
        FairLaunch.Launch memory l = launch.getLaunch(launchId);
        assertEq(l.token, address(token));
        assertEq(l.creator, creator);
        assertEq(l.totalTokens, TOTAL_TOKENS);
        assertEq(l.tokensSold, 0);
        assertEq(l.hardCap, HARD_CAP);
        assertEq(l.softCap, SOFT_CAP);
        assertEq(l.raised, 0);
        assertEq(l.maxPerWallet, MAX_PER_WALLET);
        assertEq(l.startPrice, START_PRICE);
        assertEq(l.endPrice, END_PRICE);
        assertFalse(l.finalized);
        assertFalse(l.success);
    }

    function test_revert_invalidParams_softCapExceedsHardCap() public {
        vm.startPrank(creator);
        token.approve(address(launch), TOTAL_TOKENS);

        vm.expectRevert(FairLaunch.InvalidParams.selector);
        launch.createLaunch(
            address(token),
            TOTAL_TOKENS,
            10 ether, // hardCap
            20 ether, // softCap > hardCap
            DURATION,
            MAX_PER_WALLET,
            START_PRICE,
            END_PRICE
        );
        vm.stopPrank();
    }

    function test_revert_invalidParams_endPriceLteStartPrice() public {
        vm.startPrank(creator);
        token.approve(address(launch), TOTAL_TOKENS);

        vm.expectRevert(FairLaunch.InvalidParams.selector);
        launch.createLaunch(
            address(token),
            TOTAL_TOKENS,
            HARD_CAP,
            SOFT_CAP,
            DURATION,
            MAX_PER_WALLET,
            0.001 ether, // startPrice
            0.0001 ether  // endPrice < startPrice
        );
        vm.stopPrank();
    }

    // --- Contribution Tests ---

    function test_contribute() public {
        vm.prank(contributor1);
        launch.contribute{value: 1 ether}(launchId);

        FairLaunch.Launch memory l = launch.getLaunch(launchId);
        assertGt(l.tokensSold, 0);
        assertEq(l.raised, 1 ether);
        assertEq(launch.getContribution(launchId, contributor1), 1 ether);
    }

    function test_bondingCurve_priceIncreases() public {
        uint256 price1 = launch.getCurrentPrice(launchId);
        assertEq(price1, START_PRICE);

        // Contribute to move price
        vm.prank(contributor1);
        launch.contribute{value: 5 ether}(launchId);

        uint256 price2 = launch.getCurrentPrice(launchId);
        assertGt(price2, price1);
        assertLt(price2, END_PRICE);
    }

    function test_multipleContributions() public {
        vm.prank(contributor1);
        launch.contribute{value: 2 ether}(launchId);

        vm.prank(contributor2);
        launch.contribute{value: 3 ether}(launchId);

        FairLaunch.Launch memory l = launch.getLaunch(launchId);
        assertEq(l.raised, 5 ether);
        assertEq(launch.getContribution(launchId, contributor1), 2 ether);
        assertEq(launch.getContribution(launchId, contributor2), 3 ether);
    }

    function test_revert_maxPerWalletExceeded() public {
        vm.expectRevert(FairLaunch.MaxPerWalletExceeded.selector);
        vm.prank(contributor1);
        launch.contribute{value: MAX_PER_WALLET + 1}(launchId);
    }

    function test_revert_maxPerWalletExceeded_cumulative() public {
        vm.prank(contributor1);
        launch.contribute{value: 15 ether}(launchId);

        vm.expectRevert(FairLaunch.MaxPerWalletExceeded.selector);
        vm.prank(contributor1);
        launch.contribute{value: 6 ether}(launchId); // 15 + 6 > 20
    }

    function test_revert_launchEnded() public {
        vm.warp(block.timestamp + DURATION + 1);

        vm.expectRevert(FairLaunch.LaunchEnded.selector);
        vm.prank(contributor1);
        launch.contribute{value: 1 ether}(launchId);
    }

    function test_revert_hardCapExceeded() public {
        // Create launch with low hardCap
        vm.startPrank(creator);
        MannaToken token2 = new MannaToken("Token2", "TK2", TOTAL_TOKENS, 18, creator, false);
        token2.approve(address(launch), TOTAL_TOKENS);
        uint256 lowCapId = launch.createLaunch(
            address(token2),
            TOTAL_TOKENS,
            5 ether, // hardCap
            1 ether, // softCap
            DURATION,
            10 ether, // maxPerWallet
            START_PRICE,
            END_PRICE
        );
        vm.stopPrank();

        vm.expectRevert(FairLaunch.HardCapExceeded.selector);
        vm.prank(contributor1);
        launch.contribute{value: 6 ether}(lowCapId);
    }

    function test_excessRefund_whenTokensSoldOut() public {
        // Create launch with fewer tokens
        vm.startPrank(creator);
        MannaToken smallToken = new MannaToken("Small", "SML", 1000e18, 18, creator, false);
        smallToken.approve(address(launch), 1000e18);
        uint256 smallId = launch.createLaunch(
            address(smallToken),
            1000e18,
            0, // no hardCap
            1 ether,
            DURATION,
            100 ether,
            0.01 ether,
            0.02 ether
        );
        vm.stopPrank();

        uint256 balanceBefore = contributor1.balance;

        vm.prank(contributor1);
        launch.contribute{value: 50 ether}(smallId);

        // Should receive refund for excess
        uint256 spent = balanceBefore - contributor1.balance;
        assertLt(spent, 50 ether); // Didn't use full 50 ETH
    }

    // --- Finalization Tests ---

    function test_finalize_success() public {
        // Contribute above softCap
        vm.prank(contributor1);
        launch.contribute{value: 5 ether}(launchId);

        vm.prank(contributor2);
        launch.contribute{value: 6 ether}(launchId);

        uint256 creatorBalanceBefore = creator.balance;

        // Warp past endTime
        vm.warp(block.timestamp + DURATION + 1);

        vm.prank(operator);
        launch.finalize(launchId);

        FairLaunch.Launch memory l = launch.getLaunch(launchId);
        assertTrue(l.finalized);
        assertTrue(l.success);

        // Creator receives ETH
        assertEq(creator.balance, creatorBalanceBefore + 11 ether);

        // Creator receives unsold tokens
        assertGt(token.balanceOf(creator), 0);
    }

    function test_finalize_failed() public {
        // Contribute below softCap
        vm.prank(contributor1);
        launch.contribute{value: 5 ether}(launchId);

        // Warp past endTime
        vm.warp(block.timestamp + DURATION + 1);

        vm.prank(operator);
        launch.finalize(launchId);

        FairLaunch.Launch memory l = launch.getLaunch(launchId);
        assertTrue(l.finalized);
        assertFalse(l.success);

        // Creator doesn't receive ETH (goes to refunds)
    }

    function test_revert_finalize_notEnded() public {
        vm.expectRevert(FairLaunch.LaunchNotEnded.selector);
        vm.prank(operator);
        launch.finalize(launchId);
    }

    function test_revert_finalize_alreadyFinalized() public {
        vm.warp(block.timestamp + DURATION + 1);

        vm.prank(operator);
        launch.finalize(launchId);

        vm.expectRevert(FairLaunch.AlreadyFinalized.selector);
        vm.prank(operator);
        launch.finalize(launchId);
    }

    function test_revert_finalize_notOperator() public {
        vm.warp(block.timestamp + DURATION + 1);

        vm.expectRevert(FairLaunch.NotOperator.selector);
        vm.prank(address(0xBAD));
        launch.finalize(launchId);
    }

    // --- Claim Tests ---

    function test_claim_afterSuccess() public {
        // Contribute above softCap
        vm.prank(contributor1);
        launch.contribute{value: 11 ether}(launchId);

        uint256 allocation = launch.tokenAllocations(launchId, contributor1);
        assertGt(allocation, 0);

        // Finalize successfully
        vm.warp(block.timestamp + DURATION + 1);
        vm.prank(operator);
        launch.finalize(launchId);

        // Claim tokens
        vm.prank(contributor1);
        launch.claim(launchId);

        assertEq(token.balanceOf(contributor1), allocation);
        assertTrue(launch.claimed(launchId, contributor1));
    }

    function test_revert_claim_notFinalized() public {
        vm.prank(contributor1);
        launch.contribute{value: 5 ether}(launchId);

        vm.expectRevert(FairLaunch.LaunchNotEnded.selector);
        vm.prank(contributor1);
        launch.claim(launchId);
    }

    function test_revert_claim_failed() public {
        vm.prank(contributor1);
        launch.contribute{value: 5 ether}(launchId);

        vm.warp(block.timestamp + DURATION + 1);
        vm.prank(operator);
        launch.finalize(launchId);

        vm.expectRevert(FairLaunch.SoftCapNotReached.selector);
        vm.prank(contributor1);
        launch.claim(launchId);
    }

    function test_revert_claim_alreadyClaimed() public {
        vm.prank(contributor1);
        launch.contribute{value: 11 ether}(launchId);

        vm.warp(block.timestamp + DURATION + 1);
        vm.prank(operator);
        launch.finalize(launchId);

        vm.prank(contributor1);
        launch.claim(launchId);

        vm.expectRevert(FairLaunch.AlreadyClaimed.selector);
        vm.prank(contributor1);
        launch.claim(launchId);
    }

    // --- Refund Tests ---

    function test_refund_afterFailure() public {
        vm.prank(contributor1);
        launch.contribute{value: 5 ether}(launchId);

        uint256 balanceBefore = contributor1.balance;

        // Finalize as failure
        vm.warp(block.timestamp + DURATION + 1);
        vm.prank(operator);
        launch.finalize(launchId);

        // Claim refund
        vm.prank(contributor1);
        launch.refund(launchId);

        assertEq(contributor1.balance, balanceBefore + 5 ether);
        assertTrue(launch.claimed(launchId, contributor1));
    }

    function test_revert_refund_success() public {
        vm.prank(contributor1);
        launch.contribute{value: 11 ether}(launchId);

        vm.warp(block.timestamp + DURATION + 1);
        vm.prank(operator);
        launch.finalize(launchId);

        vm.expectRevert(FairLaunch.SoftCapNotReached.selector);
        vm.prank(contributor1);
        launch.refund(launchId);
    }

    function test_revert_refund_notFinalized() public {
        vm.prank(contributor1);
        launch.contribute{value: 5 ether}(launchId);

        vm.expectRevert(FairLaunch.LaunchNotEnded.selector);
        vm.prank(contributor1);
        launch.refund(launchId);
    }

    function test_revert_refund_alreadyClaimed() public {
        vm.prank(contributor1);
        launch.contribute{value: 5 ether}(launchId);

        vm.warp(block.timestamp + DURATION + 1);
        vm.prank(operator);
        launch.finalize(launchId);

        vm.prank(contributor1);
        launch.refund(launchId);

        vm.expectRevert(FairLaunch.AlreadyClaimed.selector);
        vm.prank(contributor1);
        launch.refund(launchId);
    }

    function test_revert_refund_noContribution() public {
        vm.prank(contributor1);
        launch.contribute{value: 5 ether}(launchId);

        vm.warp(block.timestamp + DURATION + 1);
        vm.prank(operator);
        launch.finalize(launchId);

        vm.expectRevert(FairLaunch.NoContribution.selector);
        vm.prank(contributor2);
        launch.refund(launchId);
    }

    // --- Integration Tests ---

    function test_fullLifecycle_success() public {
        // Multiple contributions
        vm.prank(contributor1);
        launch.contribute{value: 4 ether}(launchId);

        vm.prank(contributor2);
        launch.contribute{value: 3 ether}(launchId);

        vm.prank(contributor1);
        launch.contribute{value: 1 ether}(launchId);

        vm.prank(contributor2);
        launch.contribute{value: 2 ether}(launchId);

        // Total: 10 ether = softCap
        FairLaunch.Launch memory l = launch.getLaunch(launchId);
        assertEq(l.raised, 10 ether);

        uint256 alloc1 = launch.tokenAllocations(launchId, contributor1);
        uint256 alloc2 = launch.tokenAllocations(launchId, contributor2);

        // Finalize
        vm.warp(block.timestamp + DURATION + 1);
        vm.prank(operator);
        launch.finalize(launchId);

        // Claim tokens
        vm.prank(contributor1);
        launch.claim(launchId);

        vm.prank(contributor2);
        launch.claim(launchId);

        assertEq(token.balanceOf(contributor1), alloc1);
        assertEq(token.balanceOf(contributor2), alloc2);
    }

    function test_fullLifecycle_failure() public {
        // Contribution below softCap
        vm.prank(contributor1);
        launch.contribute{value: 3 ether}(launchId);

        vm.prank(contributor2);
        launch.contribute{value: 2 ether}(launchId);

        uint256 bal1Before = contributor1.balance;
        uint256 bal2Before = contributor2.balance;

        // Finalize
        vm.warp(block.timestamp + DURATION + 1);
        vm.prank(operator);
        launch.finalize(launchId);

        // Refund
        vm.prank(contributor1);
        launch.refund(launchId);

        vm.prank(contributor2);
        launch.refund(launchId);

        assertEq(contributor1.balance, bal1Before + 3 ether);
        assertEq(contributor2.balance, bal2Before + 2 ether);
        assertEq(token.balanceOf(contributor1), 0);
        assertEq(token.balanceOf(contributor2), 0);
    }

    function test_noHardCap() public {
        // Create launch without hardCap
        vm.startPrank(creator);
        MannaToken token3 = new MannaToken("Token3", "TK3", TOTAL_TOKENS, 18, creator, false);
        token3.approve(address(launch), TOTAL_TOKENS);
        uint256 noCapId = launch.createLaunch(
            address(token3),
            TOTAL_TOKENS,
            0, // no hardCap
            SOFT_CAP,
            DURATION,
            50 ether,
            START_PRICE,
            END_PRICE
        );
        vm.stopPrank();

        // Can contribute more than previous hardCap
        vm.prank(contributor1);
        launch.contribute{value: 20 ether}(noCapId);

        FairLaunch.Launch memory l = launch.getLaunch(noCapId);
        assertEq(l.raised, 20 ether);
    }
}
