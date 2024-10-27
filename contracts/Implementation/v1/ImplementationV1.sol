// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.20;

import {IImplementationV1} from './IImplementationV1.sol';
import {BaseImplementation} from '../Common.sol';
import {FixedPointNumber} from './math/FixedPointNumber.sol';

import {AggregatorV3Interface} from '@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol';

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

    function getParamEth2UsdDataFeedAddress()
        public
        view
        virtual
        returns (address);

    function getParamStakedEth2EthDataFeedAddress()
        public
        view
        virtual
        returns (address);

    function getEth2UsdRate() public view returns (int256) {
        return getPriceOracleRate(getParamEth2UsdDataFeedAddress());
    }

    function getStakedEth2EthRate() public view returns (int256) {
        return getPriceOracleRate(getParamStakedEth2EthDataFeedAddress());
    }

    function getPriceOracleRate(address _addr) internal view returns (int256) {
        AggregatorV3Interface dataFeed = AggregatorV3Interface(_addr);

        (, int256 value, , , ) = dataFeed.latestRoundData();
        uint8 decimals = dataFeed.decimals();

        (int256 result, bool ok) = FixedPointNumber.wrap(value, decimals);
        if (!ok || result <= FixedPointNumber.ZERO) {
            revert IncorrectPriceOracleRate(value, decimals);
        }

        return result;
    }
}
