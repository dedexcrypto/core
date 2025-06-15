// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FullMath} from './FullMath.sol';
import {LogExpMath} from './LogExpMath.sol';
import {SignedMath} from '@openzeppelin/contracts/utils/math/SignedMath.sol';

library FixedPointNumber {
    uint8 internal constant DECIMALS = 18;

    int256 internal constant ZERO = 0;
    int256 internal constant ONE = int256(10 ** DECIMALS);
    int256 internal constant MAX = type(int256).max;
    int256 internal constant MIN = type(int256).min;

    uint256 private constant ABS_INT256_MIN =
        0x8000000000000000000000000000000000000000000000000000000000000000;
    uint256 private constant ABS_INT256_MAX =
        0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

    function wrap(
        int256 _num,
        uint8 _decimals
    ) internal pure returns (int256, bool) {
        if (_decimals > 18) {
            if (_decimals >= 95) {
                return (0, true);
            } else {
                assembly ('memory-safe') {
                    let p := exp(10, sub(_decimals, 18))
                    _num := sdiv(_num, p)
                    _decimals := 18
                }
            }
        }

        int256 result;
        bool ok;

        assembly ('memory-safe') {
            let p := exp(10, sub(18, _decimals))
            result := mul(_num, p)
            ok := or(eq(_num, 0), eq(sdiv(result, _num), p))
        }

        return (result, ok);
    }

    function int256ToUint256(
        int256 _num
    ) internal pure returns (uint256, bool) {
        bool isNegative; // x < 0 ? true : false
        assembly ('memory-safe') {
            isNegative := slt(_num, 0)
        }
        return (SignedMath.abs(_num), isNegative);
    }

    function uint256ToInt256(
        uint256 _num,
        bool _isNegative
    ) internal pure returns (int256 result) {
        assembly ('memory-safe') {
            let outOfBounds := or(
                and(iszero(_isNegative), gt(_num, ABS_INT256_MAX)), // Overflow
                and(_isNegative, gt(_num, ABS_INT256_MIN)) // Underflow
            )
            if outOfBounds {
                revert(0, 0)
            }

            result := _num
            if _isNegative {
                result := sub(0, result) // result = -result
            }
        }
    }

    function ln(int256 _fpn) internal pure returns (int256) {
        return LogExpMath.ln(_fpn);
    }

    function mulDiv(
        int256 _fpnX,
        int256 _fpnY,
        int256 _fpnD,
        bool _roundingUp
    ) internal pure returns (int256) {
        (uint256 xAbs, bool xNeg) = int256ToUint256(_fpnX);
        (uint256 yAbs, bool yNeg) = int256ToUint256(_fpnY);
        (uint256 dAbs, bool dNeg) = int256ToUint256(_fpnD);

        uint256 resultAbs;
        if (_roundingUp) {
            resultAbs = FullMath.mulDivRoundingUp(xAbs, yAbs, dAbs);
        } else {
            resultAbs = FullMath.mulDiv(xAbs, yAbs, dAbs);
        }

        bool resultNeg;
        assembly ('memory-safe') {
            resultNeg := mod(add(add(xNeg, yNeg), dNeg), 2)
        }

        return uint256ToInt256(resultAbs, resultNeg);
    }
}
