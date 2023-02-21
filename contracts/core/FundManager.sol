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
import {OrderTypes} from "../libraries/OrderTypes.sol";
import {BytesLib} from "../libraries/BytesLib.sol";

/**
 * @title FundManager
 * @notice It is the contract for funds transfer.
 */
contract FundManager is IFundManager, Ownable {
    using SafeERC20 for IERC20;
    using OrderTypes for OrderTypes.MakerOrder;
    using OrderTypes for OrderTypes.TakerOrder;
    using BytesLib for bytes;

    uint16 public constant DIRECT_TRANSFER = 0;
    uint16 public constant PROXY_TRANSFER = 1;
    uint16 public constant REVERT_TRANSFER = 2;
    uint16 private constant LZ_ADAPTER_VERSION = 1;
    uint16 private constant MIN_PERCENTAGE_INCOME = 800;

    // lz chain id => fund manager address
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
        uint256 lzFee,
        bytes memory payload
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
                stargatePoolManager.swap{value: lzFee}(currency, toChainId, payable(address(omnixExchange)), amount, from, to, payload);
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
        uint16 toChainId,
        bytes memory payload
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
                    (uint256 fee, ) = stargatePoolManager.getSwapFee(toChainId, to, payload);
                    return fee;
                }
            }
        }

        return 0;
    }

    /**
     * @notice Transfer fees and funds to royalty recipient, protocol, and seller
     * @param taker taker order data
     * @param maker maker order data
     */
    function transferFeesAndFunds(OrderTypes.TakerOrder calldata taker, OrderTypes.MakerOrder calldata maker) external payable override onlyOmnix() {
        bytes memory royaltyInfo = maker.getRoyaltyInfo();

        if (maker.isOrderAsk) {
            (uint16 takerChainId, address takerCurrency, address takerCollection, address takerStrategy,) = taker.decodeParams();
            (uint16 makerChainId) = maker.decodeParams();

            uint256 finalAmount = 
                _transferFeesAndFunds(
                    takerStrategy,
                    takerCollection,
                    taker.tokenId,
                    takerCurrency,
                    taker.price,
                    taker.taker,
                    maker.signer,
                    royaltyInfo
                );

            if (finalAmount > 0) {
                transferCurrency(
                    takerCurrency,
                    taker.taker,
                    maker.signer,
                    finalAmount,
                    takerChainId,
                    makerChainId,
                    msg.value,
                    bytes("")
                );
            }
        } else {
            (uint16 takerChainId,,,,) = taker.decodeParams();
            (uint16 makerChainId) = maker.decodeParams();

            uint256 finalAmount = 
                _transferFeesAndFunds(
                    maker.strategy,
                    maker.collection,
                    taker.tokenId,
                    maker.currency,
                    taker.price,
                    maker.signer,
                    taker.taker,
                    royaltyInfo
                );

            if (finalAmount > 0) {
                transferCurrency(
                    maker.currency,
                    maker.signer,
                    taker.taker,
                    finalAmount,
                    makerChainId,
                    takerChainId,
                    msg.value,
                    bytes("")
                );
            }
        }
    }

    /// @param strategy fee strategy
    /// @param collection nft collection for royalty calculation
    /// @param tokenId nft token id for royalty calculation
    /// @param currency erc20 token address
    /// @param amount funds amount to be transferred
    /// @param from sender
    /// @param to receiver
    /// @param royaltyInfo custom royalty data for the collection
    function _transferFeesAndFunds(
        address strategy,
        address collection,
        uint256 tokenId,
        address currency,
        uint256 amount,
        address from,
        address to,
        bytes memory royaltyInfo
    ) internal returns (uint256) {
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
                _safeTransferFrom(currency, from, protocolFeeRecipient, protocolFeeAmount);
            }
        }

        // 2. Royalty fee
        {
            // Check if there is a royalty fee and that it is different to 0
            if ((royaltyFeeRecipient != address(0)) && (royaltyFeeAmount != 0)) {
                _safeTransferFrom(currency, from, royaltyFeeRecipient, royaltyFeeAmount);
                emit RoyaltyPayment(collection, tokenId, royaltyFeeRecipient, currency, royaltyFeeAmount);
            }
        }

        require((finalSellerAmount * 10000) >= (MIN_PERCENTAGE_INCOME * amount), "Fees: Higher than expected");

        // 3. Transfer final amount (post-fees) to seller
        {
            ICurrencyManager currencyManager = omnixExchange.currencyManager();
            if (!currencyManager.isOmniCurrency(currency) || msg.value == 0) {
                _safeTransferFrom(currency, from, to, finalSellerAmount);
            }
            else {
                return finalSellerAmount;
            }
        }
        return 0;
    }

    /**
     * @notice Transfer fees and funds to royalty recipient, protocol, and seller
     * @param taker taker order data
     * @param maker maker order data
     */
    function transferFeesAndFundsWithWETH(OrderTypes.TakerOrder calldata taker, OrderTypes.MakerOrder calldata maker) external payable override onlyOmnix() {
        (uint16 takerChainId,, address collection, address strategy,) = taker.decodeParams();
        (uint16 makerChainId) = maker.decodeParams();
        bytes memory royaltyInfo = maker.getRoyaltyInfo();
        _transferFeesAndFundsWithWETH(
            strategy,
            collection,
            taker.tokenId,
            taker.taker,
            maker.signer,
            taker.price,
            takerChainId,
            makerChainId,
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

    /**
     * @notice Transfer funds to omnixexchange
     * @param taker taker order data
     * @param maker maker order data
     */
    function transferProxyFunds(OrderTypes.TakerOrder calldata taker, OrderTypes.MakerOrder calldata maker) external payable override onlyOmnix() {
        uint16 makerChainId = maker.decodeParams();
        (uint16 takerChainId, address takerCurrency,,,) = taker.decodeParams();
        bytes memory payload = abi.encode(taker, maker);

        if (maker.isOrderAsk) {
            transferCurrency(
                takerCurrency,
                taker.taker,
                omnixExchange.getTrustedRemoteAddress(makerChainId).toAddress(0),
                taker.price,
                takerChainId,
                makerChainId,
                msg.value,
                payload
            );
        } else {
            transferCurrency(
                maker.currency,
                maker.signer,
                omnixExchange.getTrustedRemoteAddress(takerChainId).toAddress(0),
                maker.price,
                makerChainId,
                takerChainId,
                msg.value,
                payload
            );
        }
    }

    /**
     * @notice Transfer fees and funds to royalty recipient, protocol, and seller
     * @param taker taker order data
     * @param maker maker order data
     * @param transferType one of PROXY_TRANSFER, REVERT_TRANSFER
     * @dev this function is called on seller side. refer OmniXExchange.sgReceive
     */
    function processFeesAndFunds(OrderTypes.TakerOrder calldata taker, OrderTypes.MakerOrder calldata maker, uint16 transferType) external override onlyOmnix() {
        // Assumed funds already been arrived at OmniXExchange on seller's chain.
        // if isOrderAsk is true, maker is seller.
        // otherwise, taker is seller.
        (, address takerCurrency, address takerCollection, address takerStrategy,) = taker.decodeParams();
        bytes memory royaltyInfo = maker.getRoyaltyInfo();

        if (transferType == REVERT_TRANSFER) {
            if (maker.isOrderAsk) {
                // refund to buyer
                _safeTransferFrom(maker.currency, address(omnixExchange), taker.taker, maker.price);
            } else {
                _safeTransferFrom(takerCurrency, address(omnixExchange), maker.signer, taker.price);
            }
        }
        else {
            if (maker.isOrderAsk) {
                _transferFeesAndFunds(
                    maker.strategy,
                    maker.collection,
                    taker.tokenId,
                    maker.currency,
                    maker.price,
                    address(omnixExchange),
                    maker.signer,
                    royaltyInfo
                );
            } else {
                _transferFeesAndFunds(
                    takerStrategy,
                    takerCollection,
                    taker.tokenId,
                    takerCurrency,
                    taker.price,
                    address(omnixExchange),
                    taker.taker,
                    royaltyInfo
                );
            }
        }
    }
}