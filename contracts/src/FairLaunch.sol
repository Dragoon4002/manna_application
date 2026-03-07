// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title FairLaunch - Token launch with linear bonding curve
/// @notice Users contribute ETH, receive tokens at current curve price. CRE finalizes distribution.
contract FairLaunch is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error NotOperator();
    error LaunchNotActive();
    error LaunchEnded();
    error LaunchNotEnded();
    error AlreadyFinalized();
    error SoftCapNotReached();
    error MaxPerWalletExceeded();
    error HardCapExceeded();
    error InsufficientTokens();
    error NoContribution();
    error InvalidParams();
    error AlreadyClaimed();

    event LaunchCreated(
        uint256 indexed launchId,
        address indexed token,
        address indexed creator,
        uint256 totalTokens,
        uint256 startPrice,
        uint256 endPrice,
        uint256 endTime
    );
    event Contributed(uint256 indexed launchId, address indexed contributor, uint256 ethAmount, uint256 tokensReceived);
    event Finalized(uint256 indexed launchId, bool success, uint256 totalRaised, uint256 totalTokensSold);
    event Refunded(uint256 indexed launchId, address indexed contributor, uint256 ethAmount);
    event Claimed(uint256 indexed launchId, address indexed contributor, uint256 tokensReceived);

    struct Launch {
        address token;
        address creator;
        uint256 totalTokens;
        uint256 tokensSold;
        uint256 hardCap;
        uint256 softCap;
        uint256 raised;
        uint256 startTime;
        uint256 endTime;
        uint256 maxPerWallet;
        uint256 startPrice;
        uint256 endPrice;
        bool finalized;
        bool success;
    }

    uint256 public nextLaunchId;
    mapping(uint256 => Launch) public launches;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(uint256 => mapping(address => uint256)) public tokenAllocations;
    mapping(uint256 => mapping(address => bool)) public claimed;
    mapping(address => bool) public operators;

    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != owner()) revert NotOperator();
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setOperator(address op, bool status) external onlyOwner {
        operators[op] = status;
    }

    /// @notice Create a new fair launch. Creator must transfer tokens to this contract.
    /// @param token Token to launch
    /// @param totalTokens Total tokens for sale
    /// @param hardCap Max ETH to raise (0 = no cap)
    /// @param softCap Min ETH to succeed
    /// @param duration Launch duration in seconds
    /// @param maxPerWallet Max ETH contribution per wallet
    /// @param startPrice Starting price per token (wei per 1e18 tokens)
    /// @param endPrice Ending price per token (wei per 1e18 tokens)
    function createLaunch(
        address token,
        uint256 totalTokens,
        uint256 hardCap,
        uint256 softCap,
        uint256 duration,
        uint256 maxPerWallet,
        uint256 startPrice,
        uint256 endPrice
    ) external returns (uint256 launchId) {
        if (softCap > hardCap && hardCap != 0) revert InvalidParams();
        if (endPrice <= startPrice) revert InvalidParams();
        if (totalTokens == 0 || duration == 0) revert InvalidParams();

        // Transfer tokens to contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), totalTokens);

        launchId = nextLaunchId++;
        launches[launchId] = Launch({
            token: token,
            creator: msg.sender,
            totalTokens: totalTokens,
            tokensSold: 0,
            hardCap: hardCap,
            softCap: softCap,
            raised: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            maxPerWallet: maxPerWallet,
            startPrice: startPrice,
            endPrice: endPrice,
            finalized: false,
            success: false
        });

        emit LaunchCreated(launchId, token, msg.sender, totalTokens, startPrice, endPrice, block.timestamp + duration);
    }

    /// @notice Contribute ETH to a launch, receive tokens at current bonding curve price.
    /// @dev Price increases linearly: price = startPrice + (endPrice - startPrice) * (tokensSold / totalTokens)
    function contribute(uint256 launchId) external payable nonReentrant {
        Launch storage launch = launches[launchId];
        if (launch.token == address(0)) revert LaunchNotActive();
        if (block.timestamp >= launch.endTime) revert LaunchEnded();
        if (launch.finalized) revert AlreadyFinalized();

        uint256 contributionAmount = msg.value;
        uint256 totalContribution = contributions[launchId][msg.sender] + contributionAmount;
        if (totalContribution > launch.maxPerWallet && launch.maxPerWallet != 0) revert MaxPerWalletExceeded();

        // Calculate current price on bonding curve
        uint256 currentPrice = _getCurrentPrice(launch);

        // Calculate tokens to receive (simplified: use current price for entire purchase)
        // tokens = ethAmount / (price / 1e18)
        uint256 tokensToReceive = (contributionAmount * 1e18) / currentPrice;

        if (launch.tokensSold + tokensToReceive > launch.totalTokens) {
            // Cap at remaining tokens
            tokensToReceive = launch.totalTokens - launch.tokensSold;
            contributionAmount = (tokensToReceive * currentPrice) / 1e18;

            // Refund excess
            uint256 excess = msg.value - contributionAmount;
            if (excess > 0) {
                payable(msg.sender).transfer(excess);
            }
        }

        if (launch.hardCap != 0 && launch.raised + contributionAmount > launch.hardCap) {
            revert HardCapExceeded();
        }

        // Update state
        contributions[launchId][msg.sender] += contributionAmount;
        tokenAllocations[launchId][msg.sender] += tokensToReceive;
        launch.raised += contributionAmount;
        launch.tokensSold += tokensToReceive;

        emit Contributed(launchId, msg.sender, contributionAmount, tokensToReceive);
    }

    /// @notice Finalize launch. Only CRE operator after time expires.
    /// @dev If softCap reached: send ETH to creator. If not: enable refunds.
    function finalize(uint256 launchId) external onlyOperator {
        Launch storage launch = launches[launchId];
        if (launch.token == address(0)) revert LaunchNotActive();
        if (block.timestamp < launch.endTime) revert LaunchNotEnded();
        if (launch.finalized) revert AlreadyFinalized();

        launch.finalized = true;

        if (launch.raised >= launch.softCap) {
            // Success: transfer ETH to creator
            launch.success = true;
            uint256 creatorAmount = launch.raised;

            // Transfer remaining unsold tokens back to creator
            uint256 remainingTokens = launch.totalTokens - launch.tokensSold;
            if (remainingTokens > 0) {
                IERC20(launch.token).safeTransfer(launch.creator, remainingTokens);
            }

            payable(launch.creator).transfer(creatorAmount);
        } else {
            // Failed: refunds enabled
            launch.success = false;

            // Return unsold tokens to creator
            uint256 remainingTokens = launch.totalTokens - launch.tokensSold;
            if (remainingTokens > 0) {
                IERC20(launch.token).safeTransfer(launch.creator, remainingTokens);
            }
        }

        emit Finalized(launchId, launch.success, launch.raised, launch.tokensSold);
    }

    /// @notice Claim tokens if launch succeeded.
    function claim(uint256 launchId) external nonReentrant {
        Launch storage launch = launches[launchId];
        if (!launch.finalized) revert LaunchNotEnded();
        if (!launch.success) revert SoftCapNotReached();
        if (claimed[launchId][msg.sender]) revert AlreadyClaimed();

        uint256 allocation = tokenAllocations[launchId][msg.sender];
        if (allocation == 0) revert NoContribution();

        claimed[launchId][msg.sender] = true;
        IERC20(launch.token).safeTransfer(msg.sender, allocation);

        emit Claimed(launchId, msg.sender, allocation);
    }

    /// @notice Claim refund if launch failed (softCap not reached).
    function refund(uint256 launchId) external nonReentrant {
        Launch storage launch = launches[launchId];
        if (!launch.finalized) revert LaunchNotEnded();
        if (launch.success) revert SoftCapNotReached();
        if (claimed[launchId][msg.sender]) revert AlreadyClaimed();

        uint256 contribution = contributions[launchId][msg.sender];
        if (contribution == 0) revert NoContribution();

        claimed[launchId][msg.sender] = true;
        payable(msg.sender).transfer(contribution);

        emit Refunded(launchId, msg.sender, contribution);
    }

    /// @notice Get current price on bonding curve for a launch.
    /// @dev price = startPrice + (endPrice - startPrice) * (tokensSold / totalTokens)
    function getCurrentPrice(uint256 launchId) external view returns (uint256) {
        return _getCurrentPrice(launches[launchId]);
    }

    function _getCurrentPrice(Launch storage launch) internal view returns (uint256) {
        if (launch.tokensSold >= launch.totalTokens) {
            return launch.endPrice;
        }

        uint256 priceRange = launch.endPrice - launch.startPrice;
        uint256 progress = (launch.tokensSold * 1e18) / launch.totalTokens;
        uint256 priceIncrease = (priceRange * progress) / 1e18;

        return launch.startPrice + priceIncrease;
    }

    /// @notice Get launch details.
    function getLaunch(uint256 launchId) external view returns (Launch memory) {
        return launches[launchId];
    }

    /// @notice Get contribution amount for a wallet.
    function getContribution(uint256 launchId, address contributor) external view returns (uint256) {
        return contributions[launchId][contributor];
    }

    /// @notice Get all active (non-finalized) launches.
    function getActiveLaunches() external view returns (uint256[] memory) {
        uint256 activeCount = 0;

        // Count active launches
        for (uint256 i = 0; i < nextLaunchId; i++) {
            if (!launches[i].finalized && launches[i].token != address(0)) {
                activeCount++;
            }
        }

        // Build array
        uint256[] memory activeLaunches = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < nextLaunchId; i++) {
            if (!launches[i].finalized && launches[i].token != address(0)) {
                activeLaunches[index] = i;
                index++;
            }
        }

        return activeLaunches;
    }
}
