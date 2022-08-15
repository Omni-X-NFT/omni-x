// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IGregs} from "../token/onft/IGregs.sol";
import {TransferManagerLzBase} from "./TransferManagerLzBase.sol";

/**
 * @title TransferManagerGregs
 * @notice It allows the transfer of GhostlyGhosts tokens.
 */
contract TransferManagerGregs is TransferManagerLzBase {
    constructor(address _omniXExchange, address _lzEndpoint) 
        TransferManagerLzBase(_omniXExchange, _lzEndpoint) {
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
        uint16 remoteChainId,
        bool remoteSend
    )
        public view override
        returns (uint, uint)
    {
        (uint256 messageFee, uint256 lzFee) = super.estimateSendFee(
            collectionFrom,
            collectionTo,
            from,
            to,
            tokenId,
            amount,
            remoteChainId,
            remoteSend
        );

        return (messageFee * 2, lzFee * 2);
    }

    /**
    @dev just transfer the token from maker on maker chain to this on taker chain
    */
    function _onReceiveOnSrcChain(
        address collection,
        address from,
        address,
        uint256 tokenId,
        uint256,
        uint16 dstChainId
    ) virtual internal override returns(bool) {
        // transfer nft from fromAddr to this
        IGregs(collection).safeTransferFrom(from, address(this), tokenId);
        // transfer nft from current chain to srcchain
        IGregs(collection).sendNFT(dstChainId, tokenId);

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
        IGregs(collection).safeTransferFrom(address(this), to, tokenId);
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