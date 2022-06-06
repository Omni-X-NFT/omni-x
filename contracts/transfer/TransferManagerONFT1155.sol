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
        IONFT1155(collection).sendFrom(from, dstChainId, toAddress, tokenId, amount, payable(0), address(0), bytes(""));
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