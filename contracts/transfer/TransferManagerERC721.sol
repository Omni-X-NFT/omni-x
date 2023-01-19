// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {TransferManagerLzBase} from "./TransferManagerLzBase.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "hardhat/console.sol";

/**
 * @title TransferManagerERC721
 * @notice It allows the transfer of ERC721 tokens.
 */
contract TransferManagerERC721 is TransferManagerLzBase, IERC721Receiver {
    struct TradingData {
        address collection;
        address from;
        address to;
        uint tokenId;
    }
    mapping (uint => TradingData) _tradingData;
    uint _nextTradingId;

    constructor(address _lzEndpoint) 
        TransferManagerLzBase(_lzEndpoint) {
    }

    function onERC721Received(address, address, uint256, bytes calldata) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
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
        uint16
    ) virtual internal override returns(bool) {
        _normalTransfer(collection, from, to, tokenId, amount);
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

    function _proxyTransfer(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 
    ) virtual internal override returns (uint) {
        ++_nextTradingId;

        _tradingData[_nextTradingId] = TradingData(
            collection,
            from,
            to,
            tokenId
        );

        return _nextTradingId;
    }

    function _directTransfer(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 
    ) virtual internal override {
        IERC721(collection).safeTransferFrom(from, to, tokenId);
    }

    function _shipTransfer(uint tradingId) virtual internal override {
        IERC721(_tradingData[tradingId].collection).safeTransferFrom(
            address(this),
            _tradingData[tradingId].to,
            _tradingData[tradingId].tokenId
        );

        delete _tradingData[tradingId];
    }

    function _revertTransfer(uint tradingId) virtual internal override {
        IERC721(_tradingData[tradingId].collection).safeTransferFrom(
            address(this),
            _tradingData[tradingId].from,
            _tradingData[tradingId].tokenId
        );

        delete _tradingData[tradingId];
    }
}