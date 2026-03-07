// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MannaIndex} from "../src/MannaIndex.sol";

contract MannaIndexTest is Test {
    MannaIndex public index;

    address owner = address(this);
    address operator = address(0xC4E);
    address unauthorized = address(0xBAD);

    function setUp() public {
        index = new MannaIndex();
        index.setOperator(operator, true);
    }

    function test_updateStats() public {
        vm.prank(operator);
        index.updateStats(100, 50, 1000, 5000 ether);

        MannaIndex.ProtocolStats memory stats = index.getStats();
        assertEq(stats.totalAirdrops, 100);
        assertEq(stats.totalLaunches, 50);
        assertEq(stats.totalUsers, 1000);
        assertEq(stats.totalVolume, 5000 ether);
        assertEq(stats.lastUpdate, block.timestamp);
    }

    function test_updateChainStats() public {
        vm.prank(operator);
        index.updateChainStats("arbitrum-sepolia", 30, 15, 300, 1500 ether);

        MannaIndex.ChainStats memory chainStats = index.getChainStats("arbitrum-sepolia");
        assertEq(chainStats.airdrops, 30);
        assertEq(chainStats.launches, 15);
        assertEq(chainStats.users, 300);
        assertEq(chainStats.volume, 1500 ether);
    }

    function test_multipleChainStats() public {
        vm.startPrank(operator);
        index.updateChainStats("world-chain", 40, 20, 400, 2000 ether);
        index.updateChainStats("base-sepolia", 30, 15, 300, 1500 ether);
        index.updateChainStats("arbitrum-sepolia", 30, 15, 300, 1500 ether);
        vm.stopPrank();

        MannaIndex.ChainStats memory worldStats = index.getChainStats("world-chain");
        assertEq(worldStats.airdrops, 40);

        MannaIndex.ChainStats memory baseStats = index.getChainStats("base-sepolia");
        assertEq(baseStats.airdrops, 30);
    }

    function test_revert_updateStats_notOperator() public {
        vm.expectRevert(MannaIndex.NotOperator.selector);
        vm.prank(unauthorized);
        index.updateStats(100, 50, 1000, 5000 ether);
    }

    function test_revert_updateChainStats_notOperator() public {
        vm.expectRevert(MannaIndex.NotOperator.selector);
        vm.prank(unauthorized);
        index.updateChainStats("arbitrum-sepolia", 30, 15, 300, 1500 ether);
    }

    function test_ownerCanUpdateStats() public {
        vm.prank(owner);
        index.updateStats(200, 100, 2000, 10000 ether);

        MannaIndex.ProtocolStats memory stats = index.getStats();
        assertEq(stats.totalAirdrops, 200);
    }

    function test_setOperator() public {
        address newOp = address(0xA11CE);
        index.setOperator(newOp, true);
        assertTrue(index.operators(newOp));

        vm.prank(newOp);
        index.updateStats(150, 75, 1500, 7500 ether);

        MannaIndex.ProtocolStats memory stats = index.getStats();
        assertEq(stats.totalAirdrops, 150);
    }

    function test_getStats_default() public view {
        MannaIndex.ProtocolStats memory stats = index.getStats();
        assertEq(stats.totalAirdrops, 0);
        assertEq(stats.totalLaunches, 0);
        assertEq(stats.totalUsers, 0);
        assertEq(stats.totalVolume, 0);
        assertEq(stats.lastUpdate, 0);
    }

    function test_updateStats_emitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit MannaIndex.StatsUpdated(100, 50, 1000, 5000 ether, block.timestamp);

        vm.prank(operator);
        index.updateStats(100, 50, 1000, 5000 ether);
    }
}
