// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// LooksRare unopinionated libraries
import {SignatureCheckerCalldata} from "@looksrare/contracts-libs/contracts/SignatureCheckerCalldata.sol";
import {LowLevelETHReturnETHIfAnyExceptOneWei} from "@looksrare/contracts-libs/contracts/lowLevelCallers/LowLevelETHReturnETHIfAnyExceptOneWei.sol";
import {LowLevelWETH} from "@looksrare/contracts-libs/contracts/lowLevelCallers/LowLevelWETH.sol";
import {LowLevelERC20Transfer} from "@looksrare/contracts-libs/contracts/lowLevelCallers/LowLevelERC20Transfer.sol";

// OpenZeppelin's library (adjusted) for verifying Merkle proofs
import {MerkleProofCalldataWithNodes} from "../libraries/OpenZeppelin/MerkleProofCalldataWithNodes.sol";

// Libraries
import {OrderStructs} from "../libraries/OrderStructs.sol";


// Interfaces
import {IOmniXExchange} from "../interfaces/IOmniXExchange.sol";
import {CollectionType} from "../enums/CollectionType.sol";


// Shared errors
import {CallerInvalid, CurrencyInvalid, LengthsInvalid, MerkleProofInvalid, MerkleProofTooLarge, QuoteTypeInvalid} from "../errors/SharedErrors.sol";

// Direct dependencies
import {TransferSelectorNFT} from "./TransferSelectorNFT.sol";
import {BatchOrderTypehashRegistry} from "./BatchOrderTypehashRegistry.sol";

// Constants
import {MAX_CALLDATA_PROOF_LENGTH, ONE_HUNDRED_PERCENT_IN_BP} from "../constants/NumericConstants.sol";

// Enums
import {QuoteType} from "../enums/QuoteType.sol";

import {ICurrencyManager} from "../interfaces/ICurrencyManager.sol";
import {BytesLib} from "../libraries/BytesLib.sol";
import {IOFT} from "../token/oft/IOFT.sol";
import {IStargatePoolManager} from "../interfaces/IStargatePoolManager.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IStargateReceiver} from "../interfaces/IStargateReceiver.sol";


contract OmniXExchange is
    IOmniXExchange,
    TransferSelectorNFT,
    LowLevelETHReturnETHIfAnyExceptOneWei,
    LowLevelWETH,
    LowLevelERC20Transfer,
    BatchOrderTypehashRegistry,
    IStargateReceiver
{
    using SafeERC20 for IERC20;
    using OrderStructs for OrderStructs.Maker;
    using BytesLib for bytes;


    
    uint16 private constant LZ_ADAPTER_VERSION = 2;
    uint8 private constant LZ_MESSAGE_ORDER_ASK = 1;
    uint8 private constant LZ_MESSAGE_ORDER_BID = 2;
    uint8 private constant LZ_MESSAGE_ORDER_ASK_RESP = 3;
    uint8 private constant LZ_MESSAGE_ORDER_BID_RESP = 4;
    uint8 private constant RESP_OK = 1;
    uint8 private constant RESP_FAIL = 2;

    /**
     * @notice Wrapped ETH.
     */
    address public immutable WETH;
    IStargatePoolManager public stargatePoolManager;

    /**
     * @notice Current chainId.
     */
    uint256 public chainId;
    uint256 public gasForLzReceive;
    uint256 public gasForOmniLzReceive = 350000;

    /**
     * @notice Current domain separator.
     */
    bytes32 public domainSeparator;

    /**
     * @notice This variable is used as the gas limit for a ETH transfer.
     *         If a standard ETH transfer fails within this gas limit, ETH will get wrapped to WETH
     *         and transferred to the initial recipient.
     */
    uint256 private _gasLimitETHTransfer = 2_300;

    /**
     * @notice Constructor
     * @param _owner Owner address
     * @param _protocolFeeRecipient Protocol fee recipient address
     * @param _transferManager Transfer manager address
     * @param _weth Wrapped ETH address
     */
    constructor(
        address _endpoint,
        address _owner,
        address _protocolFeeRecipient,
        address _transferManager,
        address _weth
    ) TransferSelectorNFT( _endpoint, _owner, _protocolFeeRecipient, _transferManager) {
        _updateDomainSeparator();
        WETH = _weth;
        gasForLzReceive = 600000;
    }

    function executeTakerAsk(
        OrderStructs.Taker calldata takerAsk,
        OrderStructs.Maker calldata makerBid,
        bytes calldata makerSignature,
        OrderStructs.MerkleTree calldata merkleTree,
        address affiliate
    ) external nonReentrant {
        address currency = makerBid.currency;

        // Verify whether the currency is allowed and is not ETH (address(0))
        if (!isCurrencyAllowed[currency] || currency == address(0)) {
            revert CurrencyInvalid();
        }

        address signer = makerBid.signer;
        bytes32 orderHash = makerBid.hash();
        _verifyMerkleProofOrOrderHash(merkleTree, orderHash, makerSignature, signer);

        // Execute the transaction and fetch protocol fee amount
        uint256 totalProtocolFeeAmount = _executeTakerAsk(takerAsk, makerBid, orderHash);

        // Pay protocol fee (and affiliate fee if any)
        _payProtocolFeeAndAffiliateFee(currency, signer, affiliate, signer, totalProtocolFeeAmount);
    }

    function executeTakerBid(
        uint destAirdrop,
        OrderStructs.Taker calldata takerBid,
        OrderStructs.Maker calldata makerAsk,
        bytes calldata makerSignature,
        OrderStructs.MerkleTree calldata merkleTree,
        address affiliate
    ) external payable nonReentrant {
        address currency = makerAsk.currency;

        // Verify whether the currency is allowed for trading.
        if (!isCurrencyAllowed[currency]) {
            revert CurrencyInvalid();
        }

        bytes32 orderHash = makerAsk.hash();
        _verifyMerkleProofOrOrderHash(merkleTree, orderHash, makerSignature, makerAsk.signer);

        // Execute the transaction and fetch protocol fee amount
        uint256 totalProtocolFeeAmount = _executeTakerBid(destAirdrop, takerBid, makerAsk, msg.sender, affiliate, orderHash);

        // Pay protocol fee amount (and affiliate fee if any)
        _payProtocolFeeAndAffiliateFee(currency, msg.sender, affiliate, msg.sender totalProtocolFeeAmount);
        // Return ETH if any
        _returnETHIfAnyWithOneWeiLeft();
    
    }


    function executeMultipleTakerBids(
        uint256 destAirdrop,
        OrderStructs.Taker[] calldata takerBids,
        OrderStructs.Maker[] calldata makerAsks,
        bytes[] calldata makerSignatures,
        OrderStructs.MerkleTree[] calldata merkleTrees,
        address affiliate,
        bool isAtomic
    ) external payable nonReentrant {
        uint256 length = takerBids.length;
        if (
            length == 0 ||
            (makerAsks.length ^ length) | (makerSignatures.length ^ length) | (merkleTrees.length ^ length) != 0
        ) {
            revert LengthsInvalid();
        }

        // Verify whether the currency at index = 0 is allowed for trading
        address currency = makerAsks[0].currency;
        if (!isCurrencyAllowed[currency]) {
            revert CurrencyInvalid();
        }

        {
            // Initialize protocol fee amount
            uint256 totalProtocolFeeAmount;

            // If atomic, it uses the executeTakerBid function.
            // If not atomic, it uses a catch/revert pattern with external function.
            if (isAtomic) {
                for (uint256 i; i < length; ) {
                    OrderStructs.Maker calldata makerAsk = makerAsks[i];

                    // Verify the currency is the same
                    if (i != 0) {
                        if (makerAsk.currency != currency) {
                            revert CurrencyInvalid();
                        }
                    }

                    OrderStructs.Taker calldata takerBid = takerBids[i];
                    bytes32 orderHash = makerAsk.hash();

                    {
                        _verifyMerkleProofOrOrderHash(merkleTrees[i], orderHash, makerSignatures[i], makerAsk.signer);

                        // Execute the transaction and add protocol fee
                        totalProtocolFeeAmount += _executeTakerBid(destAirdrop, takerBid, makerAsk, msg.sender, orderHash);

                        unchecked {
                            ++i;
                        }
                    }
                }
            } else {
                for (uint256 i; i < length; ) {
                    OrderStructs.Maker calldata makerAsk = makerAsks[i];

                    // Verify the currency is the same
                    if (i != 0) {
                        if (makerAsk.currency != currency) {
                            revert CurrencyInvalid();
                        }
                    }

                    OrderStructs.Taker calldata takerBid = takerBids[i];
                    bytes32 orderHash = makerAsk.hash();

                    {
                        _verifyMerkleProofOrOrderHash(merkleTrees[i], orderHash, makerSignatures[i], makerAsk.signer);

                        try this.restrictedExecuteTakerBid(destAirdrop, takerBid, makerAsk, msg.sender, orderHash) returns (
                            uint256 protocolFeeAmount
                        ) {
                            totalProtocolFeeAmount += protocolFeeAmount;
                        } catch {}

                        unchecked {
                            ++i;
                        }
                    }
                }
            }

            // Pay protocol fee (and affiliate fee if any)
            _payProtocolFeeAndAffiliateFee(currency, msg.sender, affiliate, msg.sender, totalProtocolFeeAmount);
        }

        // Return ETH if any
        _returnETHIfAnyWithOneWeiLeft();
    }

    /**
     * @notice This function is used to do a non-atomic matching in the context of a batch taker bid.
     * @param takerBid Taker bid struct
     * @param makerAsk Maker ask struct
     * @param sender Sender address (i.e. the initial msg sender)
     * @param orderHash Hash of the maker ask order
     * @return protocolFeeAmount Protocol fee amount
     * @dev This function is only callable by this contract. It is used for non-atomic batch order matching.
     */
    function restrictedExecuteTakerBid(
        uint256 destAirdrop,
        OrderStructs.Taker calldata takerBid,
        OrderStructs.Maker calldata makerAsk,
        address sender,
        bytes32 orderHash
    ) external returns (uint256 protocolFeeAmount) {
        if (msg.sender != address(this)) {
            revert CallerInvalid();
        }

        protocolFeeAmount = _executeTakerBid(destAirdrop, takerBid, makerAsk, sender, orderHash);
    }

    /**
     * @notice This function allows the owner to update the domain separator (if possible).
     * @dev Only callable by owner. If there is a fork of the network with a new chainId,
     *      it allows the owner to reset the domain separator for the new chain id.
     */
    function updateDomainSeparator() external onlyOwner {
        if (block.chainid != chainId) {
            _updateDomainSeparator();
            emit NewDomainSeparator();
        } else {
            revert SameDomainSeparator();
        }
    }

    /**
     * @notice This function allows the owner to update the maximum ETH gas limit for a standard transfer.
     * @param newGasLimitETHTransfer New gas limit for ETH transfer
     * @dev Only callable by owner.
     */
    function updateETHGasLimitForTransfer(uint256 newGasLimitETHTransfer) external onlyOwner {
        if (newGasLimitETHTransfer < 2_300) {
            revert NewGasLimitETHTransferTooLow();
        }

        _gasLimitETHTransfer = newGasLimitETHTransfer;

        emit NewGasLimitETHTransfer(newGasLimitETHTransfer);
    }

    /**
     * @notice This function is internal and is used to execute a taker ask (against a maker bid).
     * @param takerAsk Taker ask order struct
     * @param makerBid Maker bid order struct
     * @param orderHash Hash of the maker bid order
     * @return protocolFeeAmount Protocol fee amount
     */
    function _executeTakerAsk(
        OrderStructs.Taker calldata takerAsk,
        OrderStructs.Maker calldata makerBid,
        bytes32 orderHash
    ) internal returns (uint256) {
        if (makerBid.quoteType != QuoteType.Bid) {
            revert QuoteTypeInvalid();
        }

        address signer = makerBid.signer;
        {
            bytes32 userOrderNonceStatus = userOrderNonce[signer][makerBid.orderNonce];
            // Verify nonces
            if (
                userBidAskNonces[signer].bidNonce != makerBid.globalNonce ||
                userSubsetNonce[signer][makerBid.subsetNonce] ||
                (userOrderNonceStatus != bytes32(0) && userOrderNonceStatus != orderHash)
            ) {
                revert NoncesInvalid();
            }
        }

        (
            uint256[] memory itemIds,
            uint256[] memory amounts,
            address[2] memory recipients,
            uint256[3] memory feeAmounts,
            bool isNonceInvalidated
        ) = _executeStrategyForTakerOrder(takerAsk, makerBid, msg.sender);

        // Order nonce status is updated
        _updateUserOrderNonce(isNonceInvalidated, signer, makerBid.orderNonce, orderHash);

        // Taker action goes first
        _transferNFT(makerBid.collection, makerBid.collectionType, msg.sender, signer, itemIds, amounts);

        // Maker action goes second
        _transferToAskRecipientAndCreatorIfAny(recipients, feeAmounts, makerBid.currency, signer);

        emit TakerAsk(
            NonceInvalidationParameters({
                orderHash: orderHash,
                orderNonce: makerBid.orderNonce,
                isNonceInvalidated: isNonceInvalidated
            }),
            msg.sender,
            signer,
            makerBid.strategyId,
            makerBid.currency,
            makerBid.collection,
            itemIds,
            amounts,
            recipients,
            feeAmounts
        );

        // It returns the protocol fee amount
        return feeAmounts[2];
    }




    function getLzFees(
        OrderStructs.Taker calldata taker,
        OrderStructs.Maker calldata maker,
        uint256 destAirdrop,
        uint256[] memory itemIds,
        uint256[] memory amounts,
        address[2] memory recipients,
        uint256[3] memory feeAmounts,
        address affiliate
        ) public view returns(uint256, uint256, uint256) {

            if (maker.quoteType == QuoteType.Ask) {
                bytes memory sgPayload = _getSgPayload(taker, maker, itemIds, amounts, recipients, feeAmounts, affiliate);
                uint256 crossChainCurrencyFee = _getCrossChainCurrencyFee(
                    maker.currency,
                    maker.signer,
                    maker.price,
                    taker.lzChainId,
                    maker.lzChainId,
                    sgPayload
                );
                
                uint256 omnixMessageFee = 0;
                if (crossChainCurrencyFee == 0){
                    (omnixMessageFee,,) = _getLzPayload(destAirdrop, taker, maker);
                }

                return (omnixMessageFee, crossChainCurrencyFee, uint256(0));

                
            }
    }


    function _getLzPayload(
        uint destAirdrop,
        OrderStructs.Taker calldata taker,
        OrderStructs.Maker calldata maker
    ) internal view returns(uint256, bytes memory, bytes memory) {
        if (taker.lzChainId == maker.lzChainId) {
            return (0, bytes(""), bytes(""));
        }
        bytes memory payload;
        if (maker.quoteType == QuoteType.Ask) {
            payload = abi.encode(
                LZ_MESSAGE_ORDER_ASK,
                maker.collection,
                maker.signer,
                taker.recipient,
                abi.encodePacked(maker.itemIds),
                abi.encodePacked(maker.amounts)
            );
        }
        // add takerAsk logic


        address destAddress = trustedRemoteLookup[maker.lzChainId].toAddress(0);
        bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, gasForLzReceive, destAirdrop, destAddress);

        (uint256 messageFee,) = lzEndpoint.estimateFees(
            maker.lzChainId,
            address(this),
            payload,
            false,
            adapterParams
        );

        return (messageFee, payload, adapterParams);


    }

    function setGasForLzReceive(uint256 gas) external onlyOwner {
        gasForLzReceive = gas;
    }
    function setGasForOmniLZReceive(uint256 gas) external onlyOwner {
        gasForOmniLzReceive = gas;
    }

    function setStargatePoolManager(address manager) external onlyOwner {
        stargatePoolManager = IStargatePoolManager(manager);
    }

    function _getCrossChainCurrencyFee(
        address currency,
        address to,
        uint256 amount,
        uint16 fromChainId,
        uint16 toChainId,
        bytes memory payload
    ) public view returns(uint256) {
        if (currency == address(0)) return 0;

        if (isOmniCurrency(currency)) {
            if (fromChainId == toChainId) {
                return 0;
            } else {
                bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, gasForOmniLzReceive);
                bytes memory toAddress = abi.encodePacked(to);
                (uint256 messageFee,) = IOFT(currency).estimateSendFee(
                    toChainId,
                    toAddress,
                    amount,
                    false,
                    adapterParams,
                    payload
                );
                return messageFee;
                
            }
        } else {
            if (
                fromChainId != toChainId &&
                address(stargatePoolManager) != address(0) &&
                stargatePoolManager.isSwappable(currency, toChainId)
            ) {
                (uint256 fee, ) = stargatePoolManager.getSwapFee(toChainId, to, payload);
                return fee;
            }

        }
        return 0;

    }

    function _getSgPayload(
        OrderStructs.Taker calldata takerBid, 
        OrderStructs.Maker calldata makerAsk, 
        uint256[] memory itemIds,
        uint256[] memory amounts,
        address[2] memory recipients,
        uint256[3] memory feeAmounts,
        address affiliate
        ) internal pure returns(bytes memory) {
        bytes memory payload = abi.encode(
            makerAsk.collection,
            makerAsk.collectionType,
            makerAsk.signer,
            takerBid.recipient,
            itemIds,
            amounts,
            makerAsk.currency,
            makerAsk.strategyId,
            recipients, 
            feeAmounts,
            makerAsk.getRoyaltyInfo()
        );

        return payload;
    }  

    /**
     * @notice This function is internal and is used to execute a taker bid (against a maker ask).
     * @param takerBid Taker bid order struct
     * @param makerAsk Maker ask order struct
     * @param sender Sender of the transaction (i.e. msg.sender)
     * @param orderHash Hash of the maker ask order
     * @return protocolFeeAmount Protocol fee amount
     */
    function _executeTakerBid(
        uint destAirdrop,
        OrderStructs.Taker calldata takerBid,
        OrderStructs.Maker calldata makerAsk,
        address sender,
        address affiliate,
        bytes32 orderHash
    ) internal returns (uint256) {
        if (makerAsk.quoteType != QuoteType.Ask) {
            revert QuoteTypeInvalid();
        }

        address signer = makerAsk.signer;

        {
            // Verify nonces
            bytes32 userOrderNonceStatus = userOrderNonce[signer][makerAsk.orderNonce];

            if (
                userBidAskNonces[signer].askNonce != makerAsk.globalNonce ||
                userSubsetNonce[signer][makerAsk.subsetNonce] ||
                (userOrderNonceStatus != bytes32(0) && userOrderNonceStatus != orderHash)
            ) {
                revert NoncesInvalid();
            }
        }

        (
            uint256[] memory itemIds,
            uint256[] memory amounts,
            address[2] memory recipients,
            uint256[3] memory feeAmounts,
            bool isNonceInvalidated
        ) = _executeStrategyForTakerOrder(takerBid, makerAsk, msg.sender);

        // Order nonce status is updated
        _updateUserOrderNonce(isNonceInvalidated, signer, makerAsk.orderNonce, orderHash);


        (uint16 makerChainId, uint16 takerChainId) = (makerAsk.lzChainId, takerBid.lzChainId);

        if (makerChainId == takerChainId) {
            // Taker action goes first
            require(makerAsk.currency == takerBid.currency, "OmniXExchange: Currency mismatch");

            _transferToAskRecipientAndCreatorIfAny(recipients, feeAmounts, makerAsk.currency, sender);
            // Maker action goes second
            _transferNFT(
            makerAsk.collection,
            makerAsk.collectionType,
            signer,
            takerBid.recipient == address(0) ? sender : takerBid.recipient,
            itemIds,
            amounts
            );
        } else {
            (uint256 omnixMessageFee, uint256 crossChainCurrencyFee,) = getLzFees(
                takerBid,
                makerAsk,
                destAirdrop, 
                itemIds,
                amounts,
                recipients,
                feeAmounts,
                affiliate
                ); 
            require(omnixMessageFee + crossChainCurrencyFee <= msg.value, "OmniXExchange: Insufficient value for cross chain transfer");

            if (omnixMessageFee != 0) {
                _sendCrossMessage(takerBid, makerAsk, 0);
                _transferToAskRecipientAndCreatorIfAny(recipients, feeAmounts, makerAsk.currency, sender);
            } else {
                bytes memory sgPayload = _getSgPayload(takerBid, makerAsk);
                _transferProxyFunds(
                    takerBid.currency,
                    takerBid.recipient == address(0) ? sender : takerBid.recipient,
                    makerAsk.price,
                    takerChainId,
                    makerChainId,
                    sgPayload
                );
            }
        }

       
       

        emit TakerBid(
            NonceInvalidationParameters({
                orderHash: orderHash,
                orderNonce: makerAsk.orderNonce,
                isNonceInvalidated: isNonceInvalidated
            }),
            sender,
            takerBid.recipient == address(0) ? sender : takerBid.recipient,
            makerAsk.strategyId,
            makerAsk.currency,
            makerAsk.collection,
            itemIds,
            amounts,
            recipients,
            feeAmounts
        );

        // It returns the protocol fee amount
        return feeAmounts[2];
    }

    function _sendCrossMessage(
        OrderStructs.Taker calldata taker,
        OrderStructs.Maker calldata maker,
        uint destAirdrop
    ) internal {
        
        require(trustedRemoteLookup[maker.lzChainId].length != 0, "LzSend: dest chain is not trusted");

        (uint256 messageFee, bytes memory payload, bytes memory adapterParams) = _getLzPayload(destAirdrop, taker, maker);
        lzEndpoint.send{value: messageFee}(maker.lzChainId, trustedRemoteLookup[maker.lzChainId], payload, payable(msg.sender), address(0), adapterParams);
    }

    /**
     * @notice This function is internal and is used to pay the protocol fee and affiliate fee (if any).
     * @param currency Currency address to transfer (address(0) is ETH)
     * @param bidUser Bid user address
     * @param affiliate Affiliate address (address(0) if none)
     * @param totalProtocolFeeAmount Total protocol fee amount (denominated in the currency)
     */
    function _payProtocolFeeAndAffiliateFee(
        address currency,
        address bidUser,
        address affiliate,
        address from,
        uint256 totalProtocolFeeAmount

    ) internal {
        if (totalProtocolFeeAmount != 0) {
            if (affiliate != address(0)) {
                // Check whether affiliate program is active and whether to execute a affiliate logic
                // If so, it adjusts the protocol fee downward.
                if (isAffiliateProgramActive) {
                    uint256 totalAffiliateFeeAmount = (totalProtocolFeeAmount * affiliateRates[affiliate]) /
                        ONE_HUNDRED_PERCENT_IN_BP;

                    if (totalAffiliateFeeAmount != 0) {
                        totalProtocolFeeAmount -= totalAffiliateFeeAmount;

                        // If bid user isn't the affiliate, pay the affiliate.
                        // If currency is ETH, funds are returned to sender at the end of the execution.
                        // If currency is ERC20, funds are not transferred from bidder to bidder
                        // (since it uses transferFrom).
                        if (bidUser != affiliate) {
                            _transferFungibleTokens(currency, from , affiliate, totalAffiliateFeeAmount);
                        }

                        emit AffiliatePayment(affiliate, currency, totalAffiliateFeeAmount);
                    }
                }
            }

            // Transfer remaining protocol fee to the protocol fee recipient
            _transferFungibleTokens(currency, from , protocolFeeRecipient, totalProtocolFeeAmount);
        }
    }

    /**
     * @notice This function is internal and is used to transfer fungible tokens.
     * @param currency Currency address
     * @param sender Sender address
     * @param recipient Recipient address
     * @param amount Amount (in fungible tokens)
     */
    function _transferFungibleTokens(address currency, address sender, address recipient, uint256 amount) internal {
        if (currency == address(0)) {
            _transferETHAndWrapIfFailWithGasLimit(WETH, recipient, amount, _gasLimitETHTransfer);
        } else {
            _executeERC20TransferFrom(currency, sender, recipient, amount);
        }
    }

    /**
     * @notice This function is private and used to transfer funds to
     *         (1) creator recipient (if any)
     *         (2) ask recipient.
     * @param recipients Recipient addresses
     * @param feeAmounts Fees
     * @param currency Currency address
     * @param from Bid user address
     * @dev It does not send to the 0-th element in the array since it is the protocol fee,
     *      which is paid later in the execution flow.
     */
    function _transferToAskRecipientAndCreatorIfAny(
        address[2] memory recipients,
        uint256[3] memory feeAmounts,
        address currency,
        address from
    ) private {
        // @dev There is no check for address(0) since the ask recipient can never be address(0)
        // If ask recipient is the maker --> the signer cannot be the null address
        // If ask is the taker --> either it is the sender address or
        // if the recipient (in TakerAsk) is set to address(0), it is adjusted to the original taker address
        uint256 sellerProceed = feeAmounts[0];
        if (sellerProceed != 0) {
            _transferFungibleTokens(currency, from, recipients[0], sellerProceed);
        }

        // @dev There is no check for address(0), if the creator recipient is address(0), the fee is set to 0
        uint256 creatorFeeAmount = feeAmounts[1];
        if (creatorFeeAmount != 0) {
            _transferFungibleTokens(currency, from, recipients[1], creatorFeeAmount);
        }
    }



    function _transferProxyFunds(
        address currency,
        address from,
        uint price, 
        uint16 fromChainId,
        uint16 toChainId,
        bytes memory payload
    ) internal {

        address to = this.getTrustedRemoteAddress(toChainId).toAddress(0);
        
        if (currency == WETH) {
            if (fromChainId != toChainId && 
                address(stargatePoolManager) != address(0) &&
                stargatePoolManager.isSwappable(WETH, toChainId)
            ) {
                stargatePoolManager.swapETH{value: msg.value}(toChainId, payable(from), price, to, payload);
            }
            else {
                payable(to).transfer(price);
            }
        } else {
            if (isOmniCurrency(currency)) {
                if (fromChainId == toChainId) {
                    _safeTransferFrom(currency, from, to, price);
                } else {
                    bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, gasForOmniLzReceive);
                    IOFT(currency).sendFrom{value: msg.value - price}(
                        from,
                        toChainId,
                        abi.encodePacked(to),
                        price,
                        payable(address(this)),
                        address(0x0),
                        adapterParams,
                        payload
                    );
                }
            } else {
                if (
                fromChainId != toChainId && 
                address(stargatePoolManager) != address(0) &&
                stargatePoolManager.isSwappable(currency, toChainId)
                ) {
                    stargatePoolManager.swap{value: msg.value - price}(currency, toChainId, payable(address(this)), price, from, to, payload);
                }
                else {
                    _safeTransferFrom(currency, from, to, price);
                }
            }

        }
    }

    function _safeTransferFrom(address currency, address from, address to, uint amount) private {
        if (from == address(this)) {
            IERC20(currency).safeTransfer(to, amount);
        } else {
            IERC20(currency).safeTransferFrom(from, to, amount);
        }
    }

    /**
     * @notice This function is private and used to compute the domain separator and store the current chain id.
     */
    function _updateDomainSeparator() private {
        domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("LooksRareProtocol"),
                keccak256(bytes("2")),
                block.chainid,
                address(this)
            )
        );
        chainId = block.chainid;
    }

    /**
     * @notice This function is internal and is called during the execution of a transaction to decide
     *         how to map the user's order nonce.
     * @param isNonceInvalidated Whether the nonce is being invalidated
     * @param signer Signer address
     * @param orderNonce Maker user order nonce
     * @param orderHash Hash of the order struct
     * @dev If isNonceInvalidated is true, this function invalidates the user order nonce for future execution.
     *      If it is equal to false, this function maps the order hash for this user order nonce
     *      to prevent other order structs sharing the same order nonce to be executed.
     */
    function _updateUserOrderNonce(
        bool isNonceInvalidated,
        address signer,
        uint256 orderNonce,
        bytes32 orderHash
    ) private {
        userOrderNonce[signer][orderNonce] = (isNonceInvalidated ? MAGIC_VALUE_ORDER_NONCE_EXECUTED : orderHash);
    }

    /**
     * @notice This function is private and used to verify the chain id, compute the digest, and verify the signature.
     * @dev If chainId is not equal to the cached chain id, it would revert.
     * @param computedHash Hash of order (maker bid or maker ask) or merkle root
     * @param makerSignature Signature of the maker
     * @param signer Signer address
     */
    function _computeDigestAndVerify(bytes32 computedHash, bytes calldata makerSignature, address signer) private view {
        if (chainId == block.chainid) {
            // \x19\x01 is the standard encoding prefix
            SignatureCheckerCalldata.verify(
                keccak256(abi.encodePacked("\x19\x01", domainSeparator, computedHash)),
                signer,
                makerSignature
            );
        } else {
            revert ChainIdInvalid();
        }
    }

    /**
     * @notice This function is private and called to verify whether the merkle proofs provided for the order hash
     *         are correct or verify the order hash if the order is not part of a merkle tree.
     * @param merkleTree Merkle tree
     * @param orderHash Order hash (can be maker bid hash or maker ask hash)
     * @param signature Maker order signature
     * @param signer Maker address
     * @dev It verifies (1) merkle proof (if necessary) (2) signature is from the expected signer
     */
    function _verifyMerkleProofOrOrderHash(
        OrderStructs.MerkleTree calldata merkleTree,
        bytes32 orderHash,
        bytes calldata signature,
        address signer
    ) private view {
        uint256 proofLength = merkleTree.proof.length;

        if (proofLength != 0) {
            if (proofLength > MAX_CALLDATA_PROOF_LENGTH) {
                revert MerkleProofTooLarge(proofLength);
            }

            if (!MerkleProofCalldataWithNodes.verifyCalldata(merkleTree.proof, merkleTree.root, orderHash)) {
                revert MerkleProofInvalid();
            }

            orderHash = hashBatchOrder(merkleTree.root, proofLength);
        }

        _computeDigestAndVerify(orderHash, signature, signer);
    }

    // add sg receive  

    function transferNFTLz(address collection, CollectionType collectionType, address from, address to, uint[] itemIds, uint[] amounts) external {
        require (msg.sender == address(this), "_transferNFTLz: invalid caller");

        _transferNFT(
            collection,
            collectionType,
            from,
            to,
            itemIds,
            amounts
        );
    }

    function _tokenReceived(
        uint256 _price,
        bytes memory _payload
    ) internal {
        (
            address collection,
            CollectionType collectionType,
            address seller,
            address buyer,
            uint256[] memory itemIds,
            uint256[] memory amounts,
            address currency,
            uint256 strategyId,
            address[2] memory recipients,
            uint256[3] memory feeAmounts,
            address affiliate,
            bytes memory royaltyInfo
        ) = abi.decode(_payload, (
            address,
            CollectionType,
            address,
            address,
            uint256[],
            uint256[],
            address,
            uint256,
            address[2],
            uint256[3],
            address,
            bytes
        ));


        try this.transferNFTLz(collection, collectionType, seller, buyer, itemIds, amounts) {
            _transferToAskRecipientAndCreatorIfAny(
                recipients,
                feeAmounts,
                currency,
                address(this)
            );
            _payProtocolFeeAndAffiliateFee(currency, buyer, affiliate, address(this), feeAmounts[2]);
        } catch (bytes memory reason) {
            if (currency == WETH) {
                payable(buyer).transfer(_price);
            } else {
                _transferFungibleTokens(currency, address(this), buyer, _price);
            }
        }
    }

    function sgReceive(
        uint16,
        bytes memory,
        uint256,
        address,
        uint256 _price,
        bytes memory _payload
    ) external override {
        if (_payload.length == 0) return;

        _tokenReceived(_price, _payload);
    }

    
    function _nonblockingLzReceive(uint16 _srcChainId, bytes memory _srcAddress, uint64 _nonce, bytes memory _payload) internal virtual override{
        (uint8 lzMessage) = abi.decode(_payload, (uint8));
        
        if (lzMessage == LZ_MESSAGE_ORDER_ASK){
            (, address collection, CollectionType _collectionType ,address from, address to, uint[] memory itemIds, uint[] memory amounts) = 
                abi.decode(_payload, (uint8, address, CollectionType, address, address, uint[], uint[]));

            _transferNFT(collection, _collectionType, from, to, itemIds, amounts);
        } 
        // else if (lzMessage == LZ_MESSAGE_ORDER_BID) {
        //     (   ,
        //         address collection,
        //         CollectionType _collectionType,
        //         uint[] memory itemIds,
        //         uint[] memory amounts,
        //         uint price,
        //         OrderStructs.PartyData memory takerParty,
        //         OrderStructs.PartyData memory makerParty,
        //         bytes memory royaltyInfo
        //     ) = abi.decode(_payload, (
        //         uint8, address, CollectionType, uint[], uint[], uint, OrderStructs.PartyData, OrderStructs.PartyData, bytes
        //     ));

        //     bytes memory sgPayload = abi.encode(
        //         collection,
        //         _collectionType,        // collection
        //         takerParty.party,       // seller
        //         makerParty.party,       // buyer
        //         itemIds,                // tokenId
        //         amounts,                 // amount for 1155
        //         takerParty.currency,    // currency
        //         takerParty.strategy,    // strategy
        //         royaltyInfo             // royalty info
        //     );

            // uint256 currencyFee = lzFeeTransferCurrency(
            //     makerParty.currency,    // currency
            //     takerParty.party,       // to
            //     price,                  // price
            //     makerParty.chainId,     // fromChainId
            //     takerParty.chainId,     // takerChainId
            //     sgPayload
            // );

            // if (currencyFee == 0) {
            //     // on maker chain (buyer)
            //     // if currencyFee is 0, already tranferred NFT.
            //     // thus here just transfer funds and fees.
            //     _transferToAskRecipientAndCreatorIfAny(makerParty.strategy, makerParty.currency, price, makerParty.party, takerParty.party, royaltyInfo);
            // }
        //}
    }
}