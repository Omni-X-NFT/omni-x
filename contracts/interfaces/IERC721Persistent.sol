// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

/**
 * @dev Interface of the ERC721 Persistent with URI
 */
interface IERC721Persistent {
    function safeMint(address to, uint256 tokenId, string memory uri) external;

    function burn(uint tokenId) external;
}