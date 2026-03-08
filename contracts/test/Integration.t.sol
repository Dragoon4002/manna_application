// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TokenFactory} from "../src/TokenFactory.sol";
import {MannaToken} from "../src/MannaToken.sol";
import {FairLaunch} from "../src/FairLaunch.sol";
import {HumanDrop} from "../src/HumanDrop.sol";
import {WorldIDVerifier} from "../src/WorldIDVerifier.sol";
import {StakingVault} from "../src/StakingVault.sol";
import {VestingVault} from "../src/VestingVault.sol";
import {BatchPayout} from "../src/BatchPayout.sol";
import {MannaIndex} from "../src/MannaIndex.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Integration Tests - Real-world multi-contract flows
/// @notice Tests end-to-end scenarios that chain multiple contracts together
contract IntegrationTest is Test {
    TokenFactory public factory;
    FairLaunch public fairLaunch;
    HumanDrop public humanDrop;
    WorldIDVerifier public verifier;
    VestingVault public vestingVault;
    BatchPayout public batchPayout;
    MannaIndex public mannaIndex;

    address owner = address(this);
    address operator = address(0xC4E);
    address creator = address(0xBEEF);
    address user1 = address(0xCAFE);
    address user2 = address(0xDEAD);
    address user3 = address(0xFACE);
    address user4 = address(0xF00D);

    uint256 constant SUPPLY = 1_000_000e18;
    uint256 constant SOFT_CAP = 10 ether;
    uint256 constant HARD_CAP = 100 ether;
    uint256 constant DURATION = 7 days;
    uint256 constant MAX_PER_WALLET = 50 ether;
    uint256 constant START_PRICE = 0.0001 ether;
    uint256 constant END_PRICE = 0.001 ether;

    function setUp() public {
        factory = new TokenFactory();
        fairLaunch = new FairLaunch();
        humanDrop = new HumanDrop();
        verifier = new WorldIDVerifier();
        vestingVault = new VestingVault();
        batchPayout = new BatchPayout();
        mannaIndex = new MannaIndex();

        // Wire operator on all operator-gated contracts
        factory.setOperator(operator, true);
        fairLaunch.setOperator(operator, true);
        humanDrop.setOperator(operator, true);
        verifier.setOperator(operator, true);
        mannaIndex.setOperator(operator, true);

        // Fund users with ETH
        vm.deal(user1, 200 ether);
        vm.deal(user2, 200 ether);
        vm.deal(user3, 200 ether);
        vm.deal(creator, 10 ether);
    }

    // ================================================================
    // Helper: deploy token via TokenFactory (as operator, owned by creator)
    // ================================================================
    function _deployToken(bool enableMinting) internal returns (MannaToken) {
        vm.prank(operator);
        address tokenAddr = factory.deployToken(
            "Integration Token", "INT", SUPPLY, 18, creator, enableMinting
        );
        return MannaToken(tokenAddr);
    }

    // ================================================================
    // Test 1: TokenFactory -> FairLaunch (success) -> Claim
    // ================================================================
    function test_tokenDeploy_fairLaunch_success() public {
        MannaToken token = _deployToken(false);

        // Verify token tracked by factory
        address[] memory deployed = factory.getDeployedTokens(creator);
        assertEq(deployed.length, 1);
        assertEq(deployed[0], address(token));
        assertEq(token.balanceOf(creator), SUPPLY);

        // Creator approves + creates launch
        vm.startPrank(creator);
        token.approve(address(fairLaunch), SUPPLY);
        uint256 launchId = fairLaunch.createLaunch(
            address(token), SUPPLY, HARD_CAP, SOFT_CAP,
            DURATION, MAX_PER_WALLET, START_PRICE, END_PRICE
        );
        vm.stopPrank();

        // Tokens moved to FairLaunch
        assertEq(token.balanceOf(creator), 0);
        assertEq(token.balanceOf(address(fairLaunch)), SUPPLY);

        // 3 contributors buy — price should increase with each
        uint256 price1 = fairLaunch.getCurrentPrice(launchId);

        vm.prank(user1);
        fairLaunch.contribute{value: 5 ether}(launchId);
        uint256 price2 = fairLaunch.getCurrentPrice(launchId);
        assertGt(price2, price1);

        vm.prank(user2);
        fairLaunch.contribute{value: 4 ether}(launchId);
        uint256 price3 = fairLaunch.getCurrentPrice(launchId);
        assertGt(price3, price2);

        vm.prank(user3);
        fairLaunch.contribute{value: 3 ether}(launchId);

        // Total raised = 12 ETH >= softCap (10 ETH)
        FairLaunch.Launch memory l = fairLaunch.getLaunch(launchId);
        assertEq(l.raised, 12 ether);
        assertGe(l.raised, SOFT_CAP);

        // Record allocations before finalize
        uint256 alloc1 = fairLaunch.tokenAllocations(launchId, user1);
        uint256 alloc2 = fairLaunch.tokenAllocations(launchId, user2);
        uint256 alloc3 = fairLaunch.tokenAllocations(launchId, user3);
        assertGt(alloc1, 0);
        assertGt(alloc2, 0);
        assertGt(alloc3, 0);

        // Warp past end, operator finalizes
        uint256 creatorEthBefore = creator.balance;
        vm.warp(block.timestamp + DURATION + 1);
        vm.prank(operator);
        fairLaunch.finalize(launchId);

        l = fairLaunch.getLaunch(launchId);
        assertTrue(l.finalized);
        assertTrue(l.success);

        // Creator received ETH + unsold tokens
        assertEq(creator.balance, creatorEthBefore + 12 ether);
        uint256 unsold = SUPPLY - l.tokensSold;
        assertEq(token.balanceOf(creator), unsold);

        // Contributors claim tokens
        vm.prank(user1);
        fairLaunch.claim(launchId);
        assertEq(token.balanceOf(user1), alloc1);

        vm.prank(user2);
        fairLaunch.claim(launchId);
        assertEq(token.balanceOf(user2), alloc2);

        vm.prank(user3);
        fairLaunch.claim(launchId);
        assertEq(token.balanceOf(user3), alloc3);

        // All tokens accounted for
        assertEq(
            token.balanceOf(user1) + token.balanceOf(user2) + token.balanceOf(user3) + token.balanceOf(creator),
            SUPPLY
        );
    }

    // ================================================================
    // Test 2: TokenFactory -> FairLaunch (failure) -> Refund
    // ================================================================
    function test_tokenDeploy_fairLaunch_failure_refund() public {
        MannaToken token = _deployToken(false);

        vm.startPrank(creator);
        token.approve(address(fairLaunch), SUPPLY);
        uint256 launchId = fairLaunch.createLaunch(
            address(token), SUPPLY, HARD_CAP, SOFT_CAP,
            DURATION, MAX_PER_WALLET, START_PRICE, END_PRICE
        );
        vm.stopPrank();

        // Only 1 small contribution — below softCap
        vm.prank(user1);
        fairLaunch.contribute{value: 3 ether}(launchId);

        uint256 user1EthBefore = user1.balance;

        // Warp + finalize → failure
        vm.warp(block.timestamp + DURATION + 1);
        vm.prank(operator);
        fairLaunch.finalize(launchId);

        FairLaunch.Launch memory l = fairLaunch.getLaunch(launchId);
        assertTrue(l.finalized);
        assertFalse(l.success);

        // Creator gets unsold tokens back
        uint256 unsold = SUPPLY - l.tokensSold;
        assertEq(token.balanceOf(creator), unsold);

        // Contributor refunds
        vm.prank(user1);
        fairLaunch.refund(launchId);
        assertEq(user1.balance, user1EthBefore + 3 ether);

        // Contributor has no tokens
        assertEq(token.balanceOf(user1), 0);
    }

    // ================================================================
    // Test 3: TokenFactory -> Airdrop -> Multi-claim -> Expiry Reclaim
    // ================================================================
    function test_tokenDeploy_airdrop_multiClaim_expiryReclaim() public {
        // Deploy token with minting enabled
        MannaToken token = _deployToken(true);

        // Mint extra supply for airdrop
        uint256 airdropSupply = 500_000e18;
        vm.prank(creator);
        token.mint(creator, airdropSupply);
        assertEq(token.balanceOf(creator), SUPPLY + airdropSupply);

        uint256 amountOrb = 100e18;
        uint256 amountDevice = 50e18;
        uint256 maxClaims = 1000;
        uint256 expiry = block.timestamp + 30 days;

        // Creator creates airdrop
        vm.prank(creator);
        uint256 airdropId = humanDrop.createAirdrop(
            address(token), amountOrb, amountDevice, maxClaims, expiry
        );

        // Fund the airdrop contract
        vm.prank(creator);
        token.transfer(address(humanDrop), airdropSupply);
        assertEq(token.balanceOf(address(humanDrop)), airdropSupply);

        // Check eligibility before claims
        uint256 nullOrb = 11111;
        uint256 nullDevice = 22222;
        assertTrue(humanDrop.isEligible(airdropId, nullOrb));
        assertTrue(humanDrop.isEligible(airdropId, nullDevice));

        // Operator claims for Orb user
        vm.prank(operator);
        humanDrop.claim(airdropId, nullOrb, user1, 2);
        assertEq(token.balanceOf(user1), amountOrb);

        // Operator claims for Device user
        vm.prank(operator);
        humanDrop.claim(airdropId, nullDevice, user2, 1);
        assertEq(token.balanceOf(user2), amountDevice);

        // Eligibility now false for claimed nullifiers
        assertFalse(humanDrop.isEligible(airdropId, nullOrb));
        assertFalse(humanDrop.isEligible(airdropId, nullDevice));

        // Double-claim reverts
        vm.expectRevert(HumanDrop.AlreadyClaimed.selector);
        vm.prank(operator);
        humanDrop.claim(airdropId, nullOrb, user1, 2);

        // Verify totalClaimed
        HumanDrop.Airdrop memory a = humanDrop.getAirdrop(airdropId);
        assertEq(a.totalClaimed, 2);

        // Warp past expiry
        vm.warp(expiry + 1);

        // New claim reverts (expired)
        vm.expectRevert(HumanDrop.AirdropExpired.selector);
        vm.prank(operator);
        humanDrop.claim(airdropId, 33333, user3, 2);

        // Creator reclaims remaining tokens
        uint256 remaining = token.balanceOf(address(humanDrop));
        assertEq(remaining, airdropSupply - amountOrb - amountDevice);

        vm.prank(creator);
        humanDrop.withdraw(airdropId);

        assertEq(token.balanceOf(address(humanDrop)), 0);
        assertEq(token.balanceOf(creator), SUPPLY + remaining);
    }

    // ================================================================
    // Test 4: Token -> StakingVault -> Rewards -> Unstake
    // ================================================================
    function test_tokenDeploy_staking_rewards_unstake() public {
        MannaToken token = _deployToken(true);

        uint256 stakeAmount = 10_000e18;
        uint256 rewardPool = 50_000e18;
        uint256 rewardRateBps = 1250; // 12.5% APY

        // Mint tokens for staker and reward pool
        vm.startPrank(creator);
        token.mint(creator, rewardPool);
        token.transfer(user1, stakeAmount);
        vm.stopPrank();

        // Deploy StakingVault (needs separate instance per token)
        StakingVault staking = new StakingVault(address(token), rewardRateBps);

        // Fund reward pool
        vm.prank(creator);
        token.transfer(address(staking), rewardPool);
        assertEq(token.balanceOf(address(staking)), rewardPool);

        // User stakes with 30-day lock
        uint256 lockDays = 30;
        vm.startPrank(user1);
        token.approve(address(staking), stakeAmount);
        uint256 posId = staking.stake(stakeAmount, lockDays);
        vm.stopPrank();

        assertEq(token.balanceOf(user1), 0);
        assertEq(token.balanceOf(address(staking)), rewardPool + stakeAmount);

        // Warp 15 days — claim partial rewards
        vm.warp(block.timestamp + 15 days);
        uint256 pending15 = staking.pendingRewards(posId);
        // Expected: 10000e18 * 1250 * 15days / (10000 * 365days) ~= 51.37e18
        assertGt(pending15, 0);

        vm.prank(user1);
        staking.claimRewards(posId);
        assertEq(token.balanceOf(user1), pending15);

        // Cannot unstake yet (lock not expired)
        vm.expectRevert(StakingVault.LockNotExpired.selector);
        vm.prank(user1);
        staking.unstake(posId);

        // Warp past lock (30 days total from stake)
        vm.warp(block.timestamp + 16 days); // now at day 31

        uint256 pendingRemaining = staking.pendingRewards(posId);
        assertGt(pendingRemaining, 0);

        uint256 user1BalBefore = token.balanceOf(user1);
        vm.prank(user1);
        staking.unstake(posId);

        // Got principal + remaining rewards
        uint256 received = token.balanceOf(user1) - user1BalBefore;
        assertEq(received, stakeAmount + pendingRemaining);

        // Position inactive
        StakingVault.Position memory pos = staking.getPosition(posId);
        assertFalse(pos.active);
    }

    // ================================================================
    // Test 5: Token -> VestingVault -> Cliff -> Partial Claim -> Full
    // ================================================================
    function test_tokenDeploy_vesting_cliff_partialClaim() public {
        MannaToken token = _deployToken(false);

        uint256 vestAmount = 120_000e18;
        uint256 cliffDays = 30;
        uint256 durationDays = 120;

        // Creator creates vesting for user1
        vm.startPrank(creator);
        token.approve(address(vestingVault), vestAmount);
        uint256 schedId = vestingVault.create(
            address(token), user1, vestAmount, cliffDays, durationDays, true
        );
        vm.stopPrank();

        // Tokens locked in vault
        assertEq(token.balanceOf(address(vestingVault)), vestAmount);
        assertEq(token.balanceOf(creator), SUPPLY - vestAmount);

        // Before cliff — claim reverts
        vm.warp(block.timestamp + 20 days);
        vm.expectRevert(VestingVault.BeforeCliff.selector);
        vm.prank(user1);
        vestingVault.claim(schedId);

        // At day 60 (half of duration) — ~50% vested
        vm.warp(block.timestamp + 40 days); // now 60 days from start
        uint256 vested60 = vestingVault.vestedAmount(schedId);
        // 60/120 * 120000 = 60000
        assertEq(vested60, 60_000e18);

        vm.prank(user1);
        vestingVault.claim(schedId);
        assertEq(token.balanceOf(user1), 60_000e18);

        // At day 120 (full duration) — claim remaining
        vm.warp(block.timestamp + 60 days); // now 120 days from start
        uint256 vestedFull = vestingVault.vestedAmount(schedId);
        assertEq(vestedFull, vestAmount);

        vm.prank(user1);
        vestingVault.claim(schedId);
        assertEq(token.balanceOf(user1), vestAmount);

        // Vault empty for this schedule
        assertEq(token.balanceOf(address(vestingVault)), 0);
    }

    // ================================================================
    // Test 6: FairLaunch success -> Airdrop remaining supply
    // ================================================================
    function test_fairLaunch_success_then_airdrop_remaining() public {
        MannaToken token = _deployToken(true);

        uint256 launchTokens = 500_000e18;

        // Creator runs fair launch with half the supply
        vm.startPrank(creator);
        token.approve(address(fairLaunch), launchTokens);
        uint256 launchId = fairLaunch.createLaunch(
            address(token), launchTokens, 0, SOFT_CAP,
            DURATION, MAX_PER_WALLET, START_PRICE, END_PRICE
        );
        vm.stopPrank();

        // Contributors buy
        vm.prank(user1);
        fairLaunch.contribute{value: 6 ether}(launchId);
        vm.prank(user2);
        fairLaunch.contribute{value: 5 ether}(launchId);

        // Finalize (success)
        vm.warp(block.timestamp + DURATION + 1);
        vm.prank(operator);
        fairLaunch.finalize(launchId);

        FairLaunch.Launch memory l = fairLaunch.getLaunch(launchId);
        assertTrue(l.success);

        // Contributors claim
        vm.prank(user1);
        fairLaunch.claim(launchId);
        vm.prank(user2);
        fairLaunch.claim(launchId);

        // Creator mints additional tokens for airdrop
        uint256 airdropMint = 200_000e18;
        vm.prank(creator);
        token.mint(creator, airdropMint);

        // Create airdrop
        uint256 amountOrb = 500e18;
        uint256 amountDevice = 250e18;
        vm.prank(creator);
        uint256 airdropId = humanDrop.createAirdrop(
            address(token), amountOrb, amountDevice, 100, block.timestamp + 30 days
        );

        // Fund airdrop
        vm.prank(creator);
        token.transfer(address(humanDrop), airdropMint);

        // Multiple users claim airdrop
        vm.prank(operator);
        humanDrop.claim(airdropId, 1001, user1, 2); // Orb
        vm.prank(operator);
        humanDrop.claim(airdropId, 1002, user2, 1); // Device
        vm.prank(operator);
        humanDrop.claim(airdropId, 1003, user3, 2); // Orb

        // Verify full lifecycle balances
        // user1 got launch tokens + airdrop Orb
        assertGt(token.balanceOf(user1), amountOrb);
        // user2 got launch tokens + airdrop Device
        assertGt(token.balanceOf(user2), amountDevice);
        // user3 got only airdrop Orb
        assertEq(token.balanceOf(user3), amountOrb);

        HumanDrop.Airdrop memory a = humanDrop.getAirdrop(airdropId);
        assertEq(a.totalClaimed, 3);
    }

    // ================================================================
    // Test 7: Full Protocol Lifecycle
    // ================================================================
    function test_fullProtocol_lifecycle() public {
        // Step 1: Deploy token
        MannaToken token = _deployToken(true);

        // Step 2: Register humans via WorldIDVerifier
        uint256 nullUser1 = 100001;
        uint256 nullUser2 = 100002;
        uint256 nullUser3 = 100003;

        vm.startPrank(operator);
        verifier.registerHuman(nullUser1, 2); // Orb
        verifier.registerHuman(nullUser2, 1); // Device
        verifier.registerHuman(nullUser3, 2); // Orb
        vm.stopPrank();

        assertTrue(verifier.isVerifiedHuman(nullUser1));
        assertTrue(verifier.isVerifiedHuman(nullUser2));
        assertTrue(verifier.isVerifiedHuman(nullUser3));

        // Step 3: Fair launch with 40% of supply
        uint256 launchTokens = 400_000e18;
        vm.startPrank(creator);
        token.approve(address(fairLaunch), launchTokens);
        uint256 launchId = fairLaunch.createLaunch(
            address(token), launchTokens, 0, SOFT_CAP,
            DURATION, MAX_PER_WALLET, START_PRICE, END_PRICE
        );
        vm.stopPrank();

        vm.prank(user1);
        fairLaunch.contribute{value: 6 ether}(launchId);
        vm.prank(user2);
        fairLaunch.contribute{value: 5 ether}(launchId);

        vm.warp(block.timestamp + DURATION + 1);
        vm.prank(operator);
        fairLaunch.finalize(launchId);

        vm.prank(user1);
        fairLaunch.claim(launchId);
        vm.prank(user2);
        fairLaunch.claim(launchId);

        // Step 4: Airdrop with 10% of supply
        uint256 airdropAmount = 100_000e18;
        vm.prank(creator);
        uint256 airdropId = humanDrop.createAirdrop(
            address(token), 200e18, 100e18, 500, block.timestamp + 30 days
        );
        vm.prank(creator);
        token.transfer(address(humanDrop), airdropAmount);

        // Claims (Orb + Device)
        vm.prank(operator);
        humanDrop.claim(airdropId, nullUser1, user1, 2);
        vm.prank(operator);
        humanDrop.claim(airdropId, nullUser2, user2, 1);

        assertEq(humanDrop.hasClaimed(airdropId, nullUser1), true);
        assertEq(humanDrop.hasClaimed(airdropId, nullUser2), true);

        // Step 5: Vesting for team (user3)
        uint256 vestAmount = 50_000e18;
        vm.startPrank(creator);
        token.approve(address(vestingVault), vestAmount);
        uint256 vestId = vestingVault.create(
            address(token), user3, vestAmount, 30, 365, true
        );
        vm.stopPrank();

        // Step 6: Batch payout to advisors (user4)
        address[] memory advisors = new address[](1);
        advisors[0] = user4;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 10_000e18;

        vm.startPrank(creator);
        token.approve(address(batchPayout), 10_000e18);
        batchPayout.distribute(address(token), advisors, amounts);
        vm.stopPrank();

        assertEq(token.balanceOf(user4), 10_000e18);

        // Step 7: Update MannaIndex stats
        vm.prank(operator);
        mannaIndex.updateStats(
            humanDrop.nextAirdropId(),
            fairLaunch.nextLaunchId(),
            3, // 3 verified humans
            11 ether // total volume
        );

        MannaIndex.ProtocolStats memory s = mannaIndex.getStats();
        assertEq(s.totalAirdrops, 1);
        assertEq(s.totalLaunches, 1);
        assertEq(s.totalUsers, 3);
        assertGt(s.lastUpdate, 0);

        // Verify: vesting schedule exists
        VestingVault.Schedule memory sch = vestingVault.getSchedule(vestId);
        assertEq(sch.recipient, user3);
        assertEq(sch.totalAmount, vestAmount);

        // Verify: all tokens accounted for
        uint256 totalInCirculation = token.balanceOf(user1) + token.balanceOf(user2)
            + token.balanceOf(user3) + token.balanceOf(user4) + token.balanceOf(creator)
            + token.balanceOf(address(fairLaunch)) + token.balanceOf(address(humanDrop))
            + token.balanceOf(address(vestingVault)) + token.balanceOf(address(batchPayout));
        assertEq(totalInCirculation, token.totalSupply());
    }

    // ================================================================
    // Test 8: CRE Operator Simulation
    // ================================================================
    function test_creOperator_simulation() public {
        MannaToken token = _deployToken(true);

        // --- Simulate airdrop-claim workflow (main.ts) ---
        uint256 airdropSupply = 100_000e18;
        vm.prank(creator);
        uint256 airdropId = humanDrop.createAirdrop(
            address(token), 100e18, 50e18, 1000, block.timestamp + 30 days
        );
        vm.prank(creator);
        token.transfer(address(humanDrop), airdropSupply);

        // CRE step 1: check hasClaimed (read)
        uint256 nullifier = 77777;
        assertFalse(humanDrop.hasClaimed(airdropId, nullifier));

        // CRE step 2: claim (write)
        vm.prank(operator);
        humanDrop.claim(airdropId, nullifier, user1, 2);

        // CRE step 3: registerHuman (write)
        vm.prank(operator);
        verifier.registerHuman(nullifier, 2);

        // Verify both writes
        assertTrue(humanDrop.hasClaimed(airdropId, nullifier));
        assertTrue(verifier.isVerifiedHuman(nullifier));
        assertEq(token.balanceOf(user1), 100e18);

        // --- Simulate fair-launch-finalize workflow ---
        uint256 launchTokens = 200_000e18;
        vm.startPrank(creator);
        token.approve(address(fairLaunch), launchTokens);
        uint256 launchId = fairLaunch.createLaunch(
            address(token), launchTokens, 0, 5 ether,
            DURATION, MAX_PER_WALLET, START_PRICE, END_PRICE
        );
        vm.stopPrank();

        vm.prank(user2);
        fairLaunch.contribute{value: 6 ether}(launchId);

        // CRE cron: read getLaunch, check if ended
        FairLaunch.Launch memory l = fairLaunch.getLaunch(launchId);
        assertFalse(l.finalized);
        // Not ended yet — CRE would skip
        assertGt(l.endTime, block.timestamp);

        // Time passes
        vm.warp(block.timestamp + DURATION + 1);

        // CRE cron fires again: now ended
        l = fairLaunch.getLaunch(launchId);
        assertLe(l.endTime, block.timestamp);
        assertFalse(l.finalized);

        // CRE finalizes
        vm.prank(operator);
        fairLaunch.finalize(launchId);
        l = fairLaunch.getLaunch(launchId);
        assertTrue(l.finalized);
        assertTrue(l.success);

        // --- Simulate airdrop-reclaim workflow ---
        // CRE cron: read getAirdrop, check expiry
        HumanDrop.Airdrop memory a = humanDrop.getAirdrop(airdropId);
        // Not expired yet
        assertGt(a.expiry, block.timestamp);

        // Warp past expiry
        vm.warp(a.expiry + 1);

        // CRE: airdrop expired, call withdraw
        a = humanDrop.getAirdrop(airdropId);
        assertLt(a.expiry, block.timestamp);

        uint256 remainingBefore = token.balanceOf(address(humanDrop));
        assertGt(remainingBefore, 0);

        // CRE operator calls withdraw (now allowed after fix)
        vm.prank(operator);
        humanDrop.withdraw(airdropId);
        assertEq(token.balanceOf(address(humanDrop)), 0);

        // --- Simulate stats-sync workflow ---
        uint256 totalAirdrops = humanDrop.nextAirdropId();
        uint256 totalLaunches = fairLaunch.nextLaunchId();

        vm.prank(operator);
        mannaIndex.updateStats(totalAirdrops, totalLaunches, 1, 6 ether);

        MannaIndex.ProtocolStats memory stats = mannaIndex.getStats();
        assertEq(stats.totalAirdrops, totalAirdrops);
        assertEq(stats.totalLaunches, totalLaunches);

        vm.prank(operator);
        mannaIndex.updateChainStats("arbitrum-sepolia", totalAirdrops, totalLaunches, 1, 6 ether);

        MannaIndex.ChainStats memory cs = mannaIndex.getChainStats("arbitrum-sepolia");
        assertEq(cs.airdrops, totalAirdrops);
        assertEq(cs.launches, totalLaunches);
    }

    // Required for receiving ETH from FairLaunch finalize
    receive() external payable {}
}
