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

    uint16 private constant LZ_ADAPTER_VERSION = 1;
    uint16 private constant MIN_PERCENTAGE_INCOME = 800;

    struct ProxyData {
        uint256 lzFee;
        address strategy;
        address collection;
        uint256 tokenId;
        address currency;
        address from;
        address to;
        uint16 fromChainId;
        uint16 toChainId;
        uint256 amount;
        bytes royaltyInfo;

    }
    // lz chain id => fund manager address
    mapping (uint16 => address) private _trustedRemoteAddress;
    // proxyDataId => ProxyData
    mapping (uint => ProxyData) private _proxyData;
    uint private _nextProxyDataId;
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

    function setTrustedRemoteAddress(uint16 chainId, address _remoteAddress) external onlyOwner {
        _trustedRemoteAddress[chainId] = _remoteAddress;
    }

    function _safeTransferFrom(address currency, address from, address to, uint amount) private {
        if (from == address(this)) {
            IERC20(currency).safeTransfer(to, amount);
        } else {
            IERC20(currency).safeTransferFrom(from, to, amount);
        }
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
        uint256 amount,
        bytes memory royaltyInfo
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
            .calculateRoyaltyFeeAndGetRecipient(collection, tokenId, amount, royaltyInfo);

        // Check if there is a royalty fee and that it is different to 0
        if ((royaltyFeeRecipient != address(0)) && (royaltyFeeAmount != 0)) {
            finalSellerAmount -= royaltyFeeAmount;
        }

        return (protocolFeeAmount, royaltyFeeAmount, finalSellerAmount, royaltyFeeRecipient);
    }

    function transferCurrency(
        address currency,
        address from,
        address to,
        uint256 amount,
        uint16 fromChainId,
        uint16 toChainId,
        uint256 lzFee
    ) internal {
        ICurrencyManager currencyManager = omnixExchange.currencyManager();
        IStargatePoolManager stargatePoolManager = omnixExchange.stargatePoolManager();

        if (currencyManager.isOmniCurrency(currency)) {
            if (fromChainId == toChainId) {
                _safeTransferFrom(currency, from, to, amount);
            }
            else {
                bytes memory toAddress = abi.encodePacked(to);
                bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, gasForOmniLzReceive);

                IOFT(currency).sendFrom{value: lzFee}(
                    from, toChainId, toAddress, amount, payable(address(omnixExchange)), address(0x0), adapterParams
                );
            }
        }
        else {
            if (
                fromChainId != toChainId && 
                address(stargatePoolManager) != address(0) &&
                stargatePoolManager.isSwappable(currency, toChainId)
            ) {
                stargatePoolManager.swap{value: lzFee}(currency, toChainId, payable(address(omnixExchange)), amount, from, to);
            }
            else {
                _safeTransferFrom(currency, from, to, amount);
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
        uint16 fromChainId,
        uint16 toChainId,
        bytes memory royaltyInfo
    ) external payable override onlyOmnix() {
        _transferFeesAndFunds(
            strategy,
            collection,
            tokenId,
            currency,
            [from, to],
            [amount, msg.value],
            [fromChainId, toChainId],
            royaltyInfo
        );
    }

    /// @param operators [0]: from, [1]: to
    /// @param amounts [0]: amount, [1]: msgValue
    /// @param chainIds [0]: fromChainId, [1]: toChainId
    function _transferFeesAndFunds(
        address strategy,
        address collection,
        uint256 tokenId,
        address currency,
        address[2] memory operators,
        uint256[2] memory amounts,
        uint16[2] memory chainIds,
        bytes memory royaltyInfo
    ) internal {
        address protocolFeeRecipient = omnixExchange.protocolFeeRecipient();

        // Initialize the final amount that is transferred to seller
        (
            uint256 protocolFeeAmount,
            uint256 royaltyFeeAmount,
            uint256 finalSellerAmount,
            address royaltyFeeRecipient
        ) = getFeesAndFunds(strategy, collection, tokenId, amounts[0], royaltyInfo);

        // 1. Protocol fee
        {
            // Check if the protocol fee is different than 0 for this strategy
            if ((protocolFeeRecipient != address(0)) && (protocolFeeAmount != 0)) {
                _safeTransferFrom(currency, operators[0], protocolFeeRecipient, protocolFeeAmount);
            }
        }

        // 2. Royalty fee
        {
            // Check if there is a royalty fee and that it is different to 0
            if ((royaltyFeeRecipient != address(0)) && (royaltyFeeAmount != 0)) {
                _safeTransferFrom(currency, operators[0], royaltyFeeRecipient, royaltyFeeAmount);
                emit RoyaltyPayment(collection, tokenId, royaltyFeeRecipient, currency, royaltyFeeAmount);
            }
        }

        require((finalSellerAmount * 10000) >= (MIN_PERCENTAGE_INCOME * amounts[0]), "Fees: Higher than expected");

        // 3. Transfer final amount (post-fees) to seller
        {
            transferCurrency(
                currency,
                operators[0],
                operators[1],
                finalSellerAmount,
                chainIds[0],
                chainIds[1],
                amounts[1]
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
     */
    function transferFeesAndFundsWithWETH(
        address strategy,
        address collection,
        uint256 tokenId,
        address from,
        address to,
        uint256 amount,
        uint16 fromChainId,
        uint16 toChainId,
        bytes memory royaltyInfo
    ) external payable override onlyOmnix() {
        _transferFeesAndFundsWithWETH(
            strategy,
            collection,
            tokenId,
            from,
            to,
            amount,
            fromChainId,
            toChainId,
            msg.value,
            royaltyInfo
        );
    }

    function _transferFeesAndFundsWithWETH(
        address strategy,
        address collection,
        uint256 tokenId,
        address from,
        address to,
        uint256 amount,
        uint16 fromChainId,
        uint16 toChainId,
        uint256 msgValue,
        bytes memory royaltyInfo
    ) private {
        address protocolFeeRecipient = omnixExchange.protocolFeeRecipient();

        // Initialize the final amount that is transferred to seller
        (
            uint256 protocolFeeAmount,
            uint256 royaltyFeeAmount,
            uint256 finalSellerAmount,
            address royaltyFeeRecipient
        ) = getFeesAndFunds(strategy, collection, tokenId, amount, royaltyInfo);

        // 1. Protocol fee
        {
            // Check if the protocol fee is different than 0 for this strategy
            if ((protocolFeeRecipient != address(0)) && (protocolFeeAmount != 0)) {
                payable(protocolFeeRecipient).transfer(protocolFeeAmount);
            }
        }

        // 2. Royalty fee
        {
            // Check if there is a royalty fee and that it is different to 0
            if ((royaltyFeeRecipient != address(0)) && (royaltyFeeAmount != 0)) {
                payable(royaltyFeeRecipient).transfer(royaltyFeeAmount);

                emit RoyaltyPaymentETH(collection, tokenId, royaltyFeeRecipient, royaltyFeeAmount);
            }
        }

        require((finalSellerAmount * 10000) >= (MIN_PERCENTAGE_INCOME * amount), "Fees: Higher than expected");

        // 3. Transfer final amount (post-fees) to seller
        address fromAddr = from;
        address toAddr = to;
        if (toAddr != address(0)) {
            IStargatePoolManager stargatePoolManager = omnixExchange.stargatePoolManager();

            if (
                fromChainId != toChainId && 
                address(stargatePoolManager) != address(0) &&
                stargatePoolManager.isSwappable(omnixExchange.WETH(), toChainId)
            ) {
                // msv.value = amount + swap fee
                uint256 lzFee = msgValue - amount + finalSellerAmount;
                stargatePoolManager.swapETH{value: lzFee}(toChainId, payable(fromAddr), finalSellerAmount, toAddr);
            }
            else {
                payable(toAddr).transfer(finalSellerAmount);
            }
        }
    }

    /// @param addresses [0]: currency, [1]: strategy, [2]: collection
    function proxyTransfer(
        bytes memory royaltyInfo,
        uint256 amount,
        uint256 tokenId,
        address[2] memory operators,
        address[3] memory addresses,
        uint16[2] memory chainIds
    ) public payable override returns (uint) {
        // if currency is native token, currency is 0x0
        ++_nextProxyDataId;
        _proxyData[_nextProxyDataId] = ProxyData(
            msg.value,
            addresses[1],
            addresses[2],
            tokenId,
            addresses[0],
            operators[0],
            operators[1],
            chainIds[0],
            chainIds[1],
            amount,
            royaltyInfo
        );

        if (addresses[0] != omnixExchange.WETH()) {
            IERC20(addresses[0]).safeTransferFrom(operators[0], address(this), amount);
        }

        return _nextProxyDataId;
    }

    function processFunds(uint proxyDataId, uint8 resp) external override onlyOmnix() {
        require (_proxyData[proxyDataId].currency != address(0), "proxy funds: invalid data id");

        ProxyData storage data = _proxyData[proxyDataId];

        if (data.currency == omnixExchange.WETH()) {
            // success
            if (resp == 1) {
                // ship funds
                _transferFeesAndFundsWithWETH(
                    data.strategy,
                    data.collection,
                    data.tokenId,
                    address(this),
                    data.to,
                    data.amount,
                    data.fromChainId,
                    data.toChainId,
                    data.lzFee,
                    data.royaltyInfo
                );
            } else {
                // revert funds
                payable(data.from).transfer(data.amount);
            }
        } else {
            // success
            if (resp == 1) {
                // ship funds
                _transferFeesAndFunds(
                    data.strategy,
                    data.collection,
                    data.tokenId,
                    data.currency,
                    [address(this), data.to],
                    [data.amount, data.lzFee],
                    [data.fromChainId, data.toChainId],
                    data.royaltyInfo
                );
            } else {
                // revert funds
                _safeTransferFrom(data.currency, address(this), data.from, data.amount);
            }
        }
        
    }
}