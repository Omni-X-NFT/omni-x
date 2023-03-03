// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.2;
import {IStargateFeeLibrary} from "../interfaces/IStargateFeeLibrary.sol";
import {Pool} from "../stargate/Pool.sol";

contract StargateFeeLibraryMock is IStargateFeeLibrary {
  /**
    uint256 _srcPoolId,
    uint256 _dstPoolId,
    uint16 _dstChainId,
    address _from,
    uint256 _amountSD
   */
  function getFees(
    uint256,
    uint256,
    uint16,
    address,
    uint256 _amountSD
  ) external pure override returns (Pool.SwapObj memory s) {
    s.amount = _amountSD;
    s.eqFee = 0;
    s.eqReward = 0;
    s.lpFee = 0;
    s.protocolFee = 0;
    s.lkbRemove = 0;
  }

  function getVersion() external pure override returns (string memory) {
    return "1";
  }
}