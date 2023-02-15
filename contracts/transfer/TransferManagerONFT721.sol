// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IONFT721} from "../token/onft/IONFT721.sol";
import {TransferManagerLzBase} from "./TransferManagerLzBase.sol";

/**
 * @title TransferManagerONFT721
 * @notice It allows the transfer of ERC721 tokens.
 */
contract TransferManagerONFT721 is TransferManagerLzBase {
    constructor(address _lzEndpoint) 
        TransferManagerLzBase(_lzEndpoint) {
    }

    /**
     * @notice Estimate gas fees for cross transfering nft.
     * @param collectionFrom address of the collection on from chain
     * @param to address of the recipient
     * @param tokenId tokenId
     * @dev For ERC721, amount is not used
     */
    function estimateSendFee(
        address collectionFrom,
        address,
        address,
        address to,
        uint256 tokenId,
        uint256,
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
            bytes memory toAddress = abi.encodePacked(to);
            bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, gasForOnftLzReceive);
            (uint256 fee, ) = IONFT721(collectionFrom).estimateSendFee(toChainId, toAddress, tokenId, false, adapterParams);

            return (fee, 0);
        }
    }

    /**
    @dev just transfer the token from maker to taker on maker chain
    */
    function _onReceiveOnSrcChain(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256,
        uint16 dstChainId
    ) virtual internal override returns(bool) {
        bytes memory toAddress = abi.encodePacked(to);
        bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, gasForOnftLzReceive);

        (uint256 fee, ) = IONFT721(collection).estimateSendFee(dstChainId, toAddress, tokenId, false, adapterParams);
        IONFT721(collection).sendFrom{value: fee}(from, dstChainId, toAddress, tokenId, payable(this), address(0), adapterParams);
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
        uint256
    ) virtual internal override {
        IONFT721(collection).safeTransferFrom(from, to, tokenId);
    }
}