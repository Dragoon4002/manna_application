// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TokenFactory} from "../src/TokenFactory.sol";
import {MannaToken} from "../src/MannaToken.sol";

contract TokenFactoryTest is Test {
    TokenFactory public factory;

    address owner = address(this);
    address operator = address(0xC4E);
    address creator = address(0xBEEF);

    function setUp() public {
        factory = new TokenFactory();
        factory.setOperator(operator, true);
    }

    function test_deployToken() public {
        vm.prank(operator);
        address tokenAddr = factory.deployToken(
            "Test Token",
            "TEST",
            1_000_000e18,
            18,
            creator,
            true
        );

        assertTrue(tokenAddr != address(0));

        MannaToken token = MannaToken(tokenAddr);
        assertEq(token.name(), "Test Token");
        assertEq(token.symbol(), "TEST");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 1_000_000e18);
        assertEq(token.balanceOf(creator), 1_000_000e18);
        assertEq(token.owner(), creator);
        assertTrue(token.mintingEnabled());
    }

    function test_deployTokenWithoutMinting() public {
        vm.prank(operator);
        address tokenAddr = factory.deployToken(
            "No Mint Token",
            "NMT",
            500_000e18,
            18,
            creator,
            false
        );

        MannaToken token = MannaToken(tokenAddr);
        assertFalse(token.mintingEnabled());
    }

    function test_deployTokenCustomDecimals() public {
        vm.prank(operator);
        address tokenAddr = factory.deployToken(
            "USDC Clone",
            "USDC",
            1_000_000e6,
            6,
            creator,
            true
        );

        MannaToken token = MannaToken(tokenAddr);
        assertEq(token.decimals(), 6);
        assertEq(token.totalSupply(), 1_000_000e6);
    }

    function test_deployTokenZeroSupply() public {
        vm.prank(operator);
        address tokenAddr = factory.deployToken(
            "Empty Token",
            "EMPTY",
            0,
            18,
            creator,
            true
        );

        MannaToken token = MannaToken(tokenAddr);
        assertEq(token.totalSupply(), 0);
        assertEq(token.balanceOf(creator), 0);
    }

    function test_trackDeployedTokens() public {
        vm.prank(operator);
        address token1 = factory.deployToken("Token1", "TK1", 1000e18, 18, creator, true);

        vm.prank(operator);
        address token2 = factory.deployToken("Token2", "TK2", 2000e18, 18, creator, true);

        address[] memory deployed = factory.getDeployedTokens(creator);
        assertEq(deployed.length, 2);
        assertEq(deployed[0], token1);
        assertEq(deployed[1], token2);
    }

    function test_multipleCreators() public {
        address creator2 = address(0xDEAD);

        vm.prank(operator);
        address token1 = factory.deployToken("Token1", "TK1", 1000e18, 18, creator, true);

        vm.prank(operator);
        address token2 = factory.deployToken("Token2", "TK2", 2000e18, 18, creator2, true);

        address[] memory deployed1 = factory.getDeployedTokens(creator);
        address[] memory deployed2 = factory.getDeployedTokens(creator2);

        assertEq(deployed1.length, 1);
        assertEq(deployed1[0], token1);

        assertEq(deployed2.length, 1);
        assertEq(deployed2[0], token2);
    }

    function test_revert_notOperator() public {
        vm.expectRevert(TokenFactory.NotOperator.selector);
        vm.prank(address(0xBAD));
        factory.deployToken("Bad Token", "BAD", 1000e18, 18, creator, true);
    }

    function test_setOperator() public {
        address newOp = address(0x123);
        factory.setOperator(newOp, true);

        // New operator can deploy
        vm.prank(newOp);
        factory.deployToken("New Op Token", "NOP", 1000e18, 18, creator, true);
    }

    function test_removeOperator() public {
        factory.setOperator(operator, false);

        vm.expectRevert(TokenFactory.NotOperator.selector);
        vm.prank(operator);
        factory.deployToken("Token", "TKN", 1000e18, 18, creator, true);
    }

    function test_ownerCanAlwaysDeploy() public {
        // Owner can deploy even without operator role
        vm.prank(owner);
        address tokenAddr = factory.deployToken("Owner Token", "OWN", 1000e18, 18, creator, true);

        assertTrue(tokenAddr != address(0));
    }

    // --- MannaToken specific tests ---

    function test_tokenMint() public {
        vm.prank(operator);
        address tokenAddr = factory.deployToken("Mintable", "MINT", 1000e18, 18, creator, true);

        MannaToken token = MannaToken(tokenAddr);

        // Creator can mint
        vm.prank(creator);
        token.mint(address(0xCAFE), 500e18);

        assertEq(token.balanceOf(address(0xCAFE)), 500e18);
        assertEq(token.totalSupply(), 1500e18);
    }

    function test_revert_mintWhenDisabled() public {
        vm.prank(operator);
        address tokenAddr = factory.deployToken("No Mint", "NM", 1000e18, 18, creator, false);

        MannaToken token = MannaToken(tokenAddr);

        vm.expectRevert(MannaToken.MintingDisabled.selector);
        vm.prank(creator);
        token.mint(address(0xCAFE), 100e18);
    }

    function test_toggleMinting() public {
        vm.prank(operator);
        address tokenAddr = factory.deployToken("Toggle", "TGL", 1000e18, 18, creator, true);

        MannaToken token = MannaToken(tokenAddr);

        // Disable minting
        vm.prank(creator);
        token.setMinting(false);

        assertFalse(token.mintingEnabled());

        vm.expectRevert(MannaToken.MintingDisabled.selector);
        vm.prank(creator);
        token.mint(address(0xCAFE), 100e18);

        // Re-enable minting
        vm.prank(creator);
        token.setMinting(true);

        assertTrue(token.mintingEnabled());

        vm.prank(creator);
        token.mint(address(0xCAFE), 100e18);

        assertEq(token.balanceOf(address(0xCAFE)), 100e18);
    }
}
