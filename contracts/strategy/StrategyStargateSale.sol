// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {OrderTypes} from "../libraries/OrderTypes.sol";
import {IExecutionStrategy} from "../interfaces/IExecutionStrategy.sol";

/**
 * @title StrategyStargateSale
 * @notice Strategy that executes an order at a fixed price that
 * can be taken either by a bid or an ask.
 */
contract StrategyStargateSale is IExecutionStrategy {
    uint256 public immutable PROTOCOL_FEE;

    using OrderTypes for OrderTypes.TakerOrder;

    /**
     * @notice Constructor
     * @param _protocolFee protocol fee (200 --> 2%, 400 --> 4%)
     */
    constructor(uint256 _protocolFee) {
        PROTOCOL_FEE = _protocolFee;
    }

    function comparePrice(uint256 price1, uint256 price2, uint256 currencyRate) internal pure returns (bool) {
        // if currencyRate is greater than 100, currencyRate is negative
        if (currencyRate == 0) {
            return price1 == price2;
        }
        else if (currencyRate < 100) {
            return (price1 == price2 * 10 ** currencyRate);
        }
        else {
            return (price1 == price2 / 10 ** (currencyRate - 100));
        }
    }

    /**
     * @notice Check whether a taker ask order can be executed against a maker bid
     * @param takerAsk taker ask order
     * @param makerBid maker bid order
     * @return (whether strategy can be executed, tokenId to execute, amount of tokens to execute)
     */
    function canExecuteTakerAsk(OrderTypes.TakerOrder calldata takerAsk, OrderTypes.MakerOrder calldata makerBid)
        external
        view
        override
        returns (
            bool,
            uint256,
            uint256
        )
    {
        (,,,,uint256 currencyRate) = takerAsk.decodeParams();
        return (
            (comparePrice(makerBid.price, takerAsk.price, currencyRate) &&
                (makerBid.tokenId == takerAsk.tokenId) &&
                (makerBid.startTime <= block.timestamp) &&
                (makerBid.endTime >= block.timestamp)),
            makerBid.tokenId,
            makerBid.amount
        );
    }

    /**
     * @notice Check whether a taker bid order can be executed against a maker ask
     * @param takerBid taker bid order
     * @param makerAsk maker ask order
     * @return (whether strategy can be executed, tokenId to execute, amount of tokens to execute)
     */
    function canExecuteTakerBid(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk)
        external
        view
        override
        returns (
            bool,
            uint256,
            uint256
        )
    {
        (,,,,uint256 currencyRate) = takerBid.decodeParams();
        return (
            (comparePrice(makerAsk.price, takerBid.price, currencyRate) &&
                (makerAsk.tokenId == takerBid.tokenId) &&
                (makerAsk.startTime <= block.timestamp) &&
                (makerAsk.endTime >= block.timestamp)),
            makerAsk.tokenId,
            makerAsk.amount
        );
    }

    /**
     * @notice Return protocol fee for this strategy
     * @return protocol fee
     */
    function viewProtocolFee() external view override returns (uint256) {
        return PROTOCOL_FEE;
    }
}