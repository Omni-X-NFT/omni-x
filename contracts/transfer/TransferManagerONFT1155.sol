// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IONFT1155} from "../token/onft/IONFT1155.sol";
import {ITransferManagerNFT} from "../interfaces/ITransferManagerNFT.sol";
import {BytesUtils} from "../libraries/BytesUtils.sol";

/**
 * @title TransferManagerERC1155
 * @notice It allows the transfer of ERC1155 tokens.
 */
contract TransferManagerERC1155 is ITransferManagerNFT {
    address public immutable OMNIX_EXCHANGE;

    /**
     * @notice Constructor
     * @param _omniXExchange address of the OmniX exchange
     */
    constructor(address _omniXExchange) {
        OMNIX_EXCHANGE = _omniXExchange;
    }

    /**
     * @notice Transfer ERC1155 token(s)
     * @param collection address of the collection
     * @param from address of the sender
     * @param to address of the recipient
     * @param tokenId tokenId
     * @param amount amount of tokens (1 and more for ERC1155)
     */
    function transferNonFungibleToken(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 toChainId
    ) external override {
        require(msg.sender == OMNIX_EXCHANGE, "Transfer: Only LooksRare Exchange");
        bytes memory toAddress = BytesUtils.fromAddress(to);

        IONFT1155(collection).sendFrom(from, toChainId, toAddress, tokenId, amount, payable(0), address(0), bytes(""));
    }
}