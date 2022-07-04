// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.0;
pragma abicoder v2;

interface IStargatePoolManager {
    struct PoolID {
        uint256 srcPoolId;
        uint256 dstPoolId;
    }
    
    function swap(
        address token,
        uint16 dstChainId,
        address payable refundAddress,
        uint256 amount,
        address to
    ) external payable;

    function setPoolId(address token, uint16 dstChainId, uint256 srcPoolId, uint256 dstPoolId) external;
    function getPoolId(address token, uint16 dstChainId) external view returns (PoolID memory);
    function isSwappable(address token, uint16 dstChainId) external view returns (bool);
}
