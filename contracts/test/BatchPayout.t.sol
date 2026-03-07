// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BatchPayout} from "../src/BatchPayout.sol";
import {HumanDropToken} from "../src/HumanDropToken.sol";

contract BatchPayoutTest is Test {
    BatchPayout public payout;
    HumanDropToken public token;

    address sender = address(this);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address carol = address(0xCA201);

    uint256 constant SUPPLY = 1_000_000e18;

    function setUp() public {
        payout = new BatchPayout();
        token = new HumanDropToken(SUPPLY);

        // Approve BatchPayout to spend sender's tokens
        token.approve(address(payout), type(uint256).max);
    }

    function test_distribute() public {
        address[] memory recipients = new address[](3);
        recipients[0] = alice;
        recipients[1] = bob;
        recipients[2] = carol;

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 100e18;
        amounts[1] = 200e18;
        amounts[2] = 300e18;

        uint256 payoutId = payout.distribute(address(token), recipients, amounts);

        assertEq(payoutId, 0);
        assertEq(token.balanceOf(alice), 100e18);
        assertEq(token.balanceOf(bob), 200e18);
        assertEq(token.balanceOf(carol), 300e18);

        BatchPayout.Payout memory p = payout.getPayout(payoutId);
        assertEq(p.token, address(token));
        assertEq(p.sender, sender);
        assertEq(p.totalAmount, 600e18);
        assertEq(p.recipientCount, 3);
        assertEq(p.timestamp, block.timestamp);
    }

    function test_revert_lengthMismatch() public {
        address[] memory recipients = new address[](2);
        recipients[0] = alice;
        recipients[1] = bob;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100e18;

        vm.expectRevert(BatchPayout.LengthMismatch.selector);
        payout.distribute(address(token), recipients, amounts);
    }

    function test_revert_emptyRecipients() public {
        address[] memory recipients = new address[](0);
        uint256[] memory amounts = new uint256[](0);

        vm.expectRevert(BatchPayout.EmptyRecipients.selector);
        payout.distribute(address(token), recipients, amounts);
    }

    function test_payoutHistory() public {
        address[] memory recipients = new address[](1);
        recipients[0] = alice;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 50e18;

        payout.distribute(address(token), recipients, amounts);

        uint256[] memory ids = payout.getPayouts(sender);
        assertEq(ids.length, 1);
        assertEq(ids[0], 0);
    }

    function test_multiplePayouts() public {
        address[] memory recipients = new address[](1);
        recipients[0] = alice;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 10e18;

        payout.distribute(address(token), recipients, amounts);
        payout.distribute(address(token), recipients, amounts);
        payout.distribute(address(token), recipients, amounts);

        assertEq(payout.nextPayoutId(), 3);

        uint256[] memory ids = payout.getPayouts(sender);
        assertEq(ids.length, 3);
        assertEq(ids[0], 0);
        assertEq(ids[1], 1);
        assertEq(ids[2], 2);

        assertEq(token.balanceOf(alice), 30e18);

        BatchPayout.Payout memory p = payout.getPayout(2);
        assertEq(p.totalAmount, 10e18);
        assertEq(p.recipientCount, 1);
    }
}
