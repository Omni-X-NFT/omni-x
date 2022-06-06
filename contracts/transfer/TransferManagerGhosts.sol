// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IGhosts} from "../token/onft/IGhosts.sol";
import {ITransferManagerNFT} from "../interfaces/ITransferManagerNFT.sol";
import {NonblockingLzApp} from "../lzApp/NonblockingLzApp.sol";

/**
 * @title TransferManagerGhosts
 * @notice It allows the transfer of GhostlyGhosts tokens.
 */
contract TransferManagerGhosts is ITransferManagerNFT, NonblockingLzApp {
    uint16 constant MT_ON_SRC_CHAIN = 1;
    uint16 constant MT_ON_DST_CHAIN = 2;
    address public immutable OMNIX_EXCHANGE;

    event ReceiveFromChain(uint16 _srcChainId, address _toAddress, uint _amount, uint64 _nonce);

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
        uint256,
        uint16 fromChainId
    ) external override {
        require(msg.sender == OMNIX_EXCHANGE, "Transfer: Only LooksRare Exchange");

        bytes memory payload = abi.encode(MT_ON_SRC_CHAIN, from, to, collection, tokenId);
        _lzSend(fromChainId, payload, payable(0), address(0), bytes(""));
    }

    function _nonblockingLzReceive(uint16 _srcChainId, bytes memory _srcAddress, uint64 _nonce, bytes memory _payload) internal virtual override {
        // decode and load the toAddress
        (uint16 messageType, address fromAddress, address toAddress, address collection, uint tokenId) = 
            abi.decode(_payload, (uint16, address, address, address, uint));

        // if the toAddress is 0x0, convert to dead address, or it will get cached
        if (toAddress == address(0x0)) toAddress == address(0xdEaD);

        if (messageType == MT_ON_SRC_CHAIN) {
            // transfer nft from fromAddr to this
            IGhosts(collection).safeTransferFrom(fromAddress, address(this), tokenId);
            // transfer nft from current chain to srcchain
            IGhosts(collection).traverseChains(_srcChainId, tokenId);

            // lz message back to dst chain
            bytes memory payload = abi.encode(MT_ON_DST_CHAIN, fromAddress, toAddress, collection, tokenId);
            _lzSend(_srcChainId, payload, payable(0), address(0), bytes(""));

            emit ReceiveFromChain(_srcChainId, toAddress, tokenId, _nonce);
        }
        else if (messageType == MT_ON_DST_CHAIN) {
            // transfer nft from this to toAddr on dst chain
            IGhosts(collection).safeTransferFrom(address(this), toAddress, tokenId);
        }
    }
}