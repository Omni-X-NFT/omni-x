// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.0;

interface IOmniReceiver {
    function omniReceive(
        uint16 _srcChainId,              // the remote chainId sending the tokens
        bytes memory _srcAddress,        // the remote Bridge address
        uint256 _nonce,                  
        uint256 amountLD,                // the qty of local _token contract tokens  
        bytes memory payload
    ) external;
}