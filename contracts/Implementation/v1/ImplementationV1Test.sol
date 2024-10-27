// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.20;

import './ImplementationV1.sol';

import '@chainlink/contracts/src/v0.8/tests/MockV3Aggregator.sol';

abstract contract TestStorageV1 {
    bytes32 internal constant TEST_STORAGE_V1_LOCATION =
        0xd3a6e808251bc63f37f7525a46bd6bfe9d974e247f40d80f4d7c8e8532e2ac00;

    /// @custom:storage-location erc7201:$.v1.test
    struct TestStorageV1Schema {
        address eth2UsdDataFeedAddress;
        address stakedEth2EthDataFeedAddress;
    }

    function getTestStorageV1()
        internal
        pure
        returns (TestStorageV1Schema storage $)
    {
        assembly {
            $.slot := TEST_STORAGE_V1_LOCATION
        }
    }
}

contract ImplementationV1_Test is ImplementationV1, TestStorageV1 {
    function setParamEth2UsdDataFeedAddress(address v) public {
        TestStorageV1Schema storage $t1 = getTestStorageV1();
        $t1.eth2UsdDataFeedAddress = v;
    }

    function setParamStakedEth2EthDataFeedAddress(address v) public {
        TestStorageV1Schema storage $t1 = getTestStorageV1();
        $t1.stakedEth2EthDataFeedAddress = v;
    }

    function getParamEth2UsdDataFeedAddress()
        public
        view
        override(ImplementationV1)
        returns (address)
    {
        TestStorageV1Schema storage $t1 = getTestStorageV1();
        return $t1.eth2UsdDataFeedAddress;
    }

    function getParamStakedEth2EthDataFeedAddress()
        public
        view
        override(ImplementationV1)
        returns (address)
    {
        TestStorageV1Schema storage $t1 = getTestStorageV1();
        return $t1.stakedEth2EthDataFeedAddress;
    }
}
