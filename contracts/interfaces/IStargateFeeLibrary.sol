// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.2;
pragma abicoder v2;
import "../stargate/Pool.sol";

interface IStargateFeeLibrary {
    function getFees(
        uint256 _srcPoolId,
        uint256 _dstPoolId,
        uint16 _dstChainId,
        address _from,
        uint256 _amountSD
    ) external returns (Pool.SwapObj memory s);

    function getVersion() external view returns (string memory);
}