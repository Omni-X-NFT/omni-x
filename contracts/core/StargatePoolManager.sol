// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStargateRouter} from "../interfaces/IStargateRouter.sol";
import {IStargatePoolManager} from "../interfaces/IStargatePoolManager.sol";

contract StargatePoolManager is IStargatePoolManager, Ownable {
  uint8 internal constant TYPE_SWAP_REMOTE = 1;   // from Bridge.sol
  uint256 internal constant MIN_AMOUNT_LD = 1e4;  // the min amount you would accept on the destination when swapping using stargate

  // IERC20 => dst chain id => pool id
  mapping (address => mapping (uint16 => PoolID)) public poolIds;
  IStargateRouter public stargateRouter;

  constructor(address stargateRouter_) {
    stargateRouter = IStargateRouter(stargateRouter_);
  }

  /**
    * @notice set ERC20 token pool informations
    * @param token ERC20 token address
    * @param dstChainId destination chain id in layerZero
    * @param srcPoolId src pool id for ERC20 token
    * @param dstPoolId dst pool id for ERC20 token
   */
  function setPoolId(address token, uint16 dstChainId, uint256 srcPoolId, uint256 dstPoolId) public onlyOwner {
    poolIds[token][dstChainId].srcPoolId = srcPoolId;
    poolIds[token][dstChainId].dstPoolId = dstPoolId;
  }

  /**
    * @notice get ERC20 token pool informations
    * @param token ERC20 token address
    * @param dstChainId destination chain id in layerZero
    * @return pool structure contains srcPoolId, dstPoolId
   */
  function getPoolId(address token, uint16 dstChainId) public view returns (PoolID memory) {
    return poolIds[token][dstChainId];
  }

  /**
    * @notice check if ERC20 token is swappable using Stargate
    * @param token ERC20 token address
    * @param dstChainId destination chain id in layerZero
   */
  function isSwappable(address token, uint16 dstChainId) public view returns (bool) {
    PoolID storage poolId = poolIds[token][dstChainId];

    if (poolId.srcPoolId == 0 || poolId.dstPoolId == 0) {
      return false;
    }

    return true;
  }


  /**
    * @notice swap ERC20 token to 
    * @param dstChainId address of the execution strategy
    * @param refundAddress non fungible token address for the transfer
    * @param amount tokenId
    * @param to seller's recipient
    */
  function swap(
    address token,
    uint16 dstChainId,
    address payable refundAddress,
    uint256 amount,
    address to
  ) external payable {
    PoolID memory poolId = getPoolId(token, dstChainId);
    IStargateRouter.lzTxObj memory lzTxParams = IStargateRouter.lzTxObj(0, 0, "0x");
    bytes memory payload = bytes("");
    bytes memory toAddress = abi.encodePacked(to);

    (uint256 fee, ) = stargateRouter.quoteLayerZeroFee(
      dstChainId,
      TYPE_SWAP_REMOTE,
      toAddress,
      payload,
      lzTxParams
    );

    stargateRouter.swap{value: fee}(
      dstChainId,
      poolId.srcPoolId,
      poolId.dstPoolId,
      refundAddress,
      amount,
      MIN_AMOUNT_LD,
      lzTxParams,
      toAddress,
      payload
    );
  }
}
