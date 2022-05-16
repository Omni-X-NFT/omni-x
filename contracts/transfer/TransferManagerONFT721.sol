// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IONFT721} from "../token/onft/IONFT721.sol";
import {ITransferManagerNFT} from "../interfaces/ITransferManagerNFT.sol";
import {BytesUtils} from "../libraries/BytesUtils.sol";
/**
 * @title TransferManagerERC721
 * @notice It allows the transfer of ERC721 tokens.
 */
contract TransferManagerERC721 is ITransferManagerNFT {
    address public immutable LOOKS_RARE_EXCHANGE;

    /**
     * @notice Constructor
     * @param _looksRareExchange address of the LooksRare exchange
     */
    constructor(address _looksRareExchange) {
        LOOKS_RARE_EXCHANGE = _looksRareExchange;
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
        uint16 toChainId
    ) external override {
        require(msg.sender == LOOKS_RARE_EXCHANGE, "Transfer: Only LooksRare Exchange");

        bytes memory toAddress = BytesUtils.fromAddress(to);

        IONFT721(collection).sendFrom(from, toChainId, toAddress, tokenId, payable(0), address(0), bytes(""));
    }
}