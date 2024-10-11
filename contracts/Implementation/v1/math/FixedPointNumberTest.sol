// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FixedPointNumber} from './FixedPointNumber.sol';

contract FixedPointNumberTest {
    event GasTracker(uint256 usedGas);

    function DECIMALS() external pure returns (uint8) {
        return FixedPointNumber.DECIMALS;
    }

    function ZERO() external pure returns (int256) {
        return FixedPointNumber.ZERO;
    }

    function ONE() external pure returns (int256) {
        return FixedPointNumber.ONE;
    }

    function MAX() external pure returns (int256) {
        return FixedPointNumber.MAX;
    }

    function MIN() external pure returns (int256) {
        return FixedPointNumber.MIN;
    }

    function wrap(
        int256 num,
        uint8 decimals
    ) external pure returns (int256, bool) {
        return FixedPointNumber.wrap(num, decimals);
    }

    function wrap_GasTracker(
        int256 num,
        uint8 decimals
    ) external returns (int256, bool) {
        uint256 initialGas = gasleft();
        (int256 v1, bool v2) = FixedPointNumber.wrap(num, decimals);
        emit GasTracker(initialGas - gasleft());
        return (v1, v2);
    }

    function int256ToUint256(int256 x) external pure returns (uint256, bool) {
        return FixedPointNumber.int256ToUint256(x);
    }

    function int256ToUint256_GasTracker(
        int256 x
    ) external returns (uint256, bool) {
        uint256 initialGas = gasleft();
        (uint256 v1, bool v2) = FixedPointNumber.int256ToUint256(x);
        emit GasTracker(initialGas - gasleft());
        return (v1, v2);
    }

    function uint256ToInt256(
        uint256 x,
        bool isNegative
    ) external pure returns (int256) {
        return FixedPointNumber.uint256ToInt256(x, isNegative);
    }

    function uint256ToInt256_GasTracker(
        uint256 x,
        bool isNegative
    ) external returns (int256) {
        uint256 initialGas = gasleft();
        int256 v1 = FixedPointNumber.uint256ToInt256(x, isNegative);
        emit GasTracker(initialGas - gasleft());
        return v1;
    }

    function ln(int256 fpn_x) external pure returns (int256) {
        return FixedPointNumber.ln(fpn_x);
    }

    function ln_GasTracker(int256 fpn_x) external returns (int256) {
        uint256 initialGas = gasleft();
        int256 v1 = FixedPointNumber.ln(fpn_x);
        emit GasTracker(initialGas - gasleft());
        return v1;
    }

    function mulDiv(
        int256 fpn_x,
        int256 fpn_y,
        int256 fpn_d,
        bool roundingUp
    ) external pure returns (int256) {
        return FixedPointNumber.mulDiv(fpn_x, fpn_y, fpn_d, roundingUp);
    }

    function mulDiv_GasTracker(
        int256 fpn_x,
        int256 fpn_y,
        int256 fpn_d,
        bool roundingUp
    ) external returns (int256) {
        uint256 initialGas = gasleft();
        int256 v1 = FixedPointNumber.mulDiv(fpn_x, fpn_y, fpn_d, roundingUp);
        emit GasTracker(initialGas - gasleft());
        return v1;
    }
}
