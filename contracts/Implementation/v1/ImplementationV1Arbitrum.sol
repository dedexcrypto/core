// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.20;

import './ImplementationV1.sol';

contract ImplementationV1_ArbitrumV1 is ImplementationV1 {
    // https://data.chain.link/feeds/arbitrum/mainnet/eth-usd
    function getParamEth2UsdDataFeedAddress()
        public
        pure
        override(ImplementationV1)
        returns (address)
    {
        return address(0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612);
    }

    // https://data.chain.link/feeds/arbitrum/mainnet/wsteth-steth%20exchangerate
    function getParamStakedEth2EthDataFeedAddress()
        public
        pure
        override(ImplementationV1)
        returns (address)
    {
        return address(0xB1552C5e96B312d0Bf8b554186F846C40614a540);
    }
}
