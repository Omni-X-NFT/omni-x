// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IGregs} from "../token/onft/IGregs.sol";
import {ITransferManagerNFT} from "../interfaces/ITransferManagerNFT.sol";
import {NonblockingLzApp} from "../lzApp/NonblockingLzApp.sol";

/**
 * @title TransferManagerGregs
 * @notice It allows the transfer of GhostlyGhosts tokens.
 */
contract TransferManagerGregs is ITransferManagerNFT, NonblockingLzApp {
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
        // require(msg.sender == OMNIX_EXCHANGE, "Transfer: Only LooksRare Exchange");

        // IGregs(collection).safeTransferFrom(from, address(this), tokenId);
        // IGregs(collection).sendNFT(toChainId, tokenId);

        // bytes memory payload = abi.encode(to, collection, tokenId);
        // _lzSend(toChainId, payload, payable(0), address(0), bytes(""));
    }

    function _nonblockingLzReceive(uint16 _srcChainId, bytes memory _srcAddress, uint64 _nonce, bytes memory _payload) internal virtual override {
        // decode and load the toAddress
        // (address toAddress, address collection, uint tokenId) = abi.decode(_payload, (address, address, uint));

        // // if the toAddress is 0x0, convert to dead address, or it will get cached
        // if (toAddress == address(0x0)) toAddress == address(0xdEaD);

        // IGregs(collection).safeTransferFrom(address(this), toAddress, tokenId);

        // emit ReceiveFromChain(_srcChainId, toAddress, tokenId, _nonce);
    }
}