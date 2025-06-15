// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.28;

import {ProxyAdminV1} from './ProxyAdminV1.sol';

contract ProxyAdminV1Test is ProxyAdminV1 {
    constructor(
        address _governanceToken,
        address _proxy,
        uint256 _votingPeriod,
        uint256 _executionPeriod,
        address _developer
    )
        ProxyAdminV1(
            _governanceToken,
            _proxy,
            _votingPeriod,
            _executionPeriod,
            _developer
        )
    {}

    function setDeveloper(address _developer) external {
        developer = _developer;
    }
}
