// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @dev Interface of the ONFT standard
 */
interface IGhosts is IERC721 {
    function mint(uint8 numTokens) external payable;
    function traverseChains(uint16 _chainId, uint tokenId) external payable;
}
