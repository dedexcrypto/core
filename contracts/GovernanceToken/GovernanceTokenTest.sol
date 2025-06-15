// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.28;

import {GovernanceToken} from './GovernanceToken.sol';

contract GovernanceTokenTest is GovernanceToken {
    function testBalanceOfAtForTheLatestBlock(
        address _to,
        uint256 _value
    ) public {
        assert(_value != 0);

        address sender = msg.sender;
        uint256 latestBlock = block.number;

        uint256 b0 = balanceOfAt(sender, latestBlock);
        assert(b0 == balanceOf(sender));

        super.transfer(_to, _value);
        uint256 b1 = balanceOfAt(sender, latestBlock);
        assert(b1 == balanceOf(sender));
        assert(b1 == b0 - _value);

        super.transfer(_to, _value);
        uint256 b2 = balanceOfAt(sender, latestBlock);
        assert(b2 == balanceOf(sender));
        assert(b2 == b1 - _value);
    }
}
