// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title OrderTypes
 * @notice This library contains order types for the LooksRare exchange.
 */
library OrderTypes {
    // keccak256("MakerOrder(bool isOrderAsk,address signer,address collection,uint256 price,uint256 tokenId,uint256 amount,address strategy,address currency,uint256 nonce,uint256 startTime,uint256 endTime,uint256 minPercentageToAsk,uint16 chainId,bytes params)")
    // you can generate keccak256 on this link https://keccak-256.cloxy.net/
    bytes32 internal constant MAKER_ORDER_HASH = 0x63c2919ac804f5cdaeffe0c09b26419f790bf430fb5fdfffb94530d32bf883c4;
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
        (uint16 chainId) = abi.decode(makerOrder.params, (uint16));
        return chainId;
    }

    function decodeParams(TakerOrder memory takerOrder) internal pure returns (uint16) {
        (uint16 chainId) = abi.decode(takerOrder.params, (uint16));
        return chainId;
    }
}