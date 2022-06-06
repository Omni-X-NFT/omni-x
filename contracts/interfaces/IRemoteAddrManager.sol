// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRemoteAddrManager {
    function checkRemoteAddress(address remoteAddress, uint16 remoteChainId) external view returns (address);
}