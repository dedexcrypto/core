// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.20;

import {BaseImplementation} from './Common.sol';

abstract contract ExampleStorageV1 {
    bytes32 internal constant EXAMPLE_STORAGE_V1_LOCATION =
        0xb4b25dd110c70a86ae773fe92b2a89fe5f109459cc2749bbfcc79fbc7878f300;

    /// @custom:storage-location erc7201:$.v1.example
    struct ExampleStorageV1Schema {
        uint256 x;
        uint256 y;
    }

    function getExampleStorageV1()
        internal
        pure
        returns (ExampleStorageV1Schema storage $)
    {
        assembly {
            $.slot := EXAMPLE_STORAGE_V1_LOCATION
        }
    }
}

contract ExampleImplementationV1 is BaseImplementation, ExampleStorageV1 {
    function Initialize() external override(BaseImplementation) onlyAdmin {}
    function Terminate() external override(BaseImplementation) onlyAdmin {}

    function getProd() public view returns (uint256) {
        ExampleStorageV1Schema storage $1 = getExampleStorageV1();
        return $1.x * $1.y;
    }

    function setX(uint256 x) public onlyAdmin {
        ExampleStorageV1Schema storage $1 = getExampleStorageV1();
        $1.x = x;
    }

    function setY(uint256 y) public {
        ExampleStorageV1Schema storage $1 = getExampleStorageV1();
        $1.y = y;
    }
}

abstract contract ExampleStorageV2 {
    bytes32 internal constant EXAMPLE_STORAGE_V2_LOCATION =
        0xb00bed9055cffe116f582fe5ea43c881b8994d6ede795ec4cb58b376c5218000;

    /// @custom:storage-location erc7201:$.v2.example
    struct ExampleStorageV2Schema {
        uint256 z;
    }

    function getExampleStorageV2()
        internal
        pure
        returns (ExampleStorageV2Schema storage $)
    {
        assembly {
            $.slot := EXAMPLE_STORAGE_V2_LOCATION
        }
    }
}

contract ExampleImplementationV2 is
    BaseImplementation,
    ExampleStorageV1,
    ExampleStorageV2
{
    function Initialize() external override(BaseImplementation) onlyAdmin {}
    function Terminate() external override(BaseImplementation) onlyAdmin {}

    function getProd() public view returns (uint256) {
        ExampleStorageV1Schema storage $1 = getExampleStorageV1();
        ExampleStorageV2Schema storage $2 = getExampleStorageV2();
        return $1.x * $1.y * $2.z;
    }

    function getZ() public view returns (uint256) {
        ExampleStorageV2Schema storage $2 = getExampleStorageV2();
        return $2.z;
    }

    function setZ(uint256 z) public onlyAdmin {
        ExampleStorageV2Schema storage $2 = getExampleStorageV2();
        $2.z = z;
    }
}
