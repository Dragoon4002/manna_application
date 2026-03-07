// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title BatchPayout - Batch token distribution for the Manna project
/// @notice Allows anyone to distribute tokens to multiple recipients in a single tx.
contract BatchPayout is Ownable {
    using SafeERC20 for IERC20;

    error LengthMismatch();
    error EmptyRecipients();

    struct Payout {
        address token;
        address sender;
        uint256 totalAmount;
        uint256 recipientCount;
        uint256 timestamp;
    }

    uint256 public nextPayoutId;
    mapping(uint256 => Payout) public payouts;
    mapping(address => uint256[]) public senderPayouts;

    event PayoutCreated(
        uint256 indexed payoutId,
        address indexed token,
        address indexed sender,
        uint256 totalAmount,
        uint256 recipientCount
    );

    constructor() Ownable(msg.sender) {}

    /// @notice Distribute tokens to multiple recipients. Caller must have approved this contract.
    /// @param token ERC20 token address
    /// @param recipients Array of recipient addresses
    /// @param amounts Array of amounts corresponding to each recipient
    /// @return payoutId The ID of the recorded payout
    function distribute(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external returns (uint256 payoutId) {
        if (recipients.length != amounts.length) revert LengthMismatch();
        if (recipients.length == 0) revert EmptyRecipients();

        uint256 total;
        for (uint256 i; i < amounts.length;) {
            total += amounts[i];
            unchecked { ++i; }
        }

        // Pull total from sender, then push to each recipient
        IERC20(token).safeTransferFrom(msg.sender, address(this), total);

        for (uint256 i; i < recipients.length;) {
            IERC20(token).safeTransfer(recipients[i], amounts[i]);
            unchecked { ++i; }
        }

        payoutId = nextPayoutId++;
        payouts[payoutId] = Payout({
            token: token,
            sender: msg.sender,
            totalAmount: total,
            recipientCount: recipients.length,
            timestamp: block.timestamp
        });
        senderPayouts[msg.sender].push(payoutId);

        emit PayoutCreated(payoutId, token, msg.sender, total, recipients.length);
    }

    /// @notice Get all payout IDs for a sender.
    function getPayouts(address sender) external view returns (uint256[] memory) {
        return senderPayouts[sender];
    }

    /// @notice Get full payout details.
    function getPayout(uint256 payoutId) external view returns (Payout memory) {
        return payouts[payoutId];
    }
}
