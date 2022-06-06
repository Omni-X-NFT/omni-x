// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IONFT721} from "../token/onft/IONFT721.sol";
import {TransferManagerLzBase} from "./TransferManagerLzBase.sol";

/**
 * @title TransferManagerONFT721
 * @notice It allows the transfer of ERC721 tokens.
 */
contract TransferManagerONFT721 is TransferManagerLzBase {
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
        uint256,
        uint16 dstChainId
    ) virtual internal override returns(bool) {
        bytes memory toAddress = abi.encodePacked(to);

        IONFT721(collection).sendFrom(from, dstChainId, toAddress, tokenId, payable(0), address(0), bytes(""));
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