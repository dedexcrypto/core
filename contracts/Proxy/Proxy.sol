// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.28;

import {IProxy} from './IProxy.sol';
import {SharedLogic} from '../Implementation/Common.sol';

abstract contract ProxyStorage {
    bytes32 internal constant PROXY_STORAGE_LOCATION =
        0xd702668357b6c4b5b730416469bda05d725f6ba2f63af917fc7eef58c5eae000;

    /// @custom:storage-location erc7201:$.proxy
    struct ProxyStorageSchema {
        address implementation;
    }

    function getProxyStorage()
        internal
        pure
        returns (ProxyStorageSchema storage $)
    {
        assembly {
            $.slot := PROXY_STORAGE_LOCATION
        }
    }
}

contract Proxy is SharedLogic, IProxy, ProxyStorage {
    constructor() {
        _PROXY_setAdmin(msg.sender);
    }

    fallback() external payable {
        _PROXY_delegate(PROXY_getImplementation());
    }

    receive() external payable {
        _PROXY_delegate(PROXY_getImplementation());
    }

    function PROXY_setAdmin(address _admin) external onlyAdmin {
        _PROXY_setAdmin(_admin);
    }

    function PROXY_getAdmin() external view returns (address) {
        SharedStorageSchema storage $ = getSharedStorage();
        return $.admin;
    }

    function PROXY_setImplementation(address _impl) external onlyAdmin {
        ProxyStorageSchema storage $p = getProxyStorage();

        address prevImpl = $p.implementation;
        $p.implementation = _impl;

        emit ImplementationUpdated(prevImpl, _impl);
    }

    function PROXY_getImplementation() public view returns (address) {
        ProxyStorageSchema storage $p = getProxyStorage();
        return $p.implementation;
    }

    function _PROXY_setAdmin(address _admin) private {
        SharedStorageSchema storage $ = getSharedStorage();

        address prevAdmin = $.admin;
        $.admin = _admin;

        emit AdminUpdated(prevAdmin, _admin);
    }

    function _PROXY_delegate(address _impl) private {
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), _impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
}
