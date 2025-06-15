// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.28;

import {Proxy} from './Proxy.sol';

contract ProxyTest is Proxy {
    function getSharedStorageLocation() external pure returns (bytes32) {
        return SHARED_STORAGE_LOCATION;
    }

    function getProxyStorageLocation() external pure returns (bytes32) {
        return PROXY_STORAGE_LOCATION;
    }
}
