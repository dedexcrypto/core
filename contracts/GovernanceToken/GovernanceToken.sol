// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.28;

import {IGovernanceToken} from './IGovernanceToken.sol';

import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import {ERC20Permit} from '@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol';
import {SafeCast} from '@openzeppelin/contracts/utils/math/SafeCast.sol';
import {Checkpoints} from '@openzeppelin/contracts/utils/structs/Checkpoints.sol';

contract GovernanceToken is IGovernanceToken, ERC20Permit {
    using Checkpoints for Checkpoints.Trace160;

    mapping(address account => Checkpoints.Trace160) private checkpoints;

    constructor()
        ERC20('DEDEXGovernanceToken', 'DEDEX')
        ERC20Permit('DEDEXGovernanceToken')
    {
        _mint(msg.sender, totalSupply() * 10 ** decimals());
    }

    function decimals() public pure override(ERC20) returns (uint8) {
        return 0;
    }

    function totalSupply() public pure override(ERC20) returns (uint256) {
        return 6_227_020_800; // 13!
    }

    function balanceOfAt(
        address _account,
        uint256 _blockNumber
    ) public view returns (uint256) {
        if (_blockNumber > block.number) {
            revert IGovernanceToken.CheckpointFutureLookup(
                _blockNumber,
                block.number
            );
        }
        return
            checkpoints[_account].upperLookupRecent(
                SafeCast.toUint96(_blockNumber)
            );
    }

    function _update(
        address _from,
        address _to,
        uint256 _value
    ) internal override(ERC20) {
        super._update(_from, _to, _value);

        _makeCheckpoint(_from);
        _makeCheckpoint(_to);
    }

    function _makeCheckpoint(address _account) internal {
        if (_account == address(0)) {
            return;
        }

        uint96 blockNumber = SafeCast.toUint96(block.number);
        uint160 balance = SafeCast.toUint160(balanceOf(_account));

        checkpoints[_account].push(blockNumber, balance);
    }
}
