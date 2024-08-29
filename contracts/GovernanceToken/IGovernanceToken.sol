// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;

interface IGovernanceToken {
    function balanceOfAt(
        address _account,
        uint256 _blockNumber
    ) external view returns (uint256);
}
