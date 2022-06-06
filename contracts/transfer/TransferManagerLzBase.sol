// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ITransferManagerNFT} from "../interfaces/ITransferManagerNFT.sol";
import {NonblockingLzApp} from "../lzApp/NonblockingLzApp.sol";

/**
 * @title TransferManagerGhosts
 * @notice It allows the transfer of GhostlyGhosts tokens.
 */
abstract contract TransferManagerLzBase is ITransferManagerNFT, NonblockingLzApp {
    uint16 public constant MT_ON_SRC_CHAIN = 1;
    uint16 public constant MT_ON_DST_CHAIN = 2;
    address public immutable OMNIX_EXCHANGE;

    event ReceiveFromDstChain(uint16 chainId, address collection, address from, address to, uint tokenId, uint amount, uint64 _nonce);
    event ReceiveFromSrcChain(uint16 chainId, address collection, address from, address to, uint tokenId, uint amount, uint64 _nonce);

    /**
     * @notice Constructor
     * @param _omniXExchange address of the OmniX exchange
     */
    constructor(address _omniXExchange, address _lzEndpoint) NonblockingLzApp(_lzEndpoint) {
        OMNIX_EXCHANGE = _omniXExchange;
    }

    /**
     * @notice Transfer ERC721 token
     * @param collection address of the collection
     * @param from address of the sender
     * @param to address of the recipient
     * @param tokenId tokenId
     * @dev For ERC721, amount is not used
     */
    function transferNonFungibleToken(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 fromChainId
    ) external override {
        require(msg.sender == OMNIX_EXCHANGE, "Transfer: Only OmniX Exchange");

        uint16 toChainId = uint16(block.chainid);
        if (fromChainId == toChainId) {
            _normalTransfer(collection, from, to, tokenId, amount);
        }
        else {
            _crossSendToSrc(collection, from, to, tokenId, amount, fromChainId);
        }
    }

    function _nonblockingLzReceive(uint16 _srcChainId, bytes memory, uint64 _nonce, bytes memory _payload) internal virtual override {
        // decode and load the toAddress
        (uint16 messageType, address fromAddress, address toAddress, address collection, uint tokenId, uint amount) = 
            abi.decode(_payload, (uint16, address, address, address, uint, uint));

        // if the toAddress is 0x0, convert to dead address, or it will get cached
        if (toAddress == address(0x0)) toAddress == address(0xdEaD);

        if (messageType == MT_ON_SRC_CHAIN) {
            if (_onReceiveOnSrcChain(collection, fromAddress, toAddress, tokenId, amount, _srcChainId)) {
                _crossSendToDst(collection, fromAddress, toAddress, tokenId, amount, _srcChainId);
            }

            emit ReceiveFromDstChain(_srcChainId, collection, fromAddress, toAddress, tokenId, amount, _nonce);
        }
        else if (messageType == MT_ON_DST_CHAIN) {
            // transfer nft from this to toAddr on dst chain
            _onReceiveOnDstChain(collection, fromAddress, toAddress, tokenId, amount, _srcChainId);

            emit ReceiveFromSrcChain(_srcChainId, collection, fromAddress, toAddress, tokenId, amount, _nonce);
        }
    }

    function _crossSendToSrc(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 fromChainId
    ) virtual internal {
        bytes memory payload = abi.encode(MT_ON_SRC_CHAIN, from, to, collection, tokenId, amount);
        _lzSend(fromChainId, payload, payable(0), address(0), bytes(""));
    }

    function _crossSendToDst(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 dstChainId
    ) virtual internal {
        bytes memory payload = abi.encode(MT_ON_DST_CHAIN, from, to, collection, tokenId, amount);
        _lzSend(dstChainId, payload, payable(0), address(0), bytes(""));
    }

    function _onReceiveOnSrcChain(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 dstChainId
    ) virtual internal returns(bool);

    function _onReceiveOnDstChain(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 dstChainId
    ) virtual internal returns(bool);

    function _normalTransfer(address collection, address from, address to, uint256 tokenId, uint256 amount) virtual internal;
}