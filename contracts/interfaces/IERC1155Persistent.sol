// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

/**
 * @dev Interface of the ERC721 Persistent with URI
 */
interface IERC1155Persistent {
    function mint(address account, uint256 id, uint256 amount) external;

    function burn(uint256 id, uint256 value) external;
}