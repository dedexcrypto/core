// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

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
        int256 _num,
        uint8 _decimals
    ) external pure returns (int256, bool) {
        return FixedPointNumber.wrap(_num, _decimals);
    }

    function wrap_GasTracker(
        int256 _num,
        uint8 _decimals
    ) external returns (int256, bool) {
        uint256 initialGas = gasleft();
        (int256 v1, bool v2) = FixedPointNumber.wrap(_num, _decimals);
        emit GasTracker(initialGas - gasleft());
        return (v1, v2);
    }

    function int256ToUint256(
        int256 _num
    ) external pure returns (uint256, bool) {
        return FixedPointNumber.int256ToUint256(_num);
    }

    function int256ToUint256_GasTracker(
        int256 _num
    ) external returns (uint256, bool) {
        uint256 initialGas = gasleft();
        (uint256 v1, bool v2) = FixedPointNumber.int256ToUint256(_num);
        emit GasTracker(initialGas - gasleft());
        return (v1, v2);
    }

    function uint256ToInt256(
        uint256 _num,
        bool _isNegative
    ) external pure returns (int256) {
        return FixedPointNumber.uint256ToInt256(_num, _isNegative);
    }

    function uint256ToInt256_GasTracker(
        uint256 _num,
        bool _isNegative
    ) external returns (int256) {
        uint256 initialGas = gasleft();
        int256 v1 = FixedPointNumber.uint256ToInt256(_num, _isNegative);
        emit GasTracker(initialGas - gasleft());
        return v1;
    }

    function ln(int256 _fpn) external pure returns (int256) {
        return FixedPointNumber.ln(_fpn);
    }

    function ln_GasTracker(int256 _fpn) external returns (int256) {
        uint256 initialGas = gasleft();
        int256 v = FixedPointNumber.ln(_fpn);
        emit GasTracker(initialGas - gasleft());
        return v;
    }

    function mulDiv(
        int256 _fpnX,
        int256 _fpnY,
        int256 _fpnD,
        bool _roundingUp
    ) external pure returns (int256) {
        return FixedPointNumber.mulDiv(_fpnX, _fpnY, _fpnD, _roundingUp);
    }

    function mulDiv_GasTracker(
        int256 _fpnX,
        int256 _fpnY,
        int256 _fpnD,
        bool _roundingUp
    ) external returns (int256) {
        uint256 initialGas = gasleft();
        int256 v = FixedPointNumber.mulDiv(_fpnX, _fpnY, _fpnD, _roundingUp);
        emit GasTracker(initialGas - gasleft());
        return v;
    }
}
