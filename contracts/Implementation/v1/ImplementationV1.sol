// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.20;

import {IImplementationV1} from './IImplementationV1.sol';
import {BaseImplementation} from '../Common.sol';

abstract contract StorageV1 {
    bytes32 internal constant STORAGE_V1_LOCATION =
        0xc31d4d4edf48e57146b32db1aaf5c8b77fc1a4a74c5d47c0f7744acc0af90f00;

    /// @custom:storage-location erc7201:$.v1
    struct StorageV1Schema {
        uint256 _placeholder_;
    }

    function getStorageV1() internal pure returns (StorageV1Schema storage $) {
        assembly {
            $.slot := STORAGE_V1_LOCATION
        }
    }
}

abstract contract ImplementationV1 is
    BaseImplementation,
    IImplementationV1,
    StorageV1
{
    function Initialize() external override(BaseImplementation) onlyAdmin {}
    function Terminate() external override(BaseImplementation) onlyAdmin {}
}
