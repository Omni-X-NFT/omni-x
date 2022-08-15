// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITransferManagerNFT {
    function transferNonFungibleToken(
        address collectionFrom,
        address collectionTo,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 remoteChainId,
        bool remoteSend
    ) external payable;

    function estimateSendFee(
        address collectionFrom,
        address collectionTo,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 remoteChainId,
        bool remoteSend
    ) external view returns (uint nativeFee, uint zroFee);
}