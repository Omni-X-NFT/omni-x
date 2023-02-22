// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// OpenZeppelin contracts
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

// OmniX interfaces
import {IStargateReceiver} from "../interfaces/IStargateReceiver.sol";
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
contract OmniXExchange is NonblockingLzApp, EIP712, IOmniXExchange, IStargateReceiver, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using OrderTypes for OrderTypes.MakerOrder;
    using OrderTypes for OrderTypes.TakerOrder;
    using BytesLib for bytes;

    string private constant SIGNING_DOMAIN = "OmniXExchange";
    string private constant SIGNATURE_VERSION = "1";
    uint16 private constant LZ_ADAPTER_VERSION = 2;
    uint8 private constant LZ_MESSAGE_ORDER_ASK = 1;
    uint8 private constant LZ_MESSAGE_ORDER_BID = 2;
    uint8 private constant LZ_MESSAGE_ORDER_ASK_RESP = 3;
    uint8 private constant LZ_MESSAGE_ORDER_BID_RESP = 4;
    uint8 private constant RESP_OK = 1;
    uint8 private constant RESP_FAIL = 2;

    address public immutable WETH;

    address public protocolFeeRecipient;
    uint256 public gasForLzReceive;

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
    event SentFunds(address indexed seller, address indexed buyer, uint price, address currency);
    event RevertFunds(address indexed seller, address indexed buyer, uint price, address currency, bytes reason);
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

        gasForLzReceive = 350000;
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
    function setGasForLzReceive(uint256 gas) external onlyOwner {
        gasForLzReceive = gas;
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
        (uint16 takerChainId, address currency,,,) = taker.decodeParams();
        
        if (maker.isOrderAsk) {
            bytes memory sgPayload = _getSgPayload(taker, maker);
            uint256 currencyFee = fundManager.lzFeeTransferCurrency(
                currency,
                maker.signer,
                taker.price,
                takerChainId,
                makerChainId,
                sgPayload
            );
            uint256 omnixFee = 0;
            // on this taker chain, no NFT transfer fee
            // on the maker chain, there is transfer fee if using TransferManagerONFT
            // uint256 nftFee = 0;

            if (address(stargatePoolManager) == address(0) ||
                !stargatePoolManager.isSwappable(currency, makerChainId)) {
                // if the currency is not swappable, then we send cross message vis lz.
                (omnixFee,, ) = _getLzPayload(destAirdrop, taker, maker);
            }

            return (omnixFee, currencyFee, uint256(0));
        }
        else {
            uint256 nftFee = 0;
            (uint256 omnixFee,, ) = _getLzPayload(destAirdrop, taker, maker);

            // on this taker ask chain, no currency fee because currency transfer tx will be executed on the maker chain
            // on the maker bid chain, there is fee.
            // uint256 currencyFee = 0;

            return (omnixFee, uint256(0), nftFee);
        }
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
                fundManager.transferFeesAndFundsWithWETH(takerBid, makerAsk);
                _transferNFT(makerAsk.collection, makerAsk.signer, takerBid.taker, takerBid.tokenId, makerAsk.amount);
            }
            else {
                // we completely believe stargate native swap is 100% finality.
                _sendCrossMessage(takerBid, makerAsk, 0);
                // cross funds to maker chain's omnixexchange.
                fundManager.transferFeesAndFundsWithWETH{value: currencyFee + takerBid.price}(takerBid, makerAsk);
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

            (, address takerCurrency,, address takerStrategy,) = takerBid.decodeParams();
            if (makerChainId == takerChainId) {
                // direct transfer funds
                fundManager.transferFeesAndFunds(takerStrategy, takerCurrency, takerBid.price, takerBid.taker, makerAsk.signer, makerAsk.getRoyaltyInfo());
                _transferNFT(makerAsk.collection, makerAsk.signer, takerBid.taker, takerBid.tokenId, makerAsk.amount);
            }
            else {
                if (omnixFee != 0) {
                    // currency is not swappable so cross message to send nft and funds instantly
                    _sendCrossMessage(takerBid, makerAsk, 0);
                    fundManager.transferFeesAndFunds(takerStrategy, takerCurrency, takerBid.price, takerBid.taker, makerAsk.signer, makerAsk.getRoyaltyInfo());
                }
                else {
                    // cross funds to maker chain's omnixexchange.
                    // once sgReceive received, actual trading will be made.
                    bytes memory sgPayload = _getSgPayload(takerBid, makerAsk);
                    fundManager.transferProxyFunds{value: currencyFee}(
                        takerCurrency,
                        takerBid.taker,
                        takerBid.price,
                        takerChainId,
                        makerChainId,
                        sgPayload
                    );
                }
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

            (, address currency, address takerCollection,,) = takerAsk.decodeParams();

            if (fromChainId == toChainId) {
                // direct transfer funds
                fundManager.transferFeesAndFunds(makerBid.strategy, makerBid.currency, makerBid.price, makerBid.signer, takerAsk.taker, makerBid.getRoyaltyInfo());
                _transferNFT(takerCollection, takerAsk.taker, makerBid.signer, takerAsk.tokenId, makerBid.amount);
            }
            else {
                if (destAirdrop == 0 || currencyManager.isOmniCurrency(currency)) {
                    // currency is not swappable, so transfer nft first and then send cross message to make funds
                    _transferNFT(takerCollection, takerAsk.taker, makerBid.signer, takerAsk.tokenId, makerBid.amount);
                    _sendCrossMessage(takerAsk, makerBid, destAirdrop);
                }
                else {
                    // cross message to maker chain's omnixexchange.
                    // once _nonblockingLzReceive received this message, cross funding will be made to taker's chain.
                    // once sgReceive received funds, actual funding will be made on taker's chain.
                    _sendCrossMessage(takerAsk, makerBid, destAirdrop);
                }
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

    function _getSgPayload(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk)
        internal pure returns (bytes memory)
    {
        bytes memory payload = abi.encode(
            makerAsk.collection,
            makerAsk.signer,
            takerBid.taker,
            takerBid.tokenId,
            makerAsk.amount,
            makerAsk.currency,
            makerAsk.strategy,
            makerAsk.getRoyaltyInfo()
        );

        return payload;
    }

    function _getLzPayload(uint destAirdrop, OrderTypes.TakerOrder calldata taker, OrderTypes.MakerOrder calldata maker)
        internal view returns (uint256, bytes memory, bytes memory)
    {
        (uint16 takerChainId,,,,) = taker.decodeParams();
        uint16 makerChainId = maker.decodeParams();

        if (makerChainId == takerChainId) {
            return (0, bytes(""), bytes(""));
        }
        bytes memory payload;

        if (maker.isOrderAsk) {
            payload = abi.encode(
                LZ_MESSAGE_ORDER_ASK,
                maker.collection,
                maker.signer,
                taker.taker,
                taker.tokenId,
                maker.amount
            );
        } else {
            (, address takerCurrency,, address takerStrategy,) = taker.decodeParams();
            OrderTypes.PartyData memory takerParty = OrderTypes.PartyData(takerCurrency, takerStrategy, taker.taker, takerChainId);
            OrderTypes.PartyData memory makerParty = OrderTypes.PartyData(maker.currency, maker.strategy, maker.signer, makerChainId);
            bytes memory royaltyInfo = maker.getRoyaltyInfo();
            payload = abi.encode(
                LZ_MESSAGE_ORDER_BID,
                maker.collection,
                taker.tokenId,
                maker.amount,
                maker.price,
                takerParty,
                makerParty,
                royaltyInfo
            );
        }

        address destAddress = trustedRemoteLookup[makerChainId].toAddress(0);
        bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, gasForLzReceive, destAirdrop, destAddress);

        (uint256 messageFee,) = lzEndpoint.estimateFees(
            makerChainId,
            address(this),
            payload,
            false,
            adapterParams
        );

        return (messageFee, payload, adapterParams);
    }

    function _sendCrossMessage(OrderTypes.TakerOrder calldata taker, OrderTypes.MakerOrder calldata maker, uint destAirdrop)
        internal
    {
        (uint16 makerChainId) = maker.decodeParams();

        require(trustedRemoteLookup[makerChainId].length != 0, "LzSend: dest chain is not trusted.");

        (uint256 messageFee, bytes memory payload, bytes memory adapterParams) = _getLzPayload(destAirdrop, taker, maker);
        lzEndpoint.send{value: messageFee}(makerChainId, trustedRemoteLookup[makerChainId], payload, payable(msg.sender), address(0), adapterParams);
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
     * @param collection address of the token collection on from chain
     * @param from address of the sender
     * @param to address of the recipient
     * @param tokenId tokenId
     * @param amount amount of tokens (1 for ERC721, 1+ for ERC1155)
     * @dev For ERC721, amount is not used
     */
    function _transferNFT(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) internal {
        // Retrieve the transfer manager address
        address transferManager = transferSelectorNFT.checkTransferManagerForToken(collection);

        // If no transfer manager found, it returns address(0)
        require(transferManager != address(0), "Transfer: invalid collection");

        ITransferManagerNFT(transferManager).transferNFT(collection, from, to, tokenId, amount);
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

    /**
     * @notice transfer NFT
     */
    function _transferNFTLz(address collection, address from, address to, uint tokenId, uint amount) external {
        require (msg.sender == address(this), "_transferNFTLz: invalid caller");

        _transferNFT(
            collection,
            from,
            to,
            tokenId,
            amount
        );
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
     * @notice message listener from LayerZero endpoint
     * @param _payload message data
     * @dev no need to change this function
     */
    function _nonblockingLzReceive(uint16, bytes memory, uint64, bytes memory _payload) internal virtual override {
        // decode and load the toAddress
        (uint8 lzMessage) = abi.decode(_payload, (uint8));

        if (lzMessage == LZ_MESSAGE_ORDER_ASK) {
            // on maker chain (seller)
            (, address collection, address from, address to, uint tokenId, uint amount) = 
                abi.decode(_payload, (uint8, address, address, address, uint, uint));

            _transferNFT(
                collection,
                from,
                to,
                tokenId,
                amount
            );
        }
        else if (lzMessage == LZ_MESSAGE_ORDER_BID) {
            // cross funds to taker's chain and it will forward to sgReceive callback.
            (   ,
                address collection,
                uint tokenId,
                uint amount,
                uint price,
                OrderTypes.PartyData memory takerParty,
                OrderTypes.PartyData memory makerParty,
                bytes memory royaltyInfo
            ) = abi.decode(_payload, (
                uint8, address, uint, uint, uint, OrderTypes.PartyData, OrderTypes.PartyData, bytes
            ));

            bytes memory sgPayload = abi.encode(
                collection,             // collection
                takerParty.party,       // seller
                makerParty.party,       // buyer
                tokenId,                // tokenId
                amount,                 // amount for 1155
                takerParty.currency,    // currency
                takerParty.strategy,    // strategy
                royaltyInfo             // royalty info
            );
            uint256 currencyFee = fundManager.lzFeeTransferCurrency(
                makerParty.currency,    // currency
                takerParty.party,       // to
                price,                  // price
                makerParty.chainId,     // fromChainId
                takerParty.chainId,     // takerChainId
                sgPayload
            );

            if (currencyFee == 0) {
                // on maker chain (buyer)
                fundManager.transferFeesAndFunds(makerParty.strategy, makerParty.currency, price, makerParty.party, takerParty.party, royaltyInfo);
            }
            else {
                // on maker chain (buyer)
                // payload - seller's chain info as well
                fundManager.transferProxyFunds{value: currencyFee}(
                    makerParty.currency,
                    makerParty.party,
                    price,
                    makerParty.chainId,
                    takerParty.chainId,
                    sgPayload
                );
            }
        }
    }

    function sgReceive(
        uint16 ,              // the remote chainId sending the tokens
        bytes memory,        // the remote Bridge address
        uint256,                  
        address,                  // the token contract on the local chain
        uint256 _price,                // the qty of local _token contract tokens  
        bytes memory _payload
    ) external override {
        if (_payload.length == 0) return;

        (
            address collection,
            address seller,
            address buyer,
            uint tokenId,
            uint amount,
            address currency,
            address strategy,
            bytes memory royaltyInfo
        ) = abi.decode(_payload, (
            address,
            address,
            address,
            uint,
            uint,
            address,
            address,
            bytes
        ));

        // on seller's chain
        // transfer nft from seller to buyer.
        // if isOrderAsk is true, maker is seller, taker is buyer. this is running on maker chain.
        // if isOrderAsk is false, taker is seller, maker is buyer. this is running on taker chain.
        uint price = _price;
        try this._transferNFTLz(collection, seller, buyer, tokenId, amount) {
            // funds from omnixexchange to seller
            IERC20(currency).approve(address(fundManager), price);

            fundManager.processFeesAndFunds(currency, buyer, seller, strategy, price, royaltyInfo, 1);

            emit SentFunds(seller, buyer, price, currency);

        } catch (bytes memory reason) {
            // revert funds
            IERC20(currency).approve(address(fundManager), price);
            fundManager.processFeesAndFunds(currency, buyer, seller, strategy, price, royaltyInfo, 2);

            emit RevertFunds(seller, buyer, price, currency, reason);
        }
    }

    receive() external payable {
        // nothing to do
    }
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}