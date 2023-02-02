// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ITransferManagerNFT} from "../interfaces/ITransferManagerNFT.sol";
import {NonblockingLzApp} from "../lzApp/NonblockingLzApp.sol";
import "hardhat/console.sol";
/**
 * @title TransferManagerGhosts
 * @notice It allows the transfer of GhostlyGhosts tokens.
 */
abstract contract TransferManagerLzBase is ITransferManagerNFT, NonblockingLzApp {
    uint16 public constant MT_ON_SRC_CHAIN = 1;
    uint16 public constant MT_ON_DST_CHAIN = 2;
    uint16 public constant LZ_ADAPTER_VERSION = 1;

    uint256 public gasForOnftLzReceive = 350000;

    event ReceiveFromDstChain(uint16 chainId, address collection, address from, address to, uint tokenId, uint amount, uint64 _nonce);
    event ReceiveFromSrcChain(uint16 chainId, address collection, address from, address to, uint tokenId, uint amount, uint64 _nonce);

    /**
     * @notice Constructor
     */
    constructor(address _lzEndpoint) NonblockingLzApp(_lzEndpoint) {
    }

    /**
    * @notice set gas for onft destination layerzero receive
    */
    function setGasForOmniLZReceive(uint256 gas) external onlyOwner {
        gasForOnftLzReceive = gas;
    }

    /**
     * @notice Transfer ERC721 token
     * @param collectionFrom address of the collection on from chain
     * @param collectionTo address of the collection on current chain
     * @param from address of the sender
     * @param to address of the recipient
     * @param tokenId tokenId
     * @param fromChainId nft source chain id
     * @param toChainId layerzero remote chain id
     * @dev For ERC721, amount is not used
     */
    function transferNFT(
        address collectionFrom,
        address collectionTo,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 fromChainId,
        uint16 toChainId
    ) external payable override {
        if (fromChainId == toChainId) {
            _normalTransfer(collectionFrom, from, to, tokenId, amount);
        }
        else {
            if (_onReceiveOnSrcChain(collectionFrom, from, to, tokenId, amount, toChainId)) {
                _crossSendToDst(collectionFrom, collectionTo, from, to, tokenId, amount, toChainId);
            }
        }
    }

    function proxyTransfer(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) external override {
        console.log("proxy nft", collection, to);
        _normalTransfer(collection, from, to, tokenId, amount);
    }

    /**
     * @notice Estimate gas fees for cross transfering nft.
     */
    function estimateSendFee(
        address,
        address,
        address,
        address,
        uint256,
        uint256,
        uint16,
        uint16
    )
        virtual public view override
        returns (uint, uint)
    {
        return (0, 0);
    }

    /**
     * @notice message listener from LayerZero endpoint
     * @param _srcChainId chain id where the message was sent from
     * @param _nonce nonce
     * @param _payload message data
     * @dev no need to change this function
     */
    function _nonblockingLzReceive(uint16 _srcChainId, bytes memory, uint64 _nonce, bytes memory _payload) internal virtual override {
        // decode and load the toAddress
        uint16 chainId = _srcChainId;
        uint64 nonce = _nonce;
        (uint16 messageType, address fromAddress, address toAddress, , address collectionTo, uint tokenId, uint amount) = 
            abi.decode(_payload, (uint16, address, address, address, address, uint, uint));

        // if the toAddress is 0x0, convert to dead address, or it will get cached
        if (toAddress == address(0x0)) toAddress == address(0xdEaD);

        if (messageType == MT_ON_DST_CHAIN) {
            emit ReceiveFromSrcChain(chainId, collectionTo, fromAddress, toAddress, tokenId, amount, nonce);

            // transfer nft from this to toAddr on dst chain
            _onReceiveOnDstChain(collectionTo, fromAddress, toAddress, tokenId, amount, chainId);

        }
    }

    function _getCrossFeeAndPayload(
        address collectionFrom,
        address collectionTo,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 dstChainId
    ) internal view returns (uint256, bytes memory, bytes memory) {
        bytes memory adapterParams = abi.encodePacked(LZ_ADAPTER_VERSION, gasForOnftLzReceive);
        bytes memory payload = abi.encode(MT_ON_DST_CHAIN, from, to, collectionFrom, collectionTo, tokenId, amount);
        (uint256 messageFee,) = lzEndpoint.estimateFees(dstChainId, address(this), payload, false, adapterParams);

        return (messageFee, payload, adapterParams);
    }

    /**
     * @notice cross send from maker chain to taker chain.
     * @dev this function is called after _onReceiveOnSrcChain
     */
    function _crossSendToDst(
        address collectionFrom,
        address collectionTo,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 dstChainId
    ) internal {
        require(trustedRemoteLookup[dstChainId].length != 0, "LzSend: destination chain is not a trusted source.");

        (uint256 fee, bytes memory payload, bytes memory adapterParams) = _getCrossFeeAndPayload(collectionFrom, collectionTo, from, to, tokenId, amount, dstChainId);
        lzEndpoint.send{value: fee}(dstChainId, trustedRemoteLookup[dstChainId], payload, payable(this), address(0x0), adapterParams);
    }

    receive() external payable {
        // nothing to do
    }
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    /**
     * @notice cross send from maker chain to taker chain.
     * @return bool true if need to call _crossSendToDst, otherwise false
     * @dev this function is called when receive MT_ON_SRC_CHAIN and running on maker chain
     */
    function _onReceiveOnSrcChain(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 dstChainId
    ) virtual internal returns(bool);

    /**
     * @notice cross send from taker chain to maker chain.
     * @return bool no meaning right now
     * @dev this function is called when receive MT_ON_DST_CHAIN and running taker chain
     */
    function _onReceiveOnDstChain(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 dstChainId
    ) virtual internal returns(bool);

    /**
     * @notice normal send from maker to taker.
     * @dev this function is called when maker and taker is on same chain
     */
    function _normalTransfer(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) virtual internal;
}