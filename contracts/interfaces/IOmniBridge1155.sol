// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @dev Interface of the Omni Bridge
 */
interface IOmniBridge1155 {
    /**
     * @dev 
     */
    function wrap(uint16 _dstChainId, address _toAddress, address _erc1155Address, uint256 _tokenId, uint256 _amount, bytes memory _adapterParams) external payable;

    /**
     * @dev 
     */
    function withdraw(address _onftAddress, uint256 _tokenId, uint256 _amount) external;

    /**
     * @dev Emitted when `_tokenId` are moved from the `_sender` to (`_dstChainId`, `_toAddress`)
     * `_nonce` is the outbound nonce from
     */
    event SendToChain(address indexed _sender, uint16 indexed _dstChainId, bytes indexed _toAddress, uint _tokenId, uint64 _nonce);

    /**
     * @dev Emitted when `_tokenId` are sent from `_srcChainId` to the `_toAddress` at this chain. `_nonce` is the inbound nonce.
     */
    event ReceiveFromChain(uint16 indexed _srcChainId, bytes indexed _srcAddress, address indexed _toAddress, uint _tokenId, uint64 _nonce);
}