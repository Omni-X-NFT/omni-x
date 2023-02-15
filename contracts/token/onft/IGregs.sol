// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @dev Interface of the ONFT standard
 */
interface IGregs is IERC721 {
    function sendNFT(uint16 _chainId, uint tokenId) external payable;
}
