// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.18;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import './interfaces/IDAOToken.sol';

contract DAOToken is ERC20, IDAOToken {
    constructor(uint256 initialSupply) ERC20('DEDEX DAO Token', 'DEDEX') {
        _mint(msg.sender, initialSupply);
    }
}
