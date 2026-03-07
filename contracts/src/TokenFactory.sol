// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MannaToken} from "./MannaToken.sol";

/// @title TokenFactory - Deploy custom ERC20 tokens via CRE
/// @notice Only CRE operator can deploy after verifying creator on World Chain
contract TokenFactory is Ownable {
    error NotOperator();

    event TokenDeployed(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 initialSupply,
        uint8 decimals
    );

    mapping(address => bool) public operators;
    mapping(address => address[]) public deployedTokens;

    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != owner()) revert NotOperator();
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setOperator(address op, bool status) external onlyOwner {
        operators[op] = status;
    }

    /// @notice Deploy a new ERC20 token. Only CRE operator after World ID verification.
    /// @param name Token name
    /// @param symbol Token symbol
    /// @param initialSupply Initial supply (in base units, not accounting for decimals)
    /// @param decimals_ Token decimals
    /// @param owner Token owner (receives initial supply and can mint if enabled)
    /// @param enableMinting Whether owner can mint additional supply
    /// @return token Address of deployed token
    function deployToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimals_,
        address owner,
        bool enableMinting
    ) external onlyOperator returns (address token) {
        MannaToken newToken = new MannaToken(name, symbol, initialSupply, decimals_, owner, enableMinting);
        token = address(newToken);

        deployedTokens[owner].push(token);

        emit TokenDeployed(token, owner, name, symbol, initialSupply, decimals_);
    }

    /// @notice Get all tokens deployed by a creator
    function getDeployedTokens(address creator) external view returns (address[] memory) {
        return deployedTokens[creator];
    }
}
