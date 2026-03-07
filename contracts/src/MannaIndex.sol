// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MannaIndex - Protocol-wide stats registry
/// @notice Aggregates stats from all chains via CRE cron job
contract MannaIndex is Ownable {
    error NotOperator();

    event StatsUpdated(
        uint256 totalAirdrops,
        uint256 totalLaunches,
        uint256 totalUsers,
        uint256 totalVolume,
        uint256 timestamp
    );

    struct ProtocolStats {
        uint256 totalAirdrops;
        uint256 totalLaunches;
        uint256 totalUsers;
        uint256 totalVolume; // in wei
        uint256 lastUpdate;
    }

    struct ChainStats {
        uint256 airdrops;
        uint256 launches;
        uint256 users;
        uint256 volume;
    }

    ProtocolStats public stats;
    mapping(address => bool) public operators;
    mapping(string => ChainStats) public chainStats; // chainName => stats

    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != owner()) revert NotOperator();
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setOperator(address op, bool status) external onlyOwner {
        operators[op] = status;
    }

    /// @notice Update protocol-wide stats. Only CRE operator.
    /// @param totalAirdrops Total airdrop campaigns across all chains
    /// @param totalLaunches Total fair launches across all chains
    /// @param totalUsers Unique verified humans
    /// @param totalVolume Total value distributed (in wei)
    function updateStats(
        uint256 totalAirdrops,
        uint256 totalLaunches,
        uint256 totalUsers,
        uint256 totalVolume
    ) external onlyOperator {
        stats = ProtocolStats({
            totalAirdrops: totalAirdrops,
            totalLaunches: totalLaunches,
            totalUsers: totalUsers,
            totalVolume: totalVolume,
            lastUpdate: block.timestamp
        });

        emit StatsUpdated(totalAirdrops, totalLaunches, totalUsers, totalVolume, block.timestamp);
    }

    /// @notice Update stats for a specific chain. Only CRE operator.
    function updateChainStats(
        string calldata chainName,
        uint256 airdrops,
        uint256 launches,
        uint256 users,
        uint256 volume
    ) external onlyOperator {
        chainStats[chainName] = ChainStats({
            airdrops: airdrops,
            launches: launches,
            users: users,
            volume: volume
        });
    }

    /// @notice Get protocol-wide stats.
    function getStats() external view returns (ProtocolStats memory) {
        return stats;
    }

    /// @notice Get stats for a specific chain.
    function getChainStats(string calldata chainName) external view returns (ChainStats memory) {
        return chainStats[chainName];
    }
}
