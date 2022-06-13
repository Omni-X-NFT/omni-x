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
contract OmniXExchange2 {
    string private constant SIGNING_DOMAIN = "OmniXExchange";
    string private constant SIGNATURE_VERSION = "1";
    uint16 private constant LZ_ADAPTER_VERSION = 1;
    uint256 private constant LZ_ADAPTER_GAS = 3500000;

    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    using OrderTypes for OrderTypes.MakerOrder;
    using OrderTypes for OrderTypes.TakerOrder;


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
     * @notice get layerzero fees for matching a takerBid with a matchAsk
     * @param takerBid taker bid order
     * @param makerAsk maker ask order
     */
    function getLzFeesForAskWithTakerBid(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk)
        external
        view
        returns (uint256)
    {
        IRemoteAddrManager remoteAddrManager = IRemoteAddrManager(0x66d2F3F602deebeB59F50440ED700be99ea82DE3);
        (uint16 fromChainId) = makerAsk.decodeParams();
        address currency = remoteAddrManager.checkRemoteAddress(makerAsk.currency, fromChainId);
        address collection = remoteAddrManager.checkRemoteAddress(makerAsk.collection, fromChainId);

        uint256 currencyFee = _lzFeeTransferCurrency(currency, makerAsk.signer, takerBid.price, fromChainId);

        uint256 nftFee = _lzFeeTransferNFT(
            makerAsk.collection, collection, makerAsk.signer, takerBid.taker, makerAsk.tokenId, makerAsk.amount, fromChainId);

        return currencyFee + nftFee;
    }

    function getLzFeesForAskWithTakerBid2(OrderTypes.TakerOrder calldata takerBid, OrderTypes.MakerOrder calldata makerAsk)
        external
        view
        returns (address)
    {
        IRemoteAddrManager remoteAddrManager = IRemoteAddrManager(0x66d2F3F602deebeB59F50440ED700be99ea82DE3);
        (uint16 fromChainId) = makerAsk.decodeParams();
        address currency = remoteAddrManager.checkRemoteAddress(makerAsk.currency, fromChainId);
        
        return currency;
    }

    function _lzFeeTransferNFT(
        address collectionFrom,
        address collectionTo,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 fromChainId
    ) public view returns(uint256) {
        address transferManager = 0x182aaa53a8aAc7a5050b19eC122aB446136942DD;

        // If one is found, transfer the token
        (uint256 messageFee, ) = ITransferManagerNFT(transferManager).estimateSendFee(collectionFrom, collectionTo, from, to, tokenId, amount, fromChainId);
        return messageFee;
    }

    function _lzFeeTransferCurrency(
        address currency,
        address to,
        uint256 amount,
        uint16 fromChainId
    ) public view returns(uint) {
        // use adapterParams v1 to specify more gas for the destination
        bytes memory toAddress = abi.encodePacked(to);
        // bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, LZ_ADAPTER_GAS);
        // get the fees we need to pay to LayerZero for message delivery
        (uint messageFee, ) = IOFT(currency).estimateSendFee(fromChainId, toAddress, amount, false, bytes(""));
        return messageFee;
    }

}