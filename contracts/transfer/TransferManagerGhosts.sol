// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IGhosts} from "../token/onft/IGhosts.sol";
import {TransferManagerLzBase} from "./TransferManagerLzBase.sol";
import "hardhat/console.sol";

/**
 * @title TransferManagerGhosts
 * @notice It allows the transfer of GhostlyGhosts tokens.
 */
contract TransferManagerGhosts is TransferManagerLzBase, IERC721Receiver {
    constructor(address _lzEndpoint) 
        TransferManagerLzBase(_lzEndpoint) {
    }

    function onERC721Received(address, address, uint256, bytes calldata) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    /**
     * @notice Estimate gas fees for cross transfering nft.
     * @param collectionFrom address of the collection on from chain
     * @param collectionTo address of the collection on current chain
     * @param from address of the sender
     * @param to address of the recipient
     * @param tokenId tokenId
     * @dev For ERC721, amount is not used
     */
     function estimateSendFee(
        address collectionFrom,
        address collectionTo,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 fromChainId,
        uint16 toChainId
    )
        public view override
        returns (uint, uint)
    {
        if (fromChainId == toChainId) {
            return (0, 0);
        }
        else {
            (uint256 fee,,) = _getCrossFeeAndPayload(collectionFrom, collectionTo, from, to, tokenId, amount, toChainId);

            return (fee * 2, 0);
        }
    }

    /**
    @dev just transfer the token from maker on maker chain to this on taker chain
    */
    function _onReceiveOnSrcChain(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 dstChainId
    ) virtual internal override returns(bool) {
        // transfer nft from fromAddr to this
        IGhosts(collection).safeTransferFrom(from, address(this), tokenId);

        (uint256 fee,, ) = _getCrossFeeAndPayload(collection, collection, from, to, tokenId, amount, dstChainId);

        // transfer nft from current chain to srcchain
        IGhosts(collection).traverseChains{value: fee}(dstChainId, tokenId);

        return true;
    }

    /**
    @dev transfer this to taker on taker chain
    */
    function _onReceiveOnDstChain(
        address collection,
        address,
        address to,
        uint256 tokenId,
        uint256,
        uint16
    ) virtual internal override returns(bool) {
        // transfer nft from this to toAddr on dst chain
        IGhosts(collection).safeTransferFrom(address(this), to, tokenId);
        return true;
    }

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