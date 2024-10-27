// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;

interface IImplementationV1 {
    error IncorrectPriceOracleRate(int256 value, uint8 decimals);

    function getParamEth2UsdDataFeedAddress() external view returns (address);
    function getParamStakedEth2EthDataFeedAddress()
        external
        view
        returns (address);

    function getEth2UsdRate() external view returns (int256);
    function getStakedEth2EthRate() external view returns (int256);
}
