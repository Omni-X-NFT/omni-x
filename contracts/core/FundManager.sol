// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// OpenZeppelin contracts
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// OmniX interfaces
import {ICurrencyManager} from "../interfaces/ICurrencyManager.sol";
import {IExecutionStrategy} from "../interfaces/IExecutionStrategy.sol";
import {IRoyaltyFeeManager} from "../interfaces/IRoyaltyFeeManager.sol";
import {IStargatePoolManager} from "../interfaces/IStargatePoolManager.sol";
import {IFundManager} from "../interfaces/IFundManager.sol";
import {OmniXExchange} from "./OmniXExchange.sol";
import {IOFT} from "../token/oft/IOFT.sol";

import "hardhat/console.sol";

/**
 * @title FundManager
 * @notice It is the contract for funds transfer.
 */
contract FundManager is IFundManager, Ownable {
    using SafeERC20 for IERC20;

    struct TradingData {
        address currency;
        address from;
        address to;
        uint16 fromChainId;
        uint16 toChainId;
        uint256 amount;
        uint256 lzFee;

    }
    // tradingId => TradingData
    mapping (uint => TradingData) private _tradingData;
    uint private _nextTradingId;
    uint16 private constant LZ_ADAPTER_VERSION = 1;
    uint256 public gasForOmniLzReceive = 350000;
    OmniXExchange public omnixExchange;

    event RoyaltyPayment(
        address indexed collection,
        uint256 indexed tokenId,
        address indexed royaltyRecipient,
        address currency,
        uint256 amount
    );

    event RoyaltyPaymentETH(
        address indexed collection,
        uint256 indexed tokenId,
        address indexed royaltyRecipient,
        uint256 amount
    );

    modifier onlyOmnix() {
        require (msg.sender == address(omnixExchange), "Only available from OmniXExchange");
        _;
    }

    constructor (address _omnixExchange) {
        omnixExchange = OmniXExchange(payable(_omnixExchange));
    }

    function setOmnixExchange(address _omnixExchange) external onlyOwner {
        omnixExchange = OmniXExchange(payable(_omnixExchange));
    }

    function setGasForOmniLZReceive(uint256 gas) external onlyOwner {
        gasForOmniLzReceive = gas;
    }

    /**
     * @notice get fees and funds to royalty recipient, protocol, and seller
     * @param strategy address of the execution strategy
     * @param collection non fungible token address for the transfer
     * @param tokenId tokenId
     * @param amount amount being transferred (in currency)
     */
    function getFeesAndFunds(
        address strategy,
        address collection,
        uint256 tokenId,
        uint256 amount
    ) public view override returns(uint256, uint256, uint256, address) {
        address protocolFeeRecipient = omnixExchange.protocolFeeRecipient();
        address royaltyFeeManager = address(omnixExchange.royaltyFeeManager());

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

    function _proxyTransfer(address currency, address from, address to, uint16 toChainId, uint256 amount, uint256 lzFee) private returns (uint) {
        // if currency is native token, currency is 0x0
        ++_nextTradingId;
        _tradingData[_nextTradingId] = TradingData(
            currency,
            from,
            to,
            fromChainId,
            toChainId,
            amount,
            lzFee
        );

        return _nextTradingId;
    }

    function _shipFunds(uint tradingId) {
        IERC20(_tradingData[tradingId].currency).safeTransferFrom(address(this), _tradingData[tradingId].to, _tradingData[tradingId].amount);
    }

    function _revertFunds(uint tradingId) {
        IERC20(_tradingData[tradingId].currency).safeTransferFrom(address(this), _tradingData[tradingId].from, _tradingData[tradingId].amount);
    }

    function transferCurrency(
        address currency,
        address from,
        address to,
        uint256 amount,
        uint16 fromChainId,
        uint16 toChainId
    ) internal {
        ICurrencyManager currencyManager = omnixExchange.currencyManager();
        IStargatePoolManager stargatePoolManager = omnixExchange.stargatePoolManager();

        if (currencyManager.isOmniCurrency(currency)) {
            if (fromChainId == toChainId) {
                // we don't need proxy transfer in this case
                IERC20(currency).safeTransferFrom(from, to, amount);
            }
            else {
                bytes memory toAddress = abi.encodePacked(address(this));
                bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, gasForOmniLzReceive);
                
                IOFT(currency).sendFrom{value: msg.value}(
                    from, toChainId, toAddress, amount, payable(msg.sender), address(0x0), adapterParams
                );
                _proxyTransfer(currency, from, to, fromChainId, toChainId, amount, msg.value);
            }
        }
        else {
            if (
                fromChainId != toChainId && 
                address(stargatePoolManager) != address(0) &&
                stargatePoolManager.isSwappable(currency, toChainId)
            ) {
                stargatePoolManager.swap{value: msg.value}(currency, toChainId, payable(msg.sender), amount, from, address(this));
                _proxyTransfer(currency, from, to, fromChainId, toChainId, amount, msg.value);
            }
            else {
                // we don't need proxy transfer in this case
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
        address currency,
        address to,
        uint256 amount,
        uint16 fromChainId,
        uint16 toChainId
    ) public view override returns(uint256) {
        if (currency == address(0)) return 0;
        
        ICurrencyManager currencyManager = omnixExchange.currencyManager();
        IStargatePoolManager stargatePoolManager = omnixExchange.stargatePoolManager();

        if (currencyManager.isOmniCurrency(currency)) {
            if (fromChainId == toChainId) {
                return 0;
            }
            else {
                // use adapterParams v1 to specify more gas for the destination
                bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, gasForOmniLzReceive);
                bytes memory toAddress = abi.encodePacked(to);
                // get the fees we need to pay to LayerZero for message delivery
                (uint256 messageFee, ) = IOFT(currency).estimateSendFee(toChainId, toAddress, amount, false, adapterParams);
                return messageFee;
            }
        }
        else {
            if (
                fromChainId != toChainId && 
                address(stargatePoolManager) != address(0) && 
                stargatePoolManager.isSwappable(currency, toChainId)
            ) {
                address WETH = omnixExchange.WETH();
                if (currency == WETH) {
                    (uint256 fee, ) = stargatePoolManager.getSwapFeeETH(toChainId, to);
                    return fee;
                }
                else {
                    (uint256 fee, ) = stargatePoolManager.getSwapFee(toChainId, to);
                    return fee;
                }
            }
        }

        return 0;
    }

    /**
     * @notice Transfer fees and funds to royalty recipient, protocol, and seller
     * @param strategy address of the execution strategy
     * @param collection non fungible token address for the transfer
     * @param tokenId tokenId
     * @param currency currency being used for the purchase (e.g., WETH/USDC)
     * @param from sender of the funds
     * @param to seller's recipient
     * @param amount amount being transferred (in currency)
     * @param minPercentageToAsk minimum percentage of the gross amount that goes to ask
     * @param fromChainId ask chain id
     */
    function transferFeesAndFunds(
        address strategy,
        address collection,
        uint256 tokenId,
        address currency,
        address from,
        address to,
        uint256 amount,
        uint256 minPercentageToAsk,
        uint16 fromChainId,
        uint16 toChainId
    ) external payable override onlyOmnix() {
        address protocolFeeRecipient = omnixExchange.protocolFeeRecipient();
        // Initialize the final amount that is transferred to seller
        (
            uint256 protocolFeeAmount,
            uint256 royaltyFeeAmount,
            uint256 finalSellerAmount,
            address royaltyFeeRecipient
        ) = getFeesAndFunds(strategy, collection, tokenId, amount);

        // 1. Protocol fee
        {
            // Check if the protocol fee is different than 0 for this strategy
            if ((protocolFeeRecipient != address(0)) && (protocolFeeAmount != 0)) {
                // IERC20(currency).safeTransferFrom(from, protocolFeeRecipient, protocolFeeAmount);
                IERC20(currency).safeTransferFrom(from, address(this), protocolFeeAmount);
                deposit(currency, from, protocolFeeRecipient, fromChainId, protocolFeeAmount, 0);
            }
        }

        // 2. Royalty fee
        {
            // Check if there is a royalty fee and that it is different to 0
            if ((royaltyFeeRecipient != address(0)) && (royaltyFeeAmount != 0)) {
                // IERC20(currency).safeTransferFrom(from, royaltyFeeRecipient, royaltyFeeAmount);
                // emit RoyaltyPayment(collection, tokenId, royaltyFeeRecipient, currency, royaltyFeeAmount);

                IERC20(currency).safeTransferFrom(from, address(this), royaltyFeeAmount);
                deposit(currency, from, royaltyFeeRecipient, fromChainId, royaltyFeeAmount, 0);
            }
        }

        require((finalSellerAmount * 10000) >= (minPercentageToAsk * amount), "Fees: Higher than expected");

        // 3. Transfer final amount (post-fees) to seller
        {
            transferCurrency(
                currency,
                from,
                to,
                finalSellerAmount,
                fromChainId,
                toChainId
            );
        }
    }

    /**
     * @notice Transfer fees and funds to royalty recipient, protocol, and seller
     * @param strategy address of the execution strategy
     * @param collection non fungible token address for the transfer
     * @param tokenId tokenId
     * @param to seller's recipient
     * @param amount amount being transferred (in currency)
     * @param minPercentageToAsk minimum percentage of the gross amount that goes to ask
     */
    function transferFeesAndFundsWithWETH(
        address strategy,
        address collection,
        uint256 tokenId,
        address to,
        uint256 amount,
        uint256 minPercentageToAsk,
        uint16 fromChainId,
        uint16 toChainId
    ) external payable override {
        address protocolFeeRecipient = omnixExchange.protocolFeeRecipient();

        // Initialize the final amount that is transferred to seller
        (
            uint256 protocolFeeAmount,
            uint256 royaltyFeeAmount,
            uint256 finalSellerAmount,
            address royaltyFeeRecipient
        ) = getFeesAndFunds(strategy, collection, tokenId, amount);

        // 1. Protocol fee
        {
            // Check if the protocol fee is different than 0 for this strategy
            if ((protocolFeeRecipient != address(0)) && (protocolFeeAmount != 0)) {
                // payable(protocolFeeRecipient).transfer(protocolFeeAmount);

                deposit(address(0), address(this), protocolFeeRecipient, fromChainId, protocolFeeAmount, 0);
            }
        }

        // 2. Royalty fee
        {
            // Check if there is a royalty fee and that it is different to 0
            if ((royaltyFeeRecipient != address(0)) && (royaltyFeeAmount != 0)) {
                // payable(royaltyFeeRecipient).transfer(royaltyFeeAmount);

                // emit RoyaltyPaymentETH(collection, tokenId, royaltyFeeRecipient, royaltyFeeAmount);

                deposit(address(0), address(this), royaltyFeeRecipient, fromChainId, royaltyFeeAmount, 0);
            }
        }

        require((finalSellerAmount * 10000) >= (minPercentageToAsk * amount), "Fees: Higher than expected");

        // 3. Transfer final amount (post-fees) to seller
        address toAddr = to;
        if (toAddr != address(0)) {
            IStargatePoolManager stargatePoolManager = omnixExchange.stargatePoolManager();

            if (
                fromChainId != toChainId && 
                address(stargatePoolManager) != address(0) &&
                stargatePoolManager.isSwappable(omnixExchange.WETH(), toChainId)
            ) {
                // msv.value = amount + swap fee
                // stargatePoolManager.swapETH{value: msg.value - amount + finalSellerAmount}(toChainId, payable(msg.sender), finalSellerAmount, toAddr);
                uint256 lzFee = msg.value - amount + finalSellerAmount;
                deposit(address(0), address(this), toAddr, toChainId, finalSellerAmount, lzFee);

            }
            else {
                payable(toAddr).transfer(finalSellerAmount);

                deposit(address(0), address(this), toAddr, fromChainId, finalSellerAmount, 0);
            }
        }
    }
}