// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.18;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';

interface IDAOToken is IERC20, IERC20Metadata {}
