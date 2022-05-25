// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @dev Interface of the ONFT Core standard
 */
interface IOmniNFT {
    function mint(address toAddress, uint tokenId) external;

    function mintWithURI(address toAddress, uint tokenId, string memory tokenURI) external;
}