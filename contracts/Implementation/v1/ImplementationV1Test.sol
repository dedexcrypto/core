// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.28;

import {ImplementationV1} from './ImplementationV1.sol';

// solhint-disable-next-line no-unused-import
import {MockV3Aggregator} from '@chainlink/contracts/src/v0.8/shared/mocks/MockV3Aggregator.sol';

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

contract ImplementationV1Test is ImplementationV1, TestStorageV1 {
    function setParamEth2UsdDataFeedAddress(address _addr) public {
        TestStorageV1Schema storage $t1 = getTestStorageV1();
        $t1.eth2UsdDataFeedAddress = _addr;
    }

    function setParamStakedEth2EthDataFeedAddress(address _addr) public {
        TestStorageV1Schema storage $t1 = getTestStorageV1();
        $t1.stakedEth2EthDataFeedAddress = _addr;
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
