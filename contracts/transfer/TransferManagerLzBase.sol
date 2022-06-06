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

    /**
     * @notice message listener from LayerZero endpoint
     * @param _srcChainId chain id where the message was sent from
     * @param _nonce nonce
     * @param _payload message data
     * @dev no need to change this function
     */
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

    /**
     * @notice cross send from taker chain to maker chain. 1st step
     * @dev no need to change this function
     */
    function _crossSendToSrc(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 fromChainId
    ) internal {
        bytes memory payload = abi.encode(MT_ON_SRC_CHAIN, from, to, collection, tokenId, amount);
        _lzSend(fromChainId, payload, payable(0), address(0), bytes(""));
    }

    /**
     * @notice cross send from maker chain to taker chain.
     * @dev this function is called after _onReceiveOnSrcChain
     */
    function _crossSendToDst(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 dstChainId
    ) internal {
        bytes memory payload = abi.encode(MT_ON_DST_CHAIN, from, to, collection, tokenId, amount);
        _lzSend(dstChainId, payload, payable(0), address(0), bytes(""));
    }

    /**
     * @notice cross send from maker chain to taker chain.
     * @return bool true if need to call _crossSendToDst, otherwise false
     * @dev this function is called when receive MT_ON_SRC_CHAIN and running on maker chain
     */
    function _onReceiveOnSrcChain(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 dstChainId
    ) virtual internal returns(bool);

    /**
     * @notice cross send from taker chain to maker chain.
     * @return bool no meaning right now
     * @dev this function is called when receive MT_ON_DST_CHAIN and running taker chain
     */
    function _onReceiveOnDstChain(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 dstChainId
    ) virtual internal returns(bool);

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