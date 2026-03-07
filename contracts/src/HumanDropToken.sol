// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title HumanDropToken - Simple ERC20 for testing airdrops
contract HumanDropToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("HumanDrop Token", "HDT") {
        _mint(msg.sender, initialSupply);
    }
}
