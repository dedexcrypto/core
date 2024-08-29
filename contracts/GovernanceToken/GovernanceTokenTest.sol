// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.20;

import './GovernanceToken.sol';

contract GovernanceTokenTest is GovernanceToken {
    function testBalanceOfAtForTheLatestBlock(
        address to,
        uint256 value
    ) public {
        assert(value != 0);

        address sender = msg.sender;
        uint256 latestBlock = block.number;

        uint256 b0 = balanceOfAt(sender, latestBlock);
        assert(b0 == balanceOf(sender));

        super.transfer(to, value);
        uint256 b1 = balanceOfAt(sender, latestBlock);
        assert(b1 == balanceOf(sender));
        assert(b1 == b0 - value);

        super.transfer(to, value);
        uint256 b2 = balanceOfAt(sender, latestBlock);
        assert(b2 == balanceOf(sender));
        assert(b2 == b1 - value);
    }
}
