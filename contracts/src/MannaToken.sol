// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MannaToken - Customizable ERC20 token for launchpad
/// @notice Deployed via TokenFactory, owner can optionally mint additional supply
contract MannaToken is ERC20, Ownable {
    uint8 private _decimals;
    bool public mintingEnabled;

    error MintingDisabled();

    event MintingToggled(bool enabled);

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimals_,
        address owner,
        bool enableMinting
    ) ERC20(name, symbol) Ownable(owner) {
        _decimals = decimals_;
        mintingEnabled = enableMinting;
        if (initialSupply > 0) {
            _mint(owner, initialSupply);
        }
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /// @notice Mint additional tokens. Only owner.
    function mint(address to, uint256 amount) external onlyOwner {
        if (!mintingEnabled) revert MintingDisabled();
        _mint(to, amount);
    }

    /// @notice Toggle minting capability. Only owner.
    function setMinting(bool enabled) external onlyOwner {
        mintingEnabled = enabled;
        emit MintingToggled(enabled);
    }
}
