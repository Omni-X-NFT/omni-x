// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @dev Interface of the ONFT Core standard
 */
interface IOmniNFT {
    function collectionId() external returns(bytes32);

    function moveTo(uint16 _dstChainId, bytes calldata _destinationBridge, uint _tokenId) external payable;
}