// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HumanDrop} from "../src/HumanDrop.sol";
import {WorldIDVerifier} from "../src/WorldIDVerifier.sol";
import {HumanDropToken} from "../src/HumanDropToken.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address creOperator = vm.envAddress("CRE_OPERATOR");

        vm.startBroadcast(deployerKey);

        // 1. Deploy token
        HumanDropToken token = new HumanDropToken(1_000_000e18);
        console.log("HumanDropToken:", address(token));

        // 2. Deploy WorldIDVerifier
        WorldIDVerifier verifier = new WorldIDVerifier();
        verifier.setOperator(creOperator, true);
        console.log("WorldIDVerifier:", address(verifier));

        // 3. Deploy HumanDrop
        HumanDrop drop = new HumanDrop();
        drop.setOperator(creOperator, true);
        console.log("HumanDrop:", address(drop));

        // 4. Create initial airdrop (30-day expiry)
        uint256 airdropId = drop.createAirdrop(
            address(token),
            100e18,  // Orb amount
            50e18,   // Device amount
            1000,    // Max claims
            block.timestamp + 30 days
        );
        console.log("Airdrop ID:", airdropId);

        // 5. Fund HumanDrop with tokens
        token.transfer(address(drop), 500_000e18);
        console.log("Funded HumanDrop with 500k tokens");

        vm.stopBroadcast();
    }
}
