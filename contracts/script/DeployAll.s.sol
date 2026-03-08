// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HumanDrop} from "../src/HumanDrop.sol";
import {WorldIDVerifier} from "../src/WorldIDVerifier.sol";
import {HumanDropToken} from "../src/HumanDropToken.sol";
import {StakingVault} from "../src/StakingVault.sol";
import {BatchPayout} from "../src/BatchPayout.sol";
import {VestingVault} from "../src/VestingVault.sol";
import {FairLaunch} from "../src/FairLaunch.sol";
import {TokenFactory} from "../src/TokenFactory.sol";
import {MannaIndex} from "../src/MannaIndex.sol";

/// @notice Deploys all 9 contracts + setup in a single constructor call (1 tx)
contract BatchDeployer {
    address public token;
    address public verifier;
    address public humanDrop;
    address public stakingVault;
    address public batchPayout;
    address public vestingVault;
    address public fairLaunch;
    address public tokenFactory;
    address public mannaIndex;

    constructor(address creOperator, address finalOwner) {
        // 1. Token — mints to this contract, we transfer later
        HumanDropToken t = new HumanDropToken(1_000_000e18);
        token = address(t);

        // 2. WorldIDVerifier
        WorldIDVerifier v = new WorldIDVerifier();
        v.setOperator(creOperator, true);
        v.transferOwnership(finalOwner);
        verifier = address(v);

        // 3. HumanDrop + initial airdrop
        HumanDrop d = new HumanDrop();
        d.setOperator(creOperator, true);
        d.createAirdrop(address(t), 100e18, 50e18, 1000, block.timestamp + 30 days);
        d.transferOwnership(finalOwner);
        humanDrop = address(d);

        // Fund HumanDrop
        t.transfer(address(d), 300_000e18);

        // 4. StakingVault (12.5% APY)
        StakingVault s = new StakingVault(address(t), 1250);
        s.transferOwnership(finalOwner);
        stakingVault = address(s);

        // Fund StakingVault reward pool
        t.transfer(address(s), 200_000e18);

        // 5. BatchPayout
        BatchPayout bp = new BatchPayout();
        bp.transferOwnership(finalOwner);
        batchPayout = address(bp);

        // 6. VestingVault
        VestingVault vv = new VestingVault();
        vv.transferOwnership(finalOwner);
        vestingVault = address(vv);

        // 7. FairLaunch
        FairLaunch fl = new FairLaunch();
        fl.setOperator(creOperator, true);
        fl.transferOwnership(finalOwner);
        fairLaunch = address(fl);

        // 8. TokenFactory
        TokenFactory tf = new TokenFactory();
        tf.setOperator(creOperator, true);
        tf.transferOwnership(finalOwner);
        tokenFactory = address(tf);

        // 9. MannaIndex
        MannaIndex mi = new MannaIndex();
        mi.setOperator(creOperator, true);
        mi.transferOwnership(finalOwner);
        mannaIndex = address(mi);

        // Send remaining tokens to final owner
        t.transfer(finalOwner, t.balanceOf(address(this)));
    }
}

contract DeployAll is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address creOperator = vm.envAddress("CRE_OPERATOR");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // Single transaction — deploys all 9 contracts
        BatchDeployer bd = new BatchDeployer(creOperator, deployer);

        vm.stopBroadcast();

        // Read addresses from deployer contract
        console.log("=== All contracts deployed in 1 tx ===");
        console.log("HumanDropToken:", bd.token());
        console.log("WorldIDVerifier:", bd.verifier());
        console.log("HumanDrop:", bd.humanDrop());
        console.log("StakingVault:", bd.stakingVault());
        console.log("BatchPayout:", bd.batchPayout());
        console.log("VestingVault:", bd.vestingVault());
        console.log("FairLaunch:", bd.fairLaunch());
        console.log("TokenFactory:", bd.tokenFactory());
        console.log("MannaIndex:", bd.mannaIndex());
        console.log("---");
        console.log("NEXT_PUBLIC_HDT_ADDRESS=", bd.token());
        console.log("NEXT_PUBLIC_HUMANDROP_ADDRESS=", bd.humanDrop());
        console.log("NEXT_PUBLIC_WORLD_ID_VERIFIER_ADDRESS=", bd.verifier());
        console.log("NEXT_PUBLIC_STAKING_VAULT_ADDRESS=", bd.stakingVault());
        console.log("NEXT_PUBLIC_BATCH_PAYOUT_ADDRESS=", bd.batchPayout());
        console.log("NEXT_PUBLIC_VESTING_VAULT_ADDRESS=", bd.vestingVault());
        console.log("NEXT_PUBLIC_FAIR_LAUNCH_ADDRESS=", bd.fairLaunch());
        console.log("NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=", bd.tokenFactory());
        console.log("NEXT_PUBLIC_MANNA_INDEX_ADDRESS=", bd.mannaIndex());
    }
}
