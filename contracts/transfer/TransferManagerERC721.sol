// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {TransferManagerLzBase} from "./TransferManagerLzBase.sol";

/**
 * @title TransferManagerERC721
 * @notice It allows the transfer of ERC721 tokens.
 */
contract TransferManagerERC721 is TransferManagerLzBase {
    constructor() {}

    function _normalTransfer(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 
    ) virtual internal override {
        IERC721(collection).safeTransferFrom(from, to, tokenId);
    }
}