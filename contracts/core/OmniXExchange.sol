// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// OpenZeppelin contracts
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712, ECDSA} from "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

// OmniX interfaces
import {ICurrencyManager} from "../interfaces/ICurrencyManager.sol";
import {IExecutionManager} from "../interfaces/IExecutionManager.sol";
import {IExecutionStrategy} from "../interfaces/IExecutionStrategy.sol";
import {IRoyaltyFeeManager} from "../interfaces/IRoyaltyFeeManager.sol";
import {ITransferManagerNFT} from "../interfaces/ITransferManagerNFT.sol";
import {ITransferSelectorNFT} from "../interfaces/ITransferSelectorNFT.sol";
import {IRemoteAddrManager} from "../interfaces/IRemoteAddrManager.sol";
import {IOmniXExchange} from "../interfaces/IOmniXExchange.sol";
import {IWETH} from "../interfaces/IWETH.sol";
import {IOFT} from "../token/oft/IOFT.sol";

import {OrderTypes} from "../libraries/OrderTypes.sol";

import "hardhat/console.sol";

/**
 * @title OmniXExchange
 * @notice It is the core contract of the OmniX exchange.
 */
contract OmniXExchange is EIP712, IOmniXExchange, ReentrancyGuard, Ownable {
    string private constant SIGNING_DOMAIN = "OmniXExchange";
    string private constant SIGNATURE_VERSION = "1";

    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    using OrderTypes for OrderTypes.MakerOrder;
    using OrderTypes for OrderTypes.TakerOrder;

    address public immutable WETH;

    address public protocolFeeRecipient;

    ICurrencyManager public currencyManager;
    IExecutionManager public executionManager;
    IRoyaltyFeeManager public royaltyFeeManager;
    ITransferSelectorNFT public transferSelectorNFT;
    IRemoteAddrManager public remoteAddrManager;

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
        address _protocolFeeRecipient
    ) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) 
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
    function setRemoteAddrManager(address manager) external {
        remoteAddrManager = IRemoteAddrManager(manager);
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

        // If not enough ETH to cover the price, use WETH
        if (takerBid.price > msg.value) {
            IERC20(WETH).safeTransferFrom(msg.sender, address(this), (takerBid.price - msg.value));
        } else {
            require(takerBid.price == msg.value, "Order: Msg.value too high");
        }

        // Wrap ETH sent to this contract
        IWETH(WETH).deposit{value: msg.value}();

        // Check the maker ask order
        bytes32 askHash = makerAsk.hash();
        _validateOrder(makerAsk, askHash);

        // maker chain id
        (uint16 fromChainId) = makerAsk.decodeParams();
        (uint16 toChainId) = takerBid.decodeParams();

        // check strategy and currency remote address
        _checkRemoteAddrWhitelisted(makerAsk, fromChainId);

        // Retrieve execution parameters
        _canExecuteTakerBid(takerBid, makerAsk, fromChainId);

        // Update maker ask order status to true (prevents replay)
        _isUserOrderNonceExecutedOrCancelled[makerAsk.signer][makerAsk.nonce] = true;

        // Execution part 1/2
        _transferFeesAndFundsLzWithWETH(takerBid, makerAsk, fromChainId);

        // Execution part 2/2
        _transferNonFungibleTokenLz(takerBid, makerAsk, fromChainId);

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
     * @notice Match a takerBid with a matchAsk
     * @param takerBid taker bid order
     * @param makerAsk maker ask order
     */
    function matchAskWithTakerBid(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk)
        external
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

        // check strategy and currency remote address
        _checkRemoteAddrWhitelisted(makerAsk, fromChainId);

        // Retrieve execution parameters
        _canExecuteTakerBid(takerBid, makerAsk, fromChainId);

        // Update maker ask order status to true (prevents replay)
        _isUserOrderNonceExecutedOrCancelled[makerAsk.signer][makerAsk.nonce] = true;

        // Execution part 1/2
        _transferFeesAndFundsLz(takerBid, makerAsk, fromChainId);

        // Execution part 2/2
        _transferNonFungibleTokenLz(takerBid, makerAsk, fromChainId);

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
     * @notice Match a takerAsk with a makerBid
     * @param takerAsk taker ask order
     * @param makerBid maker bid order
     */
    // function matchBidWithTakerAsk(OrderTypes.TakerOrder calldata takerAsk, OrderTypes.MakerOrder calldata makerBid)
    //     external
    //     override
    //     nonReentrant
    // {
    //     require((!makerBid.isOrderAsk) && (takerAsk.isOrderAsk), "Order: Wrong sides");
    //     require(msg.sender == takerAsk.taker, "Order: Taker must be the sender");

    //     // Check the maker bid order
    //     bytes32 bidHash = makerBid.hash();
    //     _validateOrder(makerBid, bidHash);

    //     (uint16 fromChainId) = makerBid.decodeParams();
        
    //     // check strategy and currency remote address
    //     _checkRemoteAddrWhitelisted(makerBid, fromChainId);

    //     // Retrieve execution parameters
    //     _canExecuteTakerAsk(takerAsk, makerBid, fromChainId);

    //     // Update maker bid order status to true (prevents replay)
    //     _isUserOrderNonceExecutedOrCancelled[makerBid.signer][makerBid.nonce] = true;

    //     // Execution part 1/2
    //     _transferNonFungibleTokenBidLz(takerAsk, makerBid, fromChainId);

    //     // Execution part 2/2
    //     _transferFeesAndFundsBidLz(takerAsk, makerBid, fromChainId);

    //     emit TakerAsk(
    //         bidHash,
    //         makerBid.nonce,
    //         takerAsk.taker,
    //         makerBid.signer,
    //         makerBid.strategy,
    //         makerBid.currency,
    //         makerBid.collection,
    //         makerBid.tokenId,
    //         makerBid.amount,
    //         takerAsk.price,
    //         fromChainId,
    //         uint16(block.chainid)
    //     );
    // }

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
        uint16 toChainId
    ) internal {
        // Initialize the final amount that is transferred to seller
        uint256 finalSellerAmount = amount;

        // 1. Protocol fee
        {
            uint256 protocolFeeAmount = _calculateProtocolFee(strategy, amount);

            // Check if the protocol fee is different than 0 for this strategy
            if ((protocolFeeRecipient != address(0)) && (protocolFeeAmount != 0)) {
                IERC20(currency).safeTransferFrom(from, protocolFeeRecipient, protocolFeeAmount);
                finalSellerAmount -= protocolFeeAmount;
            }
        }

        // 2. Royalty fee
        {
            (address royaltyFeeRecipient, uint256 royaltyFeeAmount) = royaltyFeeManager
                .calculateRoyaltyFeeAndGetRecipient(collection, tokenId, amount);

            // Check if there is a royalty fee and that it is different to 0
            if ((royaltyFeeRecipient != address(0)) && (royaltyFeeAmount != 0)) {
                IERC20(currency).safeTransferFrom(from, royaltyFeeRecipient, royaltyFeeAmount);
                finalSellerAmount -= royaltyFeeAmount;

                emit RoyaltyPayment(collection, tokenId, royaltyFeeRecipient, currency, royaltyFeeAmount);
            }
        }

        require((finalSellerAmount * 10000) >= (minPercentageToAsk * amount), "Fees: Higher than expected");

        // 3. Transfer final amount (post-fees) to seller
        {
            _transferCurrency(currency, from, to, finalSellerAmount, toChainId);
        }
    }

    function _transferCurrency(
        address currency,
        address from,
        address to,
        uint256 amount,
        uint16 toChainId
    ) internal {
        if (currencyManager.isOmniCurrency(currency)) {
            bytes memory toAddress = abi.encodePacked(to);
        
            IOFT(currency).sendFrom{value: 0}(
                from, toChainId, toAddress, amount, payable(0), address(0), bytes("")
            );
        }
        else {
            IERC20(currency).safeTransferFrom(from, to, amount);
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
        uint256 finalSellerAmount = amount;

        // 1. Protocol fee
        {
            uint256 protocolFeeAmount = _calculateProtocolFee(strategy, amount);

            // Check if the protocol fee is different than 0 for this strategy
            if ((protocolFeeRecipient != address(0)) && (protocolFeeAmount != 0)) {
                IERC20(WETH).safeTransfer(protocolFeeRecipient, protocolFeeAmount);
                finalSellerAmount -= protocolFeeAmount;
            }
        }

        // 2. Royalty fee
        {
            (address royaltyFeeRecipient, uint256 royaltyFeeAmount) = royaltyFeeManager
                .calculateRoyaltyFeeAndGetRecipient(collection, tokenId, amount);

            // Check if there is a royalty fee and that it is different to 0
            if ((royaltyFeeRecipient != address(0)) && (royaltyFeeAmount != 0)) {
                IERC20(WETH).safeTransfer(royaltyFeeRecipient, royaltyFeeAmount);
                finalSellerAmount -= royaltyFeeAmount;

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
        uint16 fromChainId
    ) internal {
        // Retrieve the transfer manager address
        address transferManager = transferSelectorNFT.checkTransferManagerForToken(collectionTo);

        // If no transfer manager found, it returns address(0)
        require(transferManager != address(0), "Transfer: No NFT transfer manager available");

        // If one is found, transfer the token
        ITransferManagerNFT(transferManager).transferNonFungibleToken(collectionFrom, collectionTo, from, to, tokenId, amount, fromChainId);
    }

    /**
     * @notice Calculate protocol fee for an execution strategy
     * @param executionStrategy strategy
     * @param amount amount to transfer
     */
    function _calculateProtocolFee(address executionStrategy, uint256 amount) internal view returns (uint256) {
        uint256 protocolFee = IExecutionStrategy(executionStrategy).viewProtocolFee();
        return (protocolFee * amount) / 10000;
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

    function _checkRemoteAddrWhitelisted(OrderTypes.MakerOrder calldata makerOrder, uint16 chainId) internal view {
        // Verify whether the currency is whitelisted
        address currency = remoteAddrManager.checkRemoteAddress(makerOrder.currency, chainId);
        require(currencyManager.isCurrencyWhitelisted(currency), "Currency: Not whitelisted");

        // Verify whether strategy can be executed
        address strategy = remoteAddrManager.checkRemoteAddress(makerOrder.strategy, chainId);
        require(executionManager.isStrategyWhitelisted(strategy), "Strategy: Not whitelisted");
    }

    function _canExecuteTakerBid(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk, uint16 chainId) 
        internal view returns (uint256, uint256) {
        address strategy = remoteAddrManager.checkRemoteAddress(makerAsk.strategy, chainId);
        (bool isExecutionValid, uint256 tokenId, uint256 amount) = IExecutionStrategy(strategy)
            .canExecuteTakerBid(takerBid, makerAsk);

        require(isExecutionValid, "Strategy: Execution invalid");

        return (tokenId, amount);
    }

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

    function _transferFeesAndFundsLz(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk, uint16 chainId) internal {
        address strategy = remoteAddrManager.checkRemoteAddress(makerAsk.strategy, chainId);
        address collection = remoteAddrManager.checkRemoteAddress(makerAsk.collection, chainId);
        address currency = remoteAddrManager.checkRemoteAddress(makerAsk.currency, chainId);

        _transferFeesAndFunds(
            strategy,
            collection,
            makerAsk.tokenId,
            currency,
            msg.sender,
            makerAsk.signer,
            takerBid.price,
            makerAsk.minPercentageToAsk,
            chainId
        );
    }

    function _transferNonFungibleTokenLz(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk, uint16 chainId) internal {
        address collection = remoteAddrManager.checkRemoteAddress(makerAsk.collection, chainId);

        _transferNonFungibleToken(
            makerAsk.collection,
            collection,
            makerAsk.signer,
            takerBid.taker,
            makerAsk.tokenId,
            makerAsk.amount,
            chainId
        );
    }

    // function _canExecuteTakerAsk(OrderTypes.TakerOrder calldata takerAsk, OrderTypes.MakerOrder calldata makerBid, uint16 chainId) 
    //     internal view returns (uint256, uint256) {
    //     address strategy = remoteAddrManager.checkRemoteAddress(makerBid.strategy, chainId);
    //     (bool isExecutionValid, uint256 tokenId, uint256 amount) = IExecutionStrategy(strategy)
    //         .canExecuteTakerAsk(takerAsk, makerBid);

    //     require(isExecutionValid, "Strategy: Execution invalid");

    //     return (tokenId, amount);
    // }

    // function _transferNonFungibleTokenBidLz(OrderTypes.TakerOrder calldata takerAsk, OrderTypes.MakerOrder calldata makerBid, uint16 chainId) internal {
    //     address collection = remoteAddrManager.checkRemoteAddress(makerBid.collection, chainId);

    //     _transferNonFungibleToken(
    //         collection,
    //         takerAsk.taker,
    //         makerBid.signer,
    //         makerBid.tokenId,
    //         makerBid.amount,
    //         chainId
    //     );
    // }

    // function _transferFeesAndFundsBidLz(OrderTypes.TakerOrder calldata takerAsk, OrderTypes.MakerOrder calldata makerBid, uint16 chainId) internal {
    //     address strategy = remoteAddrManager.checkRemoteAddress(makerBid.strategy, chainId);
    //     address collection = remoteAddrManager.checkRemoteAddress(makerBid.collection, chainId);
    //     address currency = remoteAddrManager.checkRemoteAddress(makerBid.currency, chainId);

    //     _transferFeesAndFunds(
    //         strategy,
    //         collection,
    //         makerBid.tokenId,
    //         currency,
    //         makerBid.signer,
    //         takerAsk.taker,
    //         takerAsk.price,
    //         makerBid.minPercentageToAsk,
    //         chainId
    //     );
    // }
}