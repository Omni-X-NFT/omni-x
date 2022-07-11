// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IONFT1155} from "../token/onft/IONFT1155.sol";
import {TransferManagerLzBase} from "./TransferManagerLzBase.sol";

/**
 * @title TransferManagerONFT1155
 * @notice It allows the transfer of ERC1155 tokens.
 */
contract TransferManagerONFT1155 is TransferManagerLzBase {
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
        uint16 fromChainId
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
            fromChainId
        );

        // 2 times of layerzero fee
        // - Fee1 :TransferManagerONFT721 on Taker Chain to TransferManagerONFT721 on Maker Chain. _crossSendToSrc
        // - Fee2 :call ONFT.sendFrom on maker chain. _onReceiveOnSrcChain
        return (messageFee * 2, lzFee * 2);
    }

    /**
    @dev just transfer the token from maker to taker on maker chain
    */
    function _onReceiveOnSrcChain(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 dstChainId
    ) virtual internal override returns(bool) {
        bytes memory toAddress = abi.encodePacked(to);
        bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, gasForOnftLzReceive);

        (uint256 fee, ) = IONFT1155(collection).estimateSendFee(dstChainId, toAddress, tokenId, amount, false, adapterParams);
        IONFT1155(collection).sendFrom{value: fee}(from, dstChainId, toAddress, tokenId, amount, payable(this), address(0), adapterParams);
        return false;
    }

    /**
    @dev no need this function in this manager
    */
    function _onReceiveOnDstChain(
        address,
        address,
        address,
        uint256,
        uint256,
        uint16
    ) virtual internal override returns(bool) {
        // do nothing
        return false;
    }

    function _normalTransfer(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) virtual internal override {
        IONFT1155(collection).safeTransferFrom(from, to, tokenId, amount, "");
    }
}