// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.0;
pragma abicoder v2;

interface IStargateRouterETH {
    function addLiquidityETH() external payable;

    function swapETH(
        uint16 _dstChainId,
        address payable _refundAddress,
        bytes calldata _to,
        uint256 _amountLD,
        uint256 _minAmountLD
    ) external payable;
}