// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// OpenZeppelin contracts
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

// OmniX interfaces
import {ICurrencyManager} from "../interfaces/ICurrencyManager.sol";
import {IExecutionManager} from "../interfaces/IExecutionManager.sol";
import {IExecutionStrategy} from "../interfaces/IExecutionStrategy.sol";
import {IRoyaltyFeeManager} from "../interfaces/IRoyaltyFeeManager.sol";
import {ITransferManagerNFT} from "../interfaces/ITransferManagerNFT.sol";
import {ITransferSelectorNFT} from "../interfaces/ITransferSelectorNFT.sol";
import {IRemoteAddrManager} from "../interfaces/IRemoteAddrManager.sol";
import {IStargatePoolManager} from "../interfaces/IStargatePoolManager.sol";
import {IFundManager} from "../interfaces/IFundManager.sol";
import {IOmniXExchange} from "../interfaces/IOmniXExchange.sol";
import {NonblockingLzApp} from "../lzApp/NonblockingLzApp.sol";
import {IWETH} from "../interfaces/IWETH.sol";
import {IOFT} from "../token/oft/IOFT.sol";

import {OrderTypes} from "../libraries/OrderTypes.sol";
import "hardhat/console.sol";

/**
 * @title OmniXExchange
 * @notice It is the core contract of the OmniX exchange.
 */
