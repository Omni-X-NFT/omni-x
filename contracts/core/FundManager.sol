// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// OpenZeppelin contracts
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// OmniX interfaces
import {ICurrencyManager} from "../interfaces/ICurrencyManager.sol";
import {IExecutionStrategy} from "../interfaces/IExecutionStrategy.sol";
import {IRoyaltyFeeManager} from "../interfaces/IRoyaltyFeeManager.sol";
import {IStargatePoolManager} from "../interfaces/IStargatePoolManager.sol";
import {IFundManager} from "../interfaces/IFundManager.sol";
import {IOFT} from "../token/oft/IOFT.sol";

import "hardhat/console.sol";

/**
 * @title FundManager
 * @notice It is the contract for funds transfer.
 */
contract FundManager is IFundManager {
    using SafeERC20 for IERC20;

    uint16 private constant LZ_ADAPTER_VERSION = 1;
    uint256 public gasForOmniLzReceive = 350000;
    address public omnixExchange;

    modifier onlyOmnix() {
        require (msg.sender == omnixExchange, "Only available from OmniXExchange");
        _;
    }

    constructor (address _omnixExchange) {
        omnixExchange = _omnixExchange;
    }

    /**
     * @notice get fees and funds to royalty recipient, protocol, and seller
     * @param strategy address of the execution strategy
     * @param collection non fungible token address for the transfer
     * @param tokenId tokenId
     * @param amount amount being transferred (in currency)
     */
    function getFeesAndFunds(
        address royaltyFeeManager,
        address strategy,
        address collection,
        address protocolFeeRecipient,
        uint256 tokenId,
        uint256 amount
    ) public view override returns(uint256, uint256, uint256, address) {
        // Initialize the final amount that is transferred to seller
        uint256 finalSellerAmount = amount;

        // 1. Protocol fee
        uint256 protocolFeeAmount = calculateProtocolFee(strategy, amount);

        // Check if the protocol fee is different than 0 for this strategy
        if ((protocolFeeRecipient != address(0)) && (protocolFeeAmount != 0)) {
            finalSellerAmount -= protocolFeeAmount;
        }

        // 2. Royalty fee
        (address royaltyFeeRecipient, uint256 royaltyFeeAmount) = IRoyaltyFeeManager(royaltyFeeManager)
            .calculateRoyaltyFeeAndGetRecipient(collection, tokenId, amount);

        // Check if there is a royalty fee and that it is different to 0
        if ((royaltyFeeRecipient != address(0)) && (royaltyFeeAmount != 0)) {
            finalSellerAmount -= royaltyFeeAmount;
        }

        return (protocolFeeAmount, royaltyFeeAmount, finalSellerAmount, royaltyFeeRecipient);
    }

    function transferCurrency(
        address currencyManager,
        address stargatePoolManager,
        address currency,
        address from,
        address to,
        uint256 amount,
        uint16 fromChainId,
        uint16 toChainId
    ) public payable override onlyOmnix {
        if (ICurrencyManager(currencyManager).isOmniCurrency(currency)) {
            if (fromChainId == toChainId) {
                IERC20(currency).safeTransferFrom(from, to, amount);
            }
            else {
                bytes memory toAddress = abi.encodePacked(to);
                bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, gasForOmniLzReceive);
                
                IOFT(currency).sendFrom{value: msg.value}(
                    from, fromChainId, toAddress, amount, payable(msg.sender), address(0x0), adapterParams
                );
            }
        }
        else {
            if (
                fromChainId != toChainId && 
                stargatePoolManager != address(0) &&
                IStargatePoolManager(stargatePoolManager).isSwappable(currency, fromChainId)
            ) {
                IStargatePoolManager(stargatePoolManager).swap{value: msg.value}(currency, fromChainId, payable(msg.sender), amount, from, to);
            }
            else {
                IERC20(currency).safeTransferFrom(from, to, amount);
            }
        }
    }

    /**
     * @notice Calculate protocol fee for an execution strategy
     * @param executionStrategy strategy
     * @param amount amount to transfer
     */
    function calculateProtocolFee(address executionStrategy, uint256 amount) public view override returns (uint256) {
        uint256 protocolFee = IExecutionStrategy(executionStrategy).viewProtocolFee();
        return (protocolFee * amount) / 10000;
    }

    function lzFeeTransferCurrency(
        address currencyManager,
        address stargatePoolManager,
        address currency,
        address to,
        uint256 amount,
        uint16 fromChainId,
        uint16 toChainId
    ) public view override returns(uint256) {
        if (ICurrencyManager(currencyManager).isOmniCurrency(currency)) {
            if (fromChainId == toChainId) {
                return 0;
            }
            else {
                // use adapterParams v1 to specify more gas for the destination
                bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, gasForOmniLzReceive);
                bytes memory toAddress = abi.encodePacked(to);
                // get the fees we need to pay to LayerZero for message delivery
                (uint256 messageFee, ) = IOFT(currency).estimateSendFee(fromChainId, toAddress, amount, false, adapterParams);
                return messageFee;
            }
        }
        else {
            if (
                fromChainId != toChainId && 
                stargatePoolManager != address(0) && 
                IStargatePoolManager(stargatePoolManager).isSwappable(currency, fromChainId)
            ) {
                (uint256 fee, ) = IStargatePoolManager(stargatePoolManager).getSwapFee(fromChainId, to);
                return fee;
            }
        }

        return 0;
    }
}