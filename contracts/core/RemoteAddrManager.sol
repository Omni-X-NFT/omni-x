// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import {IRemoteAddrManager} from "../interfaces/IRemoteAddrManager.sol";

/**
 * @title TransferSelectorNFT
 * @notice It selects the NFT transfer manager based on a collection address.
 */
contract RemoteAddrManager is IRemoteAddrManager, Ownable {
    // Map (remoteAddr => remoteChainId => srcAddr) : srcAddr/srcChain <=> remoteAddr/currentChain
    mapping(address => mapping(uint16 => address)) public remoteAddresses;

    event RemoteAddressAdded(address indexed remoteAddr, uint16 indexed remoteChainId, address srcAddr);
    event RemoteAddressRemoved(address indexed remoteAddr, uint16 indexed remoteChainid);

    function addRemoteAddress(address remoteAddr, uint16 remoteChainId, address srcAddr) external onlyOwner {
        require(srcAddr != address(0), "Owner: source cannot be null address");
        require(remoteAddr != address(0), "Owner: remote cannot be null address");

        remoteAddresses[remoteAddr][remoteChainId] = srcAddr;

        emit RemoteAddressAdded(remoteAddr, remoteChainId, srcAddr);
    }

    function removeRemoteAddress(address remoteAddr, uint16 remoteChainId) external onlyOwner {
        require(remoteAddresses[remoteAddr][remoteChainId] != address(0), "Owner: no remote address");

        remoteAddresses[remoteAddr][remoteChainId] = address(0);

        emit RemoteAddressRemoved(remoteAddr, remoteChainId);
    }

    /**
     * @notice Check if remoteAddress was added
     * @param remoteAddress remote contract address
     * @param remoteAddress remote chain id
     */
    function checkRemoteAddress(address remoteAddress, uint16 remoteChainId) external view override returns (address) {
        address srcAddr = remoteAddresses[remoteAddress][remoteChainId];

        return srcAddr;
    }
}