// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {TransferManagerLzBase} from "./TransferManagerLzBase.sol";

/**
 * @title TransferManagerERC1155
 * @notice It allows the transfer of ERC1155 tokens.
 */
contract TransferManagerERC1155 is TransferManagerLzBase {
    constructor() {}

    function _normalTransfer(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) virtual internal override {
        IERC1155(collection).safeTransferFrom(from, to, tokenId, amount, "");
    }
}