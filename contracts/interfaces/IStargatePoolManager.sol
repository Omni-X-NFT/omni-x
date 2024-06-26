// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.0;
pragma abicoder v2;

interface IStargatePoolManager {
    struct PoolID {
        uint256 srcPoolId;
        uint256 dstPoolId;
    }
    
    function getSwapFee(
        uint16 dstChainId,
        address to,
        bytes memory payload
    ) external view returns (uint256, uint256);

    function getStargateRouter() external view returns(address);

    function swap(
        address token,
        uint16 dstChainId,
        address payable refundAddress,
        uint256 amount,
        address from,
        address to,
        bytes memory payload
    ) external payable;

    function getSwapFeeETH(
        uint16 dstChainId,
        address to
    ) external view returns (uint256, uint256);

    function swapETH(
        uint16 dstChainId,
        address payable refundAddress,
        uint256 amount,
        address to,
        bytes memory payload
    ) external payable;

    function setPoolId(address token, uint16 dstChainId, uint256 srcPoolId, uint256 dstPoolId) external;
    function getPoolId(address token, uint16 dstChainId) external view returns (PoolID memory);
    function isSwappable(address token, uint16 dstChainId) external view returns (bool);
}
