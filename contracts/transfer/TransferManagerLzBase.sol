// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ITransferManagerNFT} from "../interfaces/ITransferManagerNFT.sol";
import {NonblockingLzApp} from "../lzApp/NonblockingLzApp.sol";
import "hardhat/console.sol";
/**
 * @title TransferManagerGhosts
 * @notice It allows the transfer of GhostlyGhosts tokens.
 */
abstract contract TransferManagerLzBase is ITransferManagerNFT {
    /**
     * @notice Constructor
     */
    constructor() { }

    /**
     * @notice Transfer ERC721 token
     * @param collection address of the collection on from chain
     * @param from address of the sender
     * @param to address of the recipient
     * @param tokenId tokenId
     * @dev For ERC721, amount is not used
     */
    function transferNFT(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) external override {
        _normalTransfer(collection, from, to, tokenId, amount);
    }

    /**
     * @notice normal send from maker to taker.
     * @dev this function is called when maker and taker is on same chain
     */
    function _normalTransfer(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) virtual internal;
}