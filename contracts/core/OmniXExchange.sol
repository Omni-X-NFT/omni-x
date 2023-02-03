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
import {IStargatePoolManager} from "../interfaces/IStargatePoolManager.sol";
import {IFundManager} from "../interfaces/IFundManager.sol";
import {IOmniXExchange} from "../interfaces/IOmniXExchange.sol";
import {NonblockingLzApp} from "../lzApp/NonblockingLzApp.sol";
import {IWETH} from "../interfaces/IWETH.sol";
import {IOFT} from "../token/oft/IOFT.sol";

import {OrderTypes} from "../libraries/OrderTypes.sol";
import {BytesLib} from "../libraries/BytesLib.sol";
import "hardhat/console.sol";

/**
 * @title OmniXExchange
 * @notice It is the core contract of the OmniX exchange.
 */
contract OmniXExchange is NonblockingLzApp, EIP712, IOmniXExchange, ReentrancyGuard {
    string private constant SIGNING_DOMAIN = "OmniXExchange";
    string private constant SIGNATURE_VERSION = "1";
    uint16 private constant LZ_ADAPTER_VERSION = 2;
    uint8 private constant LZ_MESSAGE_ORDER_ASK = 1;
    uint8 private constant LZ_MESSAGE_ORDER_BID = 2;
    uint8 private constant LZ_MESSAGE_ORDER_ASK_RESP = 3;
    uint8 private constant LZ_MESSAGE_ORDER_BID_RESP = 4;
    uint8 private constant RESP_OK = 1;
    uint8 private constant RESP_FAIL = 2;

    using SafeERC20 for IERC20;

    using OrderTypes for OrderTypes.MakerOrder;
    using OrderTypes for OrderTypes.TakerOrder;
    using BytesLib for bytes;

    address public immutable WETH;

    address public protocolFeeRecipient;
    uint256 public gasForOmniLzReceive = 900000;

    ICurrencyManager public currencyManager;
    IExecutionManager public executionManager;
    IRoyaltyFeeManager public royaltyFeeManager;
    ITransferSelectorNFT public transferSelectorNFT;
    IStargatePoolManager public stargatePoolManager;
    IFundManager public fundManager;

    mapping(address => mapping(uint16 => uint256)) public userMinOrderNonce;
    mapping(address => mapping(uint16 => mapping(uint256 => bool))) private _isUserOrderNonceExecutedOrCancelled;

    event CancelAllOrders(address indexed user, uint16 chainId, uint256 newMinNonce);
    event NewCurrencyManager(address indexed currencyManager);
    event NewExecutionManager(address indexed executionManager);
    event NewProtocolFeeRecipient(address indexed protocolFeeRecipient);
    event NewRoyaltyFeeManager(address indexed royaltyFeeManager);
    event NewTransferSelectorNFT(address indexed transferSelectorNFT);

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
    function cancelAllOrdersForSender(uint256 minNonce, uint16 lzChainId) onlyOwner external {
        userMinOrderNonce[msg.sender][lzChainId] = minNonce;

        emit CancelAllOrders(msg.sender, lzChainId, minNonce);
    }

    /**
     * @notice Match ask with a taker bid order using ETH
     * @param destAirdrop gas fee which is consumed by maker chain to transfer NFT and to send lz message to taker chain
     * @param takerBid taker bid order
     * @param makerAsk maker ask order
     */
    function matchAskWithTakerBidUsingETHAndWETH(
        uint destAirdrop,
        OrderTypes.TakerOrder calldata takerBid,
        OrderTypes.MakerOrder calldata makerAsk
    ) external payable override nonReentrant {
        require((makerAsk.isOrderAsk) && (!takerBid.isOrderAsk), "Order: Wrong sides");
        require(msg.sender == takerBid.taker, "Order: Taker must be the sender");

        // Check the maker ask order
        bytes32 askHash = makerAsk.hash();
        _validateOrder(makerAsk, askHash);

        (, address currency,,,) = takerBid.decodeParams();
        require(currency == WETH, "Order: Currency must be WETH");

        _canExecuteTakerBid(takerBid, makerAsk);

        (uint16 makerChainId) = makerAsk.decodeParams();
        (uint16 takerChainId,,,,) = takerBid.decodeParams();

        // validate value
        {
            // nft fee is zero
            (uint256 omnixFee, uint256 currencyFee,) = getLzFeesForTrading(takerBid, makerAsk, destAirdrop);

            uint256 totalValue = takerBid.price + omnixFee + currencyFee;

            require(totalValue <= msg.value, "Order: Msg.value too high");
            
            if (makerChainId == takerChainId) {
                _transferFeesAndFundsLzWithWETH(takerBid, makerAsk, currencyFee);
                _transferNFTLz(takerBid, makerAsk, 0);
            }
            else {
                uint proxyDataId = _proxyTransferFunds(takerBid, makerAsk, currencyFee + takerBid.price);
                _sendCrossMessage(takerBid, makerAsk, destAirdrop, proxyDataId);
            }
        }

        // Update maker ask order status to true (prevents replay)
        _isUserOrderNonceExecutedOrCancelled[makerAsk.signer][makerChainId][makerAsk.nonce] = true;

        emit TakerBid(
            askHash,
            makerAsk.nonce,
            takerBid.taker,
            makerAsk.signer,
            makerAsk.strategy,
            makerAsk.currency,
            makerAsk.collection,
            takerBid.tokenId,
            makerAsk.amount,
            takerBid.price,
            makerChainId,
            takerChainId
        );
    }

    /**
     * @notice Match a takerBid with a matchAsk
     * @param destAirdrop gas fee which is consumed by maker chain to transfer NFT and to send lz message to taker chain
     * @param takerBid taker bid order
     * @param makerAsk maker ask order
     */
    function matchAskWithTakerBid(uint destAirdrop, OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk)
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

        _canExecuteTakerBid(takerBid, makerAsk);

        (uint16 makerChainId) = makerAsk.decodeParams();
        (uint16 takerChainId,,,,) = takerBid.decodeParams();

        {
            // check fees, nft fee is zero
            (uint256 omnixFee, uint256 currencyFee, ) = getLzFeesForTrading(takerBid, makerAsk, destAirdrop);
            require (omnixFee+ currencyFee <= msg.value, "Order: Insufficient value");

            if (makerChainId == takerChainId) {
                _transferFeesAndFundsLz(takerBid, makerAsk, 0);
                _transferNFTLz(takerBid, makerAsk, 0);
            }
            else {
                // proxy transfer to dest FundManager.
                uint proxyDataId = _proxyTransferFunds(takerBid, makerAsk, currencyFee);
                // send cross message to dest TransferManager and do trading
                _sendCrossMessage(takerBid, makerAsk, destAirdrop, proxyDataId);

                // fundManager.processFunds(proxyDataId, 1);
            }
        }
        
        // Update maker ask order status to true (prevents replay)
        _isUserOrderNonceExecutedOrCancelled[makerAsk.signer][makerChainId][makerAsk.nonce] = true;

        emit TakerBid(
            askHash,
            makerAsk.nonce,
            takerBid.taker,
            makerAsk.signer,
            makerAsk.strategy,
            makerAsk.currency,
            makerAsk.collection,
            takerBid.tokenId,
            makerAsk.amount,
            takerBid.price,
            makerChainId,
            takerChainId
        );
    }

    /**
     * @notice get layerzero fees for matching a takerBid with a makerAsk
     * @param taker taker bid order
     * @param maker maker ask order
     * @return (omnixFee, fundManagerFee, nftTransferManagerFee)
     */
    function getLzFeesForTrading(OrderTypes.TakerOrder calldata taker, OrderTypes.MakerOrder calldata maker, uint destAirdrop)
        public
        view
        returns (uint256, uint256, uint256)
    {
        (uint16 makerChainId) = maker.decodeParams();
        (uint16 takerChainId, address currency, address collection,,) = taker.decodeParams();

        if (maker.isOrderAsk) {
            uint256 currencyFee = fundManager.lzFeeTransferCurrency(
                currency,
                maker.signer,
                taker.price,
                takerChainId,
                makerChainId
            );

            (uint256 omnixFee,, ) = _getCrossMessageFeedPayloadAsk(destAirdrop, 0, taker, maker);

            // on this taker chain, no NFT transfer fee
            // on the maker chain, there is transfer fee if using TransferManagerONFT
            // uint256 nftFee = 0;

            return (omnixFee, currencyFee, uint256(0));
        }
        else {
            uint256 nftFee = _lzFeeTransferNFT(
                collection,
                maker.collection,
                maker.signer,
                taker.taker,
                taker.tokenId,
                maker.amount,
                makerChainId,
                takerChainId
            );

            (uint256 omnixFee,, ) = _getCrossMessageFeedPayloadBid(destAirdrop, 0, taker, maker);

            // on this taker ask chain, no currency fee because currency transfer tx will be executed on the maker chain
            // on the maker bid chain, there is fee.
            // uint256 currencyFee = 0;

            return (omnixFee, uint256(0), nftFee);
        }
    }

    /**
     * @notice Match a takerAsk with a makerBid
     *         This function is being used for auction and be called on maker chain.
     * @param takerAsk seller
     * @param makerBid bidder
     */
    function matchBidWithTakerAsk(uint destAirdrop, OrderTypes.TakerOrder calldata takerAsk, OrderTypes.MakerOrder calldata makerBid)
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

        _canExecuteTakerAsk(takerAsk, makerBid);

        (uint16 toChainId) = makerBid.decodeParams();
        (uint16 fromChainId,,,,) = takerAsk.decodeParams();

        {
            // currency fee is zero
            (uint256 omnixFee, , uint256 nftFee) = getLzFeesForTrading(takerAsk, makerBid, destAirdrop);
            require (omnixFee + nftFee <= msg.value, "Order: Insufficient value");

            if (fromChainId == toChainId) {
                _transferFeesAndFundsLz(takerAsk, makerBid, 0);
                _transferNFTLz(takerAsk, makerBid, 0);
            }
            else {
                uint proxyDataId = _proxyTransferNFT(takerAsk, makerBid, nftFee);
                _sendCrossMessage(takerAsk, makerBid, destAirdrop, proxyDataId);
            }
        }
        
        // Update maker bid order status to true (prevents replay)
        _isUserOrderNonceExecutedOrCancelled[makerBid.signer][toChainId][makerBid.nonce] = true;

        emit TakerAsk(
            bidHash,
            makerBid.nonce,
            takerAsk.taker,
            makerBid.signer,
            makerBid.strategy,
            makerBid.currency,
            makerBid.collection,
            takerAsk.tokenId,
            makerBid.amount,
            takerAsk.price,
            fromChainId,
            toChainId
        );
    }

    function _getCrossMessageFeedPayloadBid(uint destAirdrop, uint proxyDataId, OrderTypes.TakerOrder calldata taker, OrderTypes.MakerOrder calldata maker)
        internal view returns (uint256, bytes memory, bytes memory)
    {
        (uint16 takerChainId,,,,) = taker.decodeParams();
        uint256 royaltyFee = maker.getRoyaltyFee();
        uint16 makerChainId = maker.decodeParams();

        if (makerChainId == takerChainId) {
            return (0, bytes(""), bytes(""));
        }
        bytes memory payload = abi.encode(
            LZ_MESSAGE_ORDER_BID,
            proxyDataId,
            maker.strategy,
            maker.collection,
            maker.currency,
            taker.taker,
            taker.tokenId,
            taker.price,
            maker.signer,
            royaltyFee,
            makerChainId
        );

        address destAddress = trustedRemoteLookup[makerChainId].toAddress(0);
        bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, gasForOmniLzReceive, destAirdrop, destAddress);

        (uint256 messageFee,) = lzEndpoint.estimateFees(
            makerChainId,
            address(this),
            payload,
            false,
            adapterParams
        );

        return (messageFee, payload, adapterParams);
    }

    function _getCrossMessageFeedPayloadAsk(uint destAirdrop, uint proxyDataId, OrderTypes.TakerOrder calldata taker, OrderTypes.MakerOrder calldata maker)
        internal view returns (uint256, bytes memory, bytes memory)
    {
        (uint16 takerChainId,,address collection,,) = taker.decodeParams();
        (uint16 makerChainId) = maker.decodeParams();

        if (makerChainId == takerChainId || !maker.isOrderAsk) {
            return (0, bytes(""), bytes(""));
        }

        // if maker is ask then
        // send lz message for NFT transfering.
        
        // if maker is bid then
        // send lz message for currency transfering.

        // note: this is executing on TakerChain

        bytes memory payload = abi.encode(
            LZ_MESSAGE_ORDER_ASK,
            proxyDataId,
            maker.collection,
            collection,
            maker.signer,
            taker.taker,
            taker.tokenId,
            maker.amount,
            makerChainId
        );
        address destAddress = trustedRemoteLookup[makerChainId].toAddress(0);
        bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, gasForOmniLzReceive, destAirdrop, destAddress);

        (uint256 messageFee,) = lzEndpoint.estimateFees(
            makerChainId,
            address(this),
            payload,
            false,
            adapterParams
        );

        return (messageFee, payload, adapterParams);
    }

    function _sendCrossMessage(OrderTypes.TakerOrder calldata taker, OrderTypes.MakerOrder calldata maker, uint destAirdrop, uint proxyDataId)
        internal
    {
        (uint16 makerChainId) = maker.decodeParams();

        require(trustedRemoteLookup[makerChainId].length != 0, "LzSend: dest chain is not trusted.");
        if (maker.isOrderAsk) {
            (uint256 messageFee, bytes memory payload, bytes memory adapterParams) = _getCrossMessageFeedPayloadAsk(destAirdrop, proxyDataId, taker, maker);
            lzEndpoint.send{value: messageFee}(makerChainId, trustedRemoteLookup[makerChainId], payload, payable(msg.sender), address(0), adapterParams);
        } else {
            (uint256 messageFee, bytes memory payload, bytes memory adapterParams) = _getCrossMessageFeedPayloadBid(destAirdrop, proxyDataId, taker, maker);
            lzEndpoint.send{value: messageFee}(makerChainId, trustedRemoteLookup[makerChainId], payload, payable(msg.sender), address(0), adapterParams);
        }
    }

    function _sendCrossMessageResp(bytes memory payload, uint16 toChainId)
        internal
    {
        require(trustedRemoteLookup[toChainId].length != 0, "LzSend: dest chain is not trusted.");

        address destAddress = trustedRemoteLookup[toChainId].toAddress(0);
        bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, gasForOmniLzReceive, uint256(0), destAddress);

        (uint256 messageFee,) = lzEndpoint.estimateFees(
            toChainId,
            address(this),
            payload,
            false,
            adapterParams
        );

        lzEndpoint.send{value: messageFee}(toChainId, trustedRemoteLookup[toChainId], payload, payable(msg.sender), address(0), adapterParams);
    }

    /**
     * @notice Update currency manager
     * @param _currencyManager new currency manager address
     */
    function updateCurrencyManager(address _currencyManager) external onlyOwner {
        currencyManager = ICurrencyManager(_currencyManager);
        emit NewCurrencyManager(_currencyManager);
    }

    /**
     * @notice Update execution manager
     * @param _executionManager new execution manager address
     */
    function updateExecutionManager(address _executionManager) external onlyOwner {
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
        royaltyFeeManager = IRoyaltyFeeManager(_royaltyFeeManager);
        emit NewRoyaltyFeeManager(_royaltyFeeManager);
    }

    /**
     * @notice Update transfer selector NFT
     * @param _transferSelectorNFT new transfer selector address
     */
    function updateTransferSelectorNFT(address _transferSelectorNFT) external onlyOwner {
        transferSelectorNFT = ITransferSelectorNFT(_transferSelectorNFT);
        emit NewTransferSelectorNFT(_transferSelectorNFT);
    }

    /**
     * @notice Check whether user order nonce is executed or cancelled
     * @param user address of user
     * @param orderNonce nonce of the order
     */
    function isUserOrderNonceExecutedOrCancelled(address user, uint16 lzChainId, uint256 orderNonce) external view returns (bool) {
        return _isUserOrderNonceExecutedOrCancelled[user][lzChainId][orderNonce];
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
    function _transferNFT(
        address collectionFrom,
        address collectionTo,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 fromChainId,
        uint16 toChainId,
        uint256 nftFee
    ) internal {
        // Retrieve the transfer manager address
        address transferManager = transferSelectorNFT.checkTransferManagerForToken(collectionFrom);

        // If no transfer manager found, it returns address(0)
        require(transferManager != address(0), "Transfer: invalid collection");

        ITransferManagerNFT(transferManager).transferNFT{value: nftFee}(collectionFrom, collectionTo, from, to, tokenId, amount, fromChainId, toChainId);
    }

    /**
     * @notice Verify the validity of the maker order
     * @param makerOrder maker order
     * @param orderHash computed hash for the order
     */
    function _validateOrder(OrderTypes.MakerOrder calldata makerOrder, bytes32 orderHash) internal view {
        (uint16 fromChainId) = makerOrder.decodeParams();
        // Verify whether order nonce has expired
        require(
            (!_isUserOrderNonceExecutedOrCancelled[makerOrder.signer][fromChainId][makerOrder.nonce]) &&
                (makerOrder.nonce >= userMinOrderNonce[makerOrder.signer][fromChainId]),
            "Order: Matching order expired"
        );

        makerOrder.checkValid(orderHash);
    }

    function _proxyTransferFunds(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk, uint256 currencyFee) internal returns (uint) {
        uint price = takerBid.price;
        address from = takerBid.taker;
        address to = makerAsk.signer;
        uint256 royaltyFee = makerAsk.getRoyaltyFee();
        uint tokenId = takerBid.tokenId;
        (uint16 takerChainId, address currency, address collection, address strategy,) = takerBid.decodeParams();
        uint16 makerChainId = makerAsk.decodeParams();
        return fundManager.proxyTransfer{value: currencyFee}(
            [price, royaltyFee],
            tokenId,
            [from, to],
            currency,
            strategy,
            collection,
            [takerChainId, makerChainId]
        );
    }

    function _proxyTransferNFT(OrderTypes.TakerOrder calldata taker, OrderTypes.MakerOrder calldata maker, uint256 nftFee) internal returns (uint) {
        (uint16 makerChainId) = maker.decodeParams();
        (uint16 takerChainId,, address collectionFrom,,) = taker.decodeParams();

        // Retrieve the transfer manager address
        address transferManager = transferSelectorNFT.checkTransferManagerForToken(collectionFrom);

        // If no transfer manager found, it returns address(0)
        require(transferManager != address(0), "Transfer: invalid collection");

        return transferSelectorNFT.proxyTransferNFT{value: nftFee}(
            collectionFrom,
            maker.collection,
            maker.isOrderAsk ? maker.signer : taker.taker,
            maker.isOrderAsk ? taker.taker : maker.signer,
            taker.tokenId,
            maker.amount,
            takerChainId,
            makerChainId
        );
    }

    function _transferFeesAndFundsLzWithWETH(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk, uint256 currencyFee) internal {
        (uint16 takerChainId,, address collection, address strategy,) = takerBid.decodeParams();
        (uint16 makerChainId) = makerAsk.decodeParams();
        uint256 royaltyFee = makerAsk.getRoyaltyFee();

        fundManager.transferFeesAndFundsWithWETH{value: currencyFee}(
            strategy,
            collection,
            takerBid.tokenId,
            takerBid.taker,
            makerAsk.signer,
            takerBid.price,
            royaltyFee,
            takerChainId,
            makerChainId
        );
    }

    /**
     * @notice transfer NFT
     * @param nftFee nft transfer fee or destAirdrop
     */
    function _transferNFTLz(OrderTypes.TakerOrder calldata taker, OrderTypes.MakerOrder calldata maker, uint256 nftFee) internal {
        (uint16 makerChainId) = maker.decodeParams();
        (uint16 takerChainId,, address collection,,) = taker.decodeParams();
        address from = maker.isOrderAsk ? maker.signer : taker.taker;
        address to = maker.isOrderAsk ? taker.taker : maker.signer;

        _transferNFT(
            collection,
            maker.collection,
            from,
            to,
            taker.tokenId,
            maker.amount,
            takerChainId,
            makerChainId,
            nftFee
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
        uint16 toChainId
    ) internal view returns(uint256) {
        address transferManager = transferSelectorNFT.checkTransferManagerForToken(collectionFrom);

        if (transferManager == address(0)) {
            return 0;
        }

        // If one is found, transfer the token
        (uint256 messageFee, ) = ITransferManagerNFT(transferManager).estimateSendFee(collectionFrom, collectionTo, from, to, tokenId, amount, fromChainId, toChainId);
        return messageFee;
    }

    function _canExecuteTakerBid(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk) 
        internal view returns (uint256, uint256) {
        (,,, address strategy,) = takerBid.decodeParams();
        (bool isExecutionValid, uint256 tokenId, uint256 amount) = IExecutionStrategy(strategy)
            .canExecuteTakerBid(takerBid, makerAsk);

        require(isExecutionValid, "Strategy: Execution invalid");

        return (tokenId, amount);
    }

    function _canExecuteTakerAsk(OrderTypes.TakerOrder calldata takerAsk, OrderTypes.MakerOrder calldata makerBid) 
        internal view returns (uint256, uint256) {
        (,,, address strategy,) = takerAsk.decodeParams();
        (bool isExecutionValid, uint256 tokenId, uint256 amount) = IExecutionStrategy(strategy)
            .canExecuteTakerAsk(takerAsk, makerBid);

        require(isExecutionValid, "Strategy: Execution invalid");

        return (tokenId, amount);
    }

    /**
     * @notice transfer funds
     * @param currencyFee currency transfer fee or destAirdrop
     */
    function _transferFeesAndFundsLz(OrderTypes.TakerOrder calldata taker, OrderTypes.MakerOrder calldata maker, uint256 currencyFee) internal {
        uint256 tokenId = taker.tokenId;
        address from = maker.isOrderAsk ? taker.taker : maker.signer;
        address to = maker.isOrderAsk ? maker.signer : taker.taker;
        uint256 price = taker.price;
        uint256 royaltyFee = maker.getRoyaltyFee();
        (uint16 takerChainId, address currency, address collection, address strategy,) = taker.decodeParams();
        uint16 makerChainId = maker.decodeParams();

        fundManager.transferFeesAndFunds{value: currencyFee}(
            strategy,
            collection,
            tokenId,
            currency,
            from,
            to,
            price,
            royaltyFee,
            takerChainId,
            makerChainId
        );
    }

    function _transferFeesAndFundsLzReceive(
        address strategy, 
        address collection, 
        address currency, 
        address from, 
        address to, 
        uint tokenId, 
        uint price, 
        uint royaltyFee, 
        uint16 fromChainId, 
        uint16 toChainId
    ) external {
        uint256 currencyFee = fundManager.lzFeeTransferCurrency(
            currency,
            to,
            price,
            fromChainId,
            toChainId
        );

        fundManager.transferFeesAndFunds{value: currencyFee}(
            strategy,
            collection,
            tokenId,
            currency,
            from,
            to,
            price,
            royaltyFee,
            fromChainId,
            toChainId
        );
    }

    function _transferNFTLzReceive(
        address collectionFrom, 
        address collectionTo, 
        address from, 
        address to, 
        uint tokenId, 
        uint amount, 
        uint16 fromChainId, 
        uint16 toChainId
    ) external {
        uint256 nftFee = _lzFeeTransferNFT(
            collectionFrom,
            collectionTo,
            from,
            to,
            tokenId,
            amount,
            fromChainId,
            toChainId
        );

        _transferNFT(
            collectionFrom,
            collectionTo,
            from,
            to,
            tokenId,
            amount,
            fromChainId,
            toChainId,
            nftFee
        );
    }

    /**
     * @notice message listener from LayerZero endpoint
     * @param _srcChainId chain id where the message was sent from
     * @param _payload message data
     * @dev no need to change this function
     */
    function _nonblockingLzReceive(uint16 _srcChainId, bytes memory, uint64, bytes memory _payload) internal virtual override {
        // decode and load the toAddress
        (uint8 lzMessage) = abi.decode(_payload, (uint8));
        
        if (lzMessage == LZ_MESSAGE_ORDER_ASK) {
            (
                ,
                uint proxyDataId,
                address collectionFrom,
                address collectionTo,
                address from,
                address to,
                uint tokenId,
                uint amount,
                uint16 lzChainId
            ) = abi.decode(_payload, (
                uint8,
                uint,
                address,
                address,
                address,
                address,
                uint,
                uint,
                uint16
            ));
            uint16 toChainId = _srcChainId;
            
            try this._transferNFTLzReceive(
                collectionFrom,
                collectionTo,
                from,
                to,
                tokenId,
                amount,
                lzChainId,
                toChainId
            ) {
                bytes memory respPayload = abi.encode(
                    LZ_MESSAGE_ORDER_ASK_RESP,
                    proxyDataId,
                    RESP_OK
                );
                _sendCrossMessageResp(respPayload, toChainId);
            } catch {
                bytes memory respPayload = abi.encode(
                    LZ_MESSAGE_ORDER_ASK_RESP,
                    proxyDataId,
                    RESP_FAIL
                );
                _sendCrossMessageResp(respPayload, toChainId);
            }
        }
        else if (lzMessage == LZ_MESSAGE_ORDER_BID) {
            (
                ,
                uint proxyDataId,
                address strategy,
                address collection,
                address currency,
                address to,
                uint tokenId,
                uint price,
                address from,
                uint royaltyFee,
                uint16 lzChainId
            ) = abi.decode(_payload, (
                uint8,
                uint,
                address,
                address,
                address,
                address,
                uint,
                uint,
                address,
                uint,
                uint16
            ));

            uint16 toChainId = _srcChainId;
            try this._transferFeesAndFundsLzReceive(
                strategy, 
                collection, 
                currency, 
                from, 
                to, 
                tokenId, 
                price, 
                royaltyFee, 
                lzChainId, 
                toChainId
            ) {
                bytes memory respPayload = abi.encode(
                    LZ_MESSAGE_ORDER_BID_RESP,
                    proxyDataId,
                    RESP_OK
                );
                _sendCrossMessageResp(respPayload, toChainId);
            } catch {
                bytes memory respPayload = abi.encode(
                    LZ_MESSAGE_ORDER_BID_RESP,
                    proxyDataId,
                    RESP_FAIL
                );
                _sendCrossMessageResp(respPayload, toChainId);
            }
        }
        else if (lzMessage == LZ_MESSAGE_ORDER_ASK_RESP) {
            (
                ,
                uint proxyDataId,
                uint8 resp
            ) = abi.decode(_payload, (
                uint8,
                uint,
                uint8
            ));

            fundManager.processFunds(proxyDataId, resp);
        }
        else if (lzMessage == LZ_MESSAGE_ORDER_BID_RESP) {
            (
                ,
                uint proxyDataId,
                uint8 resp
            ) = abi.decode(_payload, (
                uint8,
                uint,
                uint8
            ));

            transferSelectorNFT.processNFT(proxyDataId, resp);
        }
    }

    receive() external payable {
        // nothing to do
    }
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}