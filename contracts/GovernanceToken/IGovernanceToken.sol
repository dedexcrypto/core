// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.28;

interface IGovernanceToken {
    error CheckpointFutureLookup(
        uint256 requestedBlockNumber,
        uint256 latestBlockNumber
    );

    function balanceOfAt(
        address _account,
        uint256 _blockNumber
    ) external view returns (uint256);
}
