// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.28;

interface IProxy {
    event AdminUpdated(address indexed prev, address indexed _new);
    event ImplementationUpdated(address indexed prev, address indexed _new);

    function PROXY_setAdmin(address _admin) external;
    function PROXY_getAdmin() external view returns (address);
    function PROXY_setImplementation(address _impl) external;
    function PROXY_getImplementation() external view returns (address);
}