contract OmniXExchange is NonblockingLzApp, EIP712, IOmniXExchange, ReentrancyGuard {
    string private constant SIGNING_DOMAIN = "OmniXExchange";
    string private constant SIGNATURE_VERSION = "1";
    uint16 private constant LZ_ADAPTER_VERSION = 1;

    using SafeERC20 for IERC20;

    using OrderTypes for OrderTypes.MakerOrder;
    using OrderTypes for OrderTypes.TakerOrder;

    address public immutable WETH;

    address public protocolFeeRecipient;
    uint256 public gasForOmniLzReceive = 350000;

    ICurrencyManager public currencyManager;
    IExecutionManager public executionManager;
    IRoyaltyFeeManager public royaltyFeeManager;
    ITransferSelectorNFT public transferSelectorNFT;
    IRemoteAddrManager public remoteAddrManager;
    IStargatePoolManager public stargatePoolManager;
    IFundManager public fundManager;

    mapping(address => uint256) public userMinOrderNonce;
    mapping(address => mapping(uint256 => bool)) private _isUserOrderNonceExecutedOrCancelled;

    event CancelAllOrders(address indexed user, uint256 newMinNonce);
    event CancelMultipleOrders(address indexed user, uint256[] orderNonces);
    event NewCurrencyManager(address indexed currencyManager);
    event NewExecutionManager(address indexed executionManager);
    event NewProtocolFeeRecipient(address indexed protocolFeeRecipient);
    event NewRoyaltyFeeManager(address indexed royaltyFeeManager);
    event NewTransferSelectorNFT(address indexed transferSelectorNFT);

    event RoyaltyPayment(
        address indexed collection,
        uint256 indexed tokenId,
        address indexed royaltyRecipient,
        address currency,
        uint256 amount
    );

    event TakerAsk(
        bytes32 orderHash, // bid hash of the maker order
        uint256 orderNonce, // user order nonce
        address indexed taker, // sender address for the taker ask order
        address indexed maker, // maker address of the initial bid order
        address indexed strategy, // strategy that defines the execution
        address currency, // currency address
        address collection, // collection address
        uint256 tokenId, // tokenId transferred
        uint256 amount, // amount of tokens transferred
        uint256 price, // final transacted price
        uint16 makerChainId,  // chain id
        uint16 takerChainId  // chain id
    );

    event TakerBid(
        bytes32 orderHash, // ask hash of the maker order
        uint256 orderNonce, // user order nonce
        address indexed taker, // sender address for the taker bid order
        address indexed maker, // maker address of the initial ask order
        address indexed strategy, // strategy that defines the execution
        address currency, // currency address
        address collection, // collection address
        uint256 tokenId, // tokenId transferred
        uint256 amount, // amount of tokens transferred
        uint256 price, // final transacted price
        uint16 makerChainId,  // chain id
        uint16 takerChainId  // chain id
    );

    /**
     * @notice Constructor
     * @param _currencyManager currency manager address
     * @param _executionManager execution manager address
     * @param _royaltyFeeManager royalty fee manager address
     * @param _WETH wrapped ether address (for other chains, use wrapped native asset)
     * @param _protocolFeeRecipient protocol fee recipient
     */
    constructor(
        address _currencyManager,
        address _executionManager,
        address _royaltyFeeManager,
        address _WETH,
        address _protocolFeeRecipient,
        address _lzEndpoint
    ) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) NonblockingLzApp(_lzEndpoint)
    {
        currencyManager = ICurrencyManager(_currencyManager);
        executionManager = IExecutionManager(_executionManager);
        royaltyFeeManager = IRoyaltyFeeManager(_royaltyFeeManager);
        WETH = _WETH;
        protocolFeeRecipient = _protocolFeeRecipient;
    }

    /**
    * @notice set remote address manager
    */
    function setRemoteAddrManager(address manager) external onlyOwner {
        remoteAddrManager = IRemoteAddrManager(manager);
    }

    /**
    * @notice set stargate pool manager
    */
    function setStargatePoolManager(address manager) external onlyOwner {
        stargatePoolManager = IStargatePoolManager(manager);
    }

    /**
    * @notice set fund manager
    */
    function setFundManager(address manager) external onlyOwner {
        fundManager = IFundManager(manager);
    }

    /**
    * @notice set gas for omni destination layerzero receive
    */
    function setGasForOmniLZReceive(uint256 gas) external onlyOwner {
        gasForOmniLzReceive = gas;
    }

    /**
     * @notice Cancel all pending orders for a sender
     * @param minNonce minimum user nonce
     */
    function cancelAllOrdersForSender(uint256 minNonce) external {
        require(minNonce > userMinOrderNonce[msg.sender], "Cancel: Order nonce lower than current");
        require(minNonce < userMinOrderNonce[msg.sender] + 500000, "Cancel: Cannot cancel more orders");
        userMinOrderNonce[msg.sender] = minNonce;

        emit CancelAllOrders(msg.sender, minNonce);
    }

    /**
     * @notice Cancel maker orders
     * @param orderNonces array of order nonces
     */
    function cancelMultipleMakerOrders(uint256[] calldata orderNonces) external {
        require(orderNonces.length > 0, "Cancel: Cannot be empty");

        for (uint256 i = 0; i < orderNonces.length; i++) {
            require(orderNonces[i] >= userMinOrderNonce[msg.sender], "Cancel: Order nonce lower than current");
            _isUserOrderNonceExecutedOrCancelled[msg.sender][orderNonces[i]] = true;
        }

        emit CancelMultipleOrders(msg.sender, orderNonces);
    }

    /**
     * @notice Match ask with a taker bid order using ETH
     * @param takerBid taker bid order
     * @param makerAsk maker ask order
     */
    function matchAskWithTakerBidUsingETHAndWETH(
        OrderTypes.TakerOrder calldata takerBid,
        OrderTypes.MakerOrder calldata makerAsk
    ) external payable override nonReentrant {
        require((makerAsk.isOrderAsk) && (!takerBid.isOrderAsk), "Order: Wrong sides");
        require(makerAsk.currency == WETH, "Order: Currency must be WETH");
        require(msg.sender == takerBid.taker, "Order: Taker must be the sender");

        // Check the maker ask order
        bytes32 askHash = makerAsk.hash();
        _validateOrder(makerAsk, askHash);

        // maker chain id
        (uint16 fromChainId) = makerAsk.decodeParams();
        (uint16 toChainId) = takerBid.decodeParams();

        // validate value
        uint256 totalValue = takerBid.price + _getLzFeesWETH(takerBid, makerAsk, fromChainId);
        // If not enough ETH to cover the price, use WETH
        if (totalValue > msg.value) {
            IERC20(WETH).safeTransferFrom(takerBid.taker, address(this), (totalValue - msg.value));
        } else {
            require(totalValue == msg.value, "Order: Msg.value too high");
        }

        // Wrap ETH sent to this contract
        IWETH(WETH).deposit{value: msg.value}();

        // check strategy and currency remote address
        _checkRemoteAddrWhitelisted(makerAsk, fromChainId);

        // Retrieve execution parameters
        // _canExecuteTakerBid(takerBid, makerAsk, fromChainId);

        // Update maker ask order status to true (prevents replay)
        _isUserOrderNonceExecutedOrCancelled[makerAsk.signer][makerAsk.nonce] = true;

        // Execution part 1/2
        _transferFeesAndFundsLzWithWETH(takerBid, makerAsk, fromChainId);

        // Execution part 2/2
        _transferNonFungibleTokenLz(takerBid, makerAsk, fromChainId, toChainId, true);

        emit TakerBid(
            askHash,
            makerAsk.nonce,
            takerBid.taker,
            makerAsk.signer,
            makerAsk.strategy,
            makerAsk.currency,
            makerAsk.collection,
            makerAsk.tokenId,
            makerAsk.amount,
            takerBid.price,
            fromChainId,
            toChainId
        );
    }

    /**
     * @notice get layerzero fees for matching a takerBid with a matchAsk using ETH and WETH
     * @param takerBid taker bid order
     * @param makerAsk maker ask order
     */
    function getLzFeesForAskWithTakerBidWETH(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk)
        external
        view
        returns (uint256)
    {
        require((makerAsk.isOrderAsk) && (!takerBid.isOrderAsk), "Order: Wrong sides");
        
        (uint16 fromChainId) = makerAsk.decodeParams();
        address collection = remoteAddrManager.checkRemoteAddress(makerAsk.collection, fromChainId);

        uint256 nftFee = _lzFeeTransferNFT(
            makerAsk.collection, collection, makerAsk.signer, takerBid.taker, makerAsk.tokenId, makerAsk.amount, fromChainId, true);

        return nftFee;
    }

    /**
     * @notice Match a takerBid with a matchAsk
     * @param takerBid taker bid order
     * @param makerAsk maker ask order
     */
    function matchAskWithTakerBid(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk)
        external
        payable
        override
        nonReentrant
    {
        require((makerAsk.isOrderAsk) && (!takerBid.isOrderAsk), "Order: Wrong sides");
        require(msg.sender == takerBid.taker, "Order: Taker must be the sender");

        // Check the maker ask order
        bytes32 askHash = makerAsk.hash();
        _validateOrder(makerAsk, askHash);

        (uint16 fromChainId) = makerAsk.decodeParams();
        (uint16 toChainId) = takerBid.decodeParams();

        // check fees
        _validateLzFees(takerBid, makerAsk, fromChainId, toChainId, true);

        // check strategy and currency remote address
        _checkRemoteAddrWhitelisted(makerAsk, fromChainId);

        // Retrieve execution parameters
        // _canExecuteTakerBid(takerBid, makerAsk, fromChainId);

        // Update maker ask order status to true (prevents replay)
        _isUserOrderNonceExecutedOrCancelled[makerAsk.signer][makerAsk.nonce] = true;

        // Execution part 1/2
        _transferFeesAndFundsLz(takerBid, makerAsk, fromChainId, toChainId);

        // Execution part 2/2
        _transferNonFungibleTokenLz(takerBid, makerAsk, fromChainId, toChainId, true);

        emit TakerBid(
            askHash,
            makerAsk.nonce,
            takerBid.taker,
            makerAsk.signer,
            makerAsk.strategy,
            makerAsk.currency,
            makerAsk.collection,
            makerAsk.tokenId,
            makerAsk.amount,
            takerBid.price,
            fromChainId,
            toChainId
        );
    }

    /**
     * @notice get layerzero fees for matching a takerBid with a makerAsk
     * @param takerBid taker bid order
     * @param makerAsk maker ask order
     */
    function getLzFeesForAskWithTakerBid(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk)
        external
        view
        returns (uint256)
    {
        require((makerAsk.isOrderAsk) && (!takerBid.isOrderAsk), "Order: Wrong sides");

        (uint16 fromChainId) = makerAsk.decodeParams();
        (uint16 toChainId) = takerBid.decodeParams();
        address collection = remoteAddrManager.checkRemoteAddress(makerAsk.collection, fromChainId);
        address currency = remoteAddrManager.checkRemoteAddress(makerAsk.currency, fromChainId);

        uint256 currencyFee = fundManager.lzFeeTransferCurrency(
            address(currencyManager),
            address(stargatePoolManager),
            currency,
            makerAsk.signer,
            takerBid.price,
            fromChainId,
            toChainId
        );

        uint256 nftFee = _lzFeeTransferNFT(
            makerAsk.collection, collection, makerAsk.signer, takerBid.taker, makerAsk.tokenId, makerAsk.amount, fromChainId, true);

        return (currencyFee + nftFee);
    }

    /**
     * @notice Match a takerAsk with a makerBid
     *         This function is being used for auction and be called on maker chain.
     * @param takerAsk seller
     * @param makerBid bidder
     */
    function matchBidWithTakerAsk(OrderTypes.TakerOrder calldata takerAsk, OrderTypes.MakerOrder calldata makerBid)
        external
        payable
        override
        nonReentrant
    {
        require((!makerBid.isOrderAsk) && (takerAsk.isOrderAsk), "Order: Wrong sides");
        require(msg.sender == takerAsk.taker, "Order: Taker must be the sender");

        // Check the maker bid order
        bytes32 bidHash = makerBid.hash();
        _validateOrder(makerBid, bidHash);

        (uint16 toChainId) = makerBid.decodeParams();
        (uint16 fromChainId) = takerAsk.decodeParams();

        _validateLzFees(takerAsk, makerBid, toChainId, fromChainId, false);

        // Retrieve execution parameters
        // _canExecuteTakerAsk(takerAsk, makerBid);

        // Update maker bid order status to true (prevents replay)
        _isUserOrderNonceExecutedOrCancelled[makerBid.signer][makerBid.nonce] = true;

        // Execution part 1/2
        _transferNonFungibleTokenLz(takerAsk, makerBid, toChainId, fromChainId, false);

        // Execution part 2/2
        _transferFeesAndFundsBidLz(takerAsk, makerBid, fromChainId, toChainId);

        emit TakerAsk(
            bidHash,
            makerBid.nonce,
            takerAsk.taker,
            makerBid.signer,
            makerBid.strategy,
            makerBid.currency,
            makerBid.collection,
            makerBid.tokenId,
            makerBid.amount,
            takerAsk.price,
            fromChainId,
            toChainId
        );
    }

    /**
     * @notice get layerzero fees for matching a takerAsk with a makerBid
     * @param takerAsk taker ask order
     * @param makerBid maker bid order
     */
    function getLzFeesForBidWithTakerAsk(OrderTypes.TakerOrder calldata takerAsk, OrderTypes.MakerOrder calldata makerBid)
        external
        view
        returns (uint256)
    {
        require((!makerBid.isOrderAsk) && (takerAsk.isOrderAsk), "Order: Wrong sides");

        (uint16 fromChainId) = makerBid.decodeParams();
        (uint16 toChainId) = takerAsk.decodeParams();
        address collection = remoteAddrManager.checkRemoteAddress(makerBid.collection, fromChainId);
        address currency = remoteAddrManager.checkRemoteAddress(makerBid.currency, fromChainId);

        uint256 currencyFee = fundManager.lzFeeTransferCurrency(
            address(currencyManager),
            address(stargatePoolManager),
            currency,
            makerBid.signer,
            takerAsk.price,
            fromChainId,
            toChainId
        );

        uint256 nftFee = _lzFeeTransferNFT(
            makerBid.collection, collection, makerBid.signer, takerAsk.taker, makerBid.tokenId, makerBid.amount, fromChainId, false);

        return (currencyFee + nftFee);
    }

    /**
     * @notice Update currency manager
     * @param _currencyManager new currency manager address
     */
    function updateCurrencyManager(address _currencyManager) external onlyOwner {
        require(_currencyManager != address(0), "Owner: Cannot be null address");
        currencyManager = ICurrencyManager(_currencyManager);
        emit NewCurrencyManager(_currencyManager);
    }

    /**
     * @notice Update execution manager
     * @param _executionManager new execution manager address
     */
    function updateExecutionManager(address _executionManager) external onlyOwner {
        require(_executionManager != address(0), "Owner: Cannot be null address");
        executionManager = IExecutionManager(_executionManager);
        emit NewExecutionManager(_executionManager);
    }

    /**
     * @notice Update protocol fee and recipient
     * @param _protocolFeeRecipient new recipient for protocol fees
     */
    function updateProtocolFeeRecipient(address _protocolFeeRecipient) external onlyOwner {
        protocolFeeRecipient = _protocolFeeRecipient;
        emit NewProtocolFeeRecipient(_protocolFeeRecipient);
    }

    /**
     * @notice Update royalty fee manager
     * @param _royaltyFeeManager new fee manager address
     */
    function updateRoyaltyFeeManager(address _royaltyFeeManager) external onlyOwner {
        require(_royaltyFeeManager != address(0), "Owner: Cannot be null address");
        royaltyFeeManager = IRoyaltyFeeManager(_royaltyFeeManager);
        emit NewRoyaltyFeeManager(_royaltyFeeManager);
    }

    /**
     * @notice Update transfer selector NFT
     * @param _transferSelectorNFT new transfer selector address
     */
    function updateTransferSelectorNFT(address _transferSelectorNFT) external onlyOwner {
        require(_transferSelectorNFT != address(0), "Owner: Cannot be null address");
        transferSelectorNFT = ITransferSelectorNFT(_transferSelectorNFT);

        emit NewTransferSelectorNFT(_transferSelectorNFT);
    }

    /**
     * @notice Check whether user order nonce is executed or cancelled
     * @param user address of user
     * @param orderNonce nonce of the order
     */
    function isUserOrderNonceExecutedOrCancelled(address user, uint256 orderNonce) external view returns (bool) {
        return _isUserOrderNonceExecutedOrCancelled[user][orderNonce];
    }

    function _getFeesAndFunds(
        address strategy,
        address collection,
        uint256 tokenId,
        uint256 amount
    ) internal view returns(uint256, uint256, uint256, address) {
        return fundManager.getFeesAndFunds(
            address(royaltyFeeManager),
            strategy,
            collection,
            protocolFeeRecipient,
            tokenId,
            amount
        );
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
    function _transferFeesAndFunds(
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
    ) internal {
        // Initialize the final amount that is transferred to seller
        (
            uint256 protocolFeeAmount,
            uint256 royaltyFeeAmount,
            uint256 finalSellerAmount,
            address royaltyFeeRecipient
        ) = _getFeesAndFunds(strategy, collection, tokenId, amount);

        // 1. Protocol fee
        {
            // Check if the protocol fee is different than 0 for this strategy
            if ((protocolFeeRecipient != address(0)) && (protocolFeeAmount != 0)) {
                IERC20(currency).safeTransferFrom(from, protocolFeeRecipient, protocolFeeAmount);
            }
        }

        // 2. Royalty fee
        {
            // Check if there is a royalty fee and that it is different to 0
            if ((royaltyFeeRecipient != address(0)) && (royaltyFeeAmount != 0)) {
                IERC20(currency).safeTransferFrom(from, royaltyFeeRecipient, royaltyFeeAmount);

                emit RoyaltyPayment(collection, tokenId, royaltyFeeRecipient, currency, royaltyFeeAmount);
            }
        }

        require((finalSellerAmount * 10000) >= (minPercentageToAsk * amount), "Fees: Higher than expected");

        // 3. Transfer final amount (post-fees) to seller
        {
            fundManager.transferCurrency{value: 0}(
                address(currencyManager),
                address(stargatePoolManager),
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
    function _transferFeesAndFundsWithWETH(
        address strategy,
        address collection,
        uint256 tokenId,
        address to,
        uint256 amount,
        uint256 minPercentageToAsk
    ) internal {
        // Initialize the final amount that is transferred to seller
        (
            uint256 protocolFeeAmount,
            uint256 royaltyFeeAmount,
            uint256 finalSellerAmount,
            address royaltyFeeRecipient
        ) = _getFeesAndFunds(strategy, collection, tokenId, amount);

        // 1. Protocol fee
        {
            // Check if the protocol fee is different than 0 for this strategy
            if ((protocolFeeRecipient != address(0)) && (protocolFeeAmount != 0)) {
                IERC20(WETH).safeTransfer(protocolFeeRecipient, protocolFeeAmount);
            }
        }

        // 2. Royalty fee
        {
            // Check if there is a royalty fee and that it is different to 0
            if ((royaltyFeeRecipient != address(0)) && (royaltyFeeAmount != 0)) {
                IERC20(WETH).safeTransfer(royaltyFeeRecipient, royaltyFeeAmount);

                emit RoyaltyPayment(collection, tokenId, royaltyFeeRecipient, address(WETH), royaltyFeeAmount);
            }
        }

        require((finalSellerAmount * 10000) >= (minPercentageToAsk * amount), "Fees: Higher than expected");

        // 3. Transfer final amount (post-fees) to seller
        {
            IERC20(WETH).safeTransfer(to, finalSellerAmount);
        }
    }

    /**
     * @notice Transfer NFT
     * @param collectionFrom address of the token collection on from chain
     * @param collectionTo address of the token collection on current chain
     * @param from address of the sender
     * @param to address of the recipient
     * @param tokenId tokenId
     * @param amount amount of tokens (1 for ERC721, 1+ for ERC1155)
     * @dev For ERC721, amount is not used
     */
    function _transferNonFungibleToken(
        address collectionFrom,
        address collectionTo,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 fromChainId,
        bool remoteSend
    ) internal {
        // Retrieve the transfer manager address
        address transferManager = transferSelectorNFT.checkTransferManagerForToken(remoteSend ? collectionTo : collectionFrom);

        // If no transfer manager found, it returns address(0)
        require(transferManager != address(0), "Transfer: No NFT transfer manager available");

        // If one is found, transfer the token
        (uint256 lzFee, ) = ITransferManagerNFT(transferManager).estimateSendFee(collectionFrom, collectionTo, from, to, tokenId, amount, fromChainId, remoteSend);

        ITransferManagerNFT(transferManager).transferNonFungibleToken{value: lzFee}(collectionFrom, collectionTo, from, to, tokenId, amount, fromChainId, remoteSend);
    }

    /**
     * @notice Verify the validity of the maker order
     * @param makerOrder maker order
     * @param orderHash computed hash for the order
     */
    function _validateOrder(OrderTypes.MakerOrder calldata makerOrder, bytes32 orderHash) internal view {
        // Verify whether order nonce has expired
        require(
            (!_isUserOrderNonceExecutedOrCancelled[makerOrder.signer][makerOrder.nonce]) &&
                (makerOrder.nonce >= userMinOrderNonce[makerOrder.signer]),
            "Order: Matching order expired"
        );

        makerOrder.checkValid(orderHash);
    }

    function _checkRemoteAddrWhitelisted(OrderTypes.MakerOrder calldata makerOrder, uint16 chainId) internal view {
        // Verify whether the currency is whitelisted
        // address currency = remoteAddrManager.checkRemoteAddress(makerOrder.currency, chainId);
        // require(currencyManager.isCurrencyWhitelisted(currency), "Currency: Not whitelisted");

        // // Verify whether strategy can be executed
        // address strategy = remoteAddrManager.checkRemoteAddress(makerOrder.strategy, chainId);
        // require(executionManager.isStrategyWhitelisted(strategy), "Strategy: Not whitelisted");
    }

    // function _canExecuteTakerBid(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk, uint16 chainId) 
    //     internal view returns (uint256, uint256) {
    //     address strategy = remoteAddrManager.checkRemoteAddress(makerAsk.strategy, chainId);
    //     (bool isExecutionValid, uint256 tokenId, uint256 amount) = IExecutionStrategy(strategy)
    //         .canExecuteTakerBid(takerBid, makerAsk);

    //     require(isExecutionValid, "Strategy: Execution invalid");

    //     return (tokenId, amount);
    // }

    function _transferFeesAndFundsLzWithWETH(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk, uint16 chainId) internal {
        address strategy = remoteAddrManager.checkRemoteAddress(makerAsk.strategy, chainId);
        address collection = remoteAddrManager.checkRemoteAddress(makerAsk.collection, chainId);

        _transferFeesAndFundsWithWETH(
            strategy,
            collection,
            makerAsk.tokenId,
            makerAsk.signer,
            takerBid.price,
            makerAsk.minPercentageToAsk
        );
    }

    function _transferFeesAndFundsLz(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk, uint16 fromChainId, uint16 toChainId) internal {
        // if fromChainId and toChainId is same, checkRemoteAddress returns same
        address strategy = remoteAddrManager.checkRemoteAddress(makerAsk.strategy, fromChainId);
        address collection = remoteAddrManager.checkRemoteAddress(makerAsk.collection, fromChainId);
        address currency = remoteAddrManager.checkRemoteAddress(makerAsk.currency, fromChainId);

        _transferFeesAndFunds(
            strategy,
            collection,
            makerAsk.tokenId,
            currency,
            takerBid.taker,
            makerAsk.signer,
            takerBid.price,
            makerAsk.minPercentageToAsk,
            fromChainId,
            toChainId
        );
    }

    function _transferNonFungibleTokenLz(OrderTypes.TakerOrder calldata takerOrder, OrderTypes.MakerOrder calldata makerOrder, uint16 fromChainId, uint16 toChainId, bool remoteSend) internal {
        // if fromChainId and toChainId is same, collection is makerOrder.collection
        address collection = remoteAddrManager.checkRemoteAddress(makerOrder.collection, fromChainId);
        address from = remoteSend ? makerOrder.signer : takerOrder.taker;
        address to = remoteSend ? takerOrder.taker : makerOrder.signer;

        _transferNonFungibleToken(
            makerOrder.collection,
            collection,
            from,
            to,
            makerOrder.tokenId,
            makerOrder.amount,
            fromChainId,
            remoteSend
        );
    }

    function _lzFeeTransferNFT(
        address collectionFrom,
        address collectionTo,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 fromChainId,
        bool remoteSend
    ) internal view returns(uint256) {
        address transferManager = transferSelectorNFT.checkTransferManagerForToken(remoteSend ? collectionFrom : collectionTo);

        if (transferManager == address(0)) {
            return 0;
        }

        // If one is found, transfer the token
        (uint256 messageFee, ) = ITransferManagerNFT(transferManager).estimateSendFee(collectionFrom, collectionTo, from, to, tokenId, amount, fromChainId, remoteSend);
        return messageFee;
    }

    function _validateLzFees(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk, uint16 fromChainId, uint16 toChainId, bool remoteSend) internal {
        address collection = remoteAddrManager.checkRemoteAddress(makerAsk.collection, fromChainId);
        address currency = remoteAddrManager.checkRemoteAddress(makerAsk.currency, fromChainId);

        uint256 currencyFee = fundManager.lzFeeTransferCurrency(
            address(currencyManager),
            address(stargatePoolManager),
            currency,
            makerAsk.signer,
            takerBid.price,
            fromChainId,
            toChainId
        );
        uint256 nftFee = _lzFeeTransferNFT(
            makerAsk.collection, collection, makerAsk.signer, takerBid.taker, makerAsk.tokenId, makerAsk.amount, fromChainId, remoteSend);
        
        require (currencyFee + nftFee <= msg.value, "insufficient value");
    }

    function _getLzFeesWETH(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk, uint16 fromChainId) internal view returns(uint256) {
        address collection = remoteAddrManager.checkRemoteAddress(makerAsk.collection, fromChainId);

        uint256 nftFee = _lzFeeTransferNFT(
            makerAsk.collection, collection, makerAsk.signer, takerBid.taker, makerAsk.tokenId, makerAsk.amount, fromChainId, true);
        
        return nftFee;
    }
    // function _canExecuteTakerAsk(OrderTypes.TakerOrder calldata takerAsk, OrderTypes.MakerOrder calldata makerBid) 
    //     internal view returns (uint256, uint256) {
    //     (bool isExecutionValid, uint256 tokenId, uint256 amount) = IExecutionStrategy(makerBid.strategy)
    //         .canExecuteTakerAsk(takerAsk, makerBid);

    //     require(isExecutionValid, "Strategy: Execution invalid");

    //     return (tokenId, amount);
    // }

    function _transferFeesAndFundsBidLz(OrderTypes.TakerOrder calldata takerAsk, OrderTypes.MakerOrder calldata makerBid, uint16 fromChainId, uint16 toChainId) internal {
        if (fromChainId == toChainId) {
            _transferFeesAndFunds(
                makerBid.strategy,
                makerBid.collection,
                makerBid.tokenId,
                makerBid.currency,
                makerBid.signer,
                takerAsk.taker,
                takerAsk.price,
                makerBid.minPercentageToAsk,
                toChainId,
                fromChainId
            );
        }
        else {
            require(trustedRemoteLookup[toChainId].length != 0, "LzSend: destination chain is not a trusted source.");

            address strategy = remoteAddrManager.checkRemoteAddress(makerBid.strategy, toChainId);
            address collection = remoteAddrManager.checkRemoteAddress(makerBid.collection, toChainId);
            address currency = remoteAddrManager.checkRemoteAddress(makerBid.currency, toChainId);

            bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, gasForOmniLzReceive);
            bytes memory payload = abi.encode(strategy, collection, currency, makerBid.signer, takerAsk.taker, makerBid.tokenId, takerAsk.price, takerAsk.minPercentageToAsk);

            (uint256 messageFee,) = lzEndpoint.estimateFees(toChainId, address(this), payload, false, adapterParams);
            lzEndpoint.send{value: messageFee}(toChainId, trustedRemoteLookup[toChainId], payload, payable(msg.sender), address(0), adapterParams);
        }
    }

    /**
     * @notice message listener from LayerZero endpoint
     * @param _srcChainId chain id where the message was sent from
     * @param _payload message data
     * @dev no need to change this function
     */
    function _nonblockingLzReceive(uint16 _srcChainId, bytes memory, uint64, bytes memory _payload) internal virtual override {
        // decode and load the toAddress
        // uint64 nonce = _nonce;
        (address strategy, address collection, address currency, address from, address to, uint tokenId, uint price, uint minPercentageToAsk) = 
            abi.decode(_payload, (address, address, address, address, address, uint, uint, uint));
        uint16 fromChainId = _srcChainId;
        uint16 toChainId = lzEndpoint.getChainId();
        // if the toAddress is 0x0, convert to dead address, or it will get cached
        if (to == address(0x0)) to == address(0xdEaD);
        
        _transferFeesAndFunds(
            strategy,
            collection,
            tokenId,
            currency,
            from,
            to,
            price,
            minPercentageToAsk,
            fromChainId,
            toChainId
        );
    }

    receive() external payable {
        // nothing to do
    }
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}