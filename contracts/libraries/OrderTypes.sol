// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

/**
 * @title OrderTypes
 * @notice This library contains order types for the OmniX exchange.
 */
library OrderTypes {
    using ECDSA for bytes32;

    // keccak256("MakerOrder(bool isOrderAsk,address signer,address collection,uint256 price,uint256 tokenId,uint256 amount,address strategy,address currency,uint256 nonce,uint256 startTime,uint256 endTime,uint256 minPercentageToAsk,bytes params)")
    // you can generate keccak256 on this link https://keccak-256.cloxy.net/
    bytes32 internal constant MAKER_ORDER_HASH = 0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028;
    struct MakerOrder {
        bool isOrderAsk; // true --> ask / false --> bid
        address signer; // signer of the maker order
        address collection; // collection address
        uint256 price; // price (used as )
        uint256 tokenId; // id of the token
        uint256 amount; // amount of tokens to sell/purchase (must be 1 for ERC721, 1+ for ERC1155)
        address strategy; // strategy for trade execution (e.g., DutchAuction, StandardSaleForFixedPrice)
        address currency; // currency (e.g., WETH)
        uint256 nonce; // order nonce (must be unique unless new maker order is meant to override existing one e.g., lower ask price)
        uint256 startTime; // startTime in timestamp
        uint256 endTime; // endTime in timestamp
        uint256 minPercentageToAsk; // slippage protection (9000 --> 90% of the final price must return to ask)
        bytes params; // additional parameters: chainId
        bytes signature; // signature
    }

    struct TakerOrder {
        bool isOrderAsk; // true --> ask / false --> bid
        address taker; // msg.sender
        uint256 price; // final price for the purchase
        uint256 tokenId;
        uint256 minPercentageToAsk; // // slippage protection (9000 --> 90% of the final price must return to ask)
        bytes params; // other params (e.g. chainId)
    }

    function hash(MakerOrder memory makerOrder) internal pure returns (bytes32) {
        bytes memory structHash = abi.encode(
            MAKER_ORDER_HASH,
            makerOrder.isOrderAsk,
            makerOrder.signer,
            makerOrder.collection,
            makerOrder.price,
            makerOrder.tokenId,
            makerOrder.amount,
            makerOrder.strategy,
            makerOrder.currency,
            makerOrder.nonce,
            makerOrder.startTime,
            makerOrder.endTime,
            makerOrder.minPercentageToAsk,
            keccak256(makerOrder.params)
        );
        return keccak256(structHash);
    }

    function decodeParams(MakerOrder memory makerOrder) internal pure returns (uint16) {
        // lzChainId
        return abi.decode(makerOrder.params, (uint16));
    }

    function getRoyaltyFee(MakerOrder memory makerOrder) internal pure returns (uint256) {
        // lzChainId
        (, uint256 royaltyFee) = abi.decode(makerOrder.params, (uint16, uint256));
        return royaltyFee;
    }

    function decodeParams(TakerOrder memory takerOrder) internal pure 
        returns (uint16, address, address, address, uint256)
    {
        // lzChainId, currency, collection, strategy, currencyRate
        return abi.decode(takerOrder.params, (uint16, address, address, address, uint256));
    }

    function checkValid(MakerOrder memory makerOrder, bytes32 orderHash) internal pure {
        // Verify the signer is not address(0)
        require(makerOrder.signer != address(0), "Order: Invalid signer");

        // Verify the amount is not 0
        require(makerOrder.amount > 0, "Order: Amount cannot be 0");

        // Verify the validity of the signature
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", orderHash));
        require(
            digest.toEthSignedMessageHash().recover(makerOrder.signature) == makerOrder.signer,
            "Signature: Invalid"
        );
    }
}