// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ReteToken.sol";

/// @title ReteTokenFactory
/// @notice Crea e registra token di comunità. Owner del token è il Coordinatore.
contract ReteTokenFactory {
    event ReteTokenCreated(
        address indexed token,
        address indexed coordinator,
        address indexed adminSpender,
        string name,
        string symbol
    );

    address[] private allTokens;
    mapping(address => address[]) private tokensByCoordinator;

    /// Crea un nuovo ReteToken
    function createReteToken(
        string memory name_,
        string memory symbol_,
        address coordinatorOwner,
        address adminSpender_
    ) external returns (address tokenAddr) {
        ReteToken token = new ReteToken(name_, symbol_, coordinatorOwner, adminSpender_);
        tokenAddr = address(token);
        allTokens.push(tokenAddr);
        tokensByCoordinator[coordinatorOwner].push(tokenAddr);
        emit ReteTokenCreated(tokenAddr, coordinatorOwner, adminSpender_, name_, symbol_);
    }

    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }

    function getCoordinatorTokens(address coordinator) external view returns (address[] memory) {
        return tokensByCoordinator[coordinator];
    }
}
