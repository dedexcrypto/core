// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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
        int256 num,
        uint8 decimals
    ) internal pure returns (int256, bool) {
        if (decimals > 18) {
            if (decimals >= 95) {
                return (0, true);
            } else {
                assembly ('memory-safe') {
                    let p := exp(10, sub(decimals, 18))
                    num := sdiv(num, p)
                    decimals := 18
                }
            }
        }

        int256 _num;
        bool ok;

        assembly ('memory-safe') {
            let p := exp(10, sub(18, decimals))
            _num := mul(num, p)
            ok := or(eq(num, 0), eq(sdiv(_num, num), p))
        }

        return (_num, ok);
    }

    function int256ToUint256(int256 x) internal pure returns (uint256, bool) {
        bool isNegative; // x < 0 ? true : false
        assembly ('memory-safe') {
            isNegative := slt(x, 0)
        }
        return (SignedMath.abs(x), isNegative);
    }

    function uint256ToInt256(
        uint256 x,
        bool isNegative
    ) internal pure returns (int256 result) {
        assembly ('memory-safe') {
            let outOfBounds := or(
                and(iszero(isNegative), gt(x, ABS_INT256_MAX)), // Overflow
                and(isNegative, gt(x, ABS_INT256_MIN)) // Underflow
            )
            if outOfBounds {
                revert(0, 0)
            }

            result := x
            if isNegative {
                result := sub(0, result) // result = -result
            }
        }
    }

    function ln(int256 fpn_x) internal pure returns (int256) {
        return LogExpMath.ln(fpn_x);
    }

    function mulDiv(
        int256 fpn_x,
        int256 fpn_y,
        int256 fpn_d,
        bool roundingUp
    ) internal pure returns (int256) {
        (uint256 xAbs, bool xNeg) = int256ToUint256(fpn_x);
        (uint256 yAbs, bool yNeg) = int256ToUint256(fpn_y);
        (uint256 dAbs, bool dNeg) = int256ToUint256(fpn_d);

        uint256 resultAbs;
        if (roundingUp) {
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
