// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// OpenZeppelin contracts
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// OmniX interfaces
import {ICurrencyManager} from "../interfaces/ICurrencyManager.sol";
import {IExecutionStrategy} from "../interfaces/IExecutionStrategy.sol";
import {IRoyaltyFeeManager} from "../interfaces/IRoyaltyFeeManager.sol";
import {IStargatePoolManager} from "../interfaces/IStargatePoolManager.sol";
import {IOFT} from "../token/oft/IOFT.sol";

interface IFundManager {
    function getFeesAndFunds(
        address royaltyFeeManager,
        address strategy,
        address collection,
        address protocolFeeRecipient,
        uint256 tokenId,
        uint256 amount
    ) external view returns(uint256, uint256, uint256, address);

    function transferCurrency(
        address currencyManager,
        address stargatePoolManager,
        address currency,
        address from,
        address to,
        uint256 amount,
        uint16 fromChainId,
        uint16 toChainId
    ) external payable;

    /**
     * @notice Calculate protocol fee for an execution strategy
     * @param executionStrategy strategy
     * @param amount amount to transfer
     */
    function calculateProtocolFee(address executionStrategy, uint256 amount) external view returns (uint256);

    function lzFeeTransferCurrency(
        address currencyManager,
        address stargatePoolManager,
        address currency,
        address to,
        uint256 amount,
        uint16 fromChainId,
        uint16 toChainId
    ) external view returns(uint256);
}