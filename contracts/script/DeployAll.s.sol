// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HumanDrop} from "../src/HumanDrop.sol";
import {WorldIDVerifier} from "../src/WorldIDVerifier.sol";
import {HumanDropToken} from "../src/HumanDropToken.sol";
import {StakingVault} from "../src/StakingVault.sol";
import {BatchPayout} from "../src/BatchPayout.sol";
import {VestingVault} from "../src/VestingVault.sol";

contract DeployAll is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address creOperator = vm.envAddress("CRE_OPERATOR");

        vm.startBroadcast(deployerKey);

        // 1. Token
        HumanDropToken token = new HumanDropToken(1_000_000e18);
        console.log("HumanDropToken:", address(token));

        // 2. WorldIDVerifier
        WorldIDVerifier verifier = new WorldIDVerifier();
        verifier.setOperator(creOperator, true);
        console.log("WorldIDVerifier:", address(verifier));

        // 3. HumanDrop + initial airdrop
        HumanDrop drop = new HumanDrop();
        drop.setOperator(creOperator, true);
        console.log("HumanDrop:", address(drop));

        drop.createAirdrop(address(token), 100e18, 50e18, 1000, block.timestamp + 30 days);
        token.transfer(address(drop), 300_000e18);
        console.log("Funded HumanDrop: 300k HDT");

        // 4. StakingVault (12.5% APY)
        StakingVault staking = new StakingVault(address(token), 1250);
        console.log("StakingVault:", address(staking));

        // Fund with reward tokens
        token.transfer(address(staking), 200_000e18);
        console.log("Funded StakingVault: 200k HDT");

        // 5. BatchPayout
        BatchPayout payout = new BatchPayout();
        console.log("BatchPayout:", address(payout));

        // 6. VestingVault
        VestingVault vesting = new VestingVault();
        console.log("VestingVault:", address(vesting));

        vm.stopBroadcast();

        // Summary
        console.log("---");
        console.log("Update manna_app/.env.local with:");
        console.log("NEXT_PUBLIC_HDT_ADDRESS=", address(token));
        console.log("NEXT_PUBLIC_HUMANDROP_ADDRESS=", address(drop));
        console.log("NEXT_PUBLIC_WORLD_ID_VERIFIER_ADDRESS=", address(verifier));
        console.log("NEXT_PUBLIC_STAKING_VAULT_ADDRESS=", address(staking));
        console.log("NEXT_PUBLIC_BATCH_PAYOUT_ADDRESS=", address(payout));
        console.log("NEXT_PUBLIC_VESTING_VAULT_ADDRESS=", address(vesting));
    }
}
