// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.20;

// https://eips.ethereum.org/EIPS/eip-7201
library ERC7201Utils {
    function getStorageLocation(
        string memory id
    ) public pure returns (bytes32) {
        return
            keccak256(abi.encode(uint256(keccak256(bytes(id))) - 1)) &
            ~bytes32(uint256(0xff));
    }
}

abstract contract SharedStorage {
    bytes32 internal constant SHARED_STORAGE_LOCATION =
        0xc8a58f94635faa377fe7792146ebf0cd1ff926b74cd29aa0571a9bd49bf12300;

    /// @custom:storage-location erc7201:$.shared
    struct SharedStorageSchema {
        address admin;
    }

    function getSharedStorage()
        internal
        pure
        returns (SharedStorageSchema storage $)
    {
        assembly {
            $.slot := SHARED_STORAGE_LOCATION
        }
    }
}

abstract contract SharedImplementation is SharedStorage {
    error AdminOnlyAllowedOperation();

    modifier onlyAdmin() {
        SharedStorageSchema storage $ = getSharedStorage();
        if (msg.sender != $.admin) {
            revert AdminOnlyAllowedOperation();
        }
        _;
    }
}

abstract contract BaseImplementation is SharedImplementation {
    error NotImplemented();

    function Initialize() external virtual onlyAdmin {
        revert NotImplemented();
    }

    function Terminate() external virtual onlyAdmin {
        revert NotImplemented();
    }
}
