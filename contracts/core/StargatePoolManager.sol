// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IStargateRouter} from "../interfaces/IStargateRouter.sol";
import {IStargatePoolManager} from "../interfaces/IStargatePoolManager.sol";
import {IStargateEthVault} from "../interfaces/IStargateEthVault.sol";

contract StargatePoolManager is IStargatePoolManager, Ownable {
  uint8 internal constant TYPE_SWAP_REMOTE = 1;   // from Bridge.sol
  uint256 internal constant MIN_AMOUNT_LD = 1e4;  // the min amount you would accept on the destination when swapping using stargate

  address public immutable stargateEthVault;
  // IERC20 => dst chain id => pool id
  mapping (address => mapping (uint16 => PoolID)) public poolIds;
  IStargateRouter public stargateRouter;
  uint256 public gasForSgReceive = 350000;
  uint16 public ETH_POOL_ID = 13;

  constructor(address stargateRouter_, address stargateEthVault_) {
    stargateRouter = IStargateRouter(stargateRouter_);
    stargateEthVault = stargateEthVault_;
  }

  function setStargateRouter(address stargateRouter_) external onlyOwner {
    stargateRouter = IStargateRouter(stargateRouter_);
  }

  function setGasForSgReceive(uint256 gas) external onlyOwner {
    gasForSgReceive = gas;
  }

  /**
    * @notice set ERC20 token pool informations
    * @param token ERC20 token address
    * @param dstChainId destination chain id in layerZero
    * @param srcPoolId src pool id for ERC20 token
    * @param dstPoolId dst pool id for ERC20 token
   */
  function setPoolId(address token, uint16 dstChainId, uint256 srcPoolId, uint256 dstPoolId) public override onlyOwner {
    poolIds[token][dstChainId].srcPoolId = srcPoolId;
    poolIds[token][dstChainId].dstPoolId = dstPoolId;
  }

  /**
    * @notice get ERC20 token pool informations
    * @param token ERC20 token address
    * @param dstChainId destination chain id in layerZero
    * @return pool structure contains srcPoolId, dstPoolId
   */
  function getPoolId(address token, uint16 dstChainId) public view override returns (PoolID memory) {
    return poolIds[token][dstChainId];
  }

  /**
    * @notice check if ERC20 token is swappable using Stargate
    * @param token ERC20 token address
    * @param dstChainId destination chain id in layerZero
   */
  function isSwappable(address token, uint16 dstChainId) public view override returns (bool) {
    PoolID storage poolId = poolIds[token][dstChainId];

    if (poolId.srcPoolId == 0 || poolId.dstPoolId == 0) {
      return false;
    }

    return true;
  }

  /**
    * @notice get swap fee of stargate
    * @param dstChainId address of the execution strategy
    * @param to seller's recipient
    */
  function getSwapFee(
    uint16 dstChainId,
    address to,
    bytes memory payload
  ) public view override returns (uint256, uint256) {
    IStargateRouter.lzTxObj memory lzTxParams = IStargateRouter.lzTxObj(gasForSgReceive, 0, "0x");
    bytes memory toAddress = abi.encodePacked(to);

    (uint256 fee, uint256 lzFee) = stargateRouter.quoteLayerZeroFee(
      dstChainId,
      TYPE_SWAP_REMOTE,
      toAddress,
      payload,
      lzTxParams
    );

    return (fee, lzFee);
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
    address from,
    address to,
    bytes memory payload
  ) external payable override {
    IStargateRouter.lzTxObj memory lzTxParams = IStargateRouter.lzTxObj(gasForSgReceive, 0, "0x");
    bytes memory toAddress = abi.encodePacked(to);
    PoolID memory poolId = getPoolId(token, dstChainId);

    IERC20(token).transferFrom(from, address(this), amount);
    IERC20(token).approve(address(stargateRouter), amount);

    stargateRouter.swap{value: msg.value}(
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

  /**
    * @notice get WETH swap fee
    * @param dstChainId address of the execution strategy
    * @param to seller's recipient
    */
  function getSwapFeeETH(
    uint16 dstChainId,
    address to
  ) public view override returns (uint256, uint256) {
    return getSwapFee(dstChainId, to, bytes(""));
  }

  function getStargateRouter() external view returns(address) {
    return address(stargateRouter);
  }

  /**
    * @notice swap WETH
    * @param dstChainId address of the execution strategy
    * @param refundAddress non fungible token address for the transfer
    * @param amount tokenId
    * @param to seller's recipient
    */
  function swapETH(
    uint16 dstChainId,
    address payable refundAddress,
    uint256 amount,
    address to,
    bytes memory payload
  ) external payable override {
    require (address(stargateEthVault) != address(0), "invalid router eth");
    require(msg.value > amount, "Stargate: msg.value must be > _amountLD");
    
    bytes memory toAddress = abi.encodePacked(to);

    // wrap the ETH into WETH
    IStargateEthVault(stargateEthVault).deposit{value: amount}();
    IStargateEthVault(stargateEthVault).approve(address(stargateRouter), amount);

    // messageFee is the remainder of the msg.value after wrap
    uint256 messageFee = msg.value - amount;
    IStargateRouter.lzTxObj memory lzTxParams = IStargateRouter.lzTxObj(gasForSgReceive, 0, "0x");

    // compose a stargate swap() using the WETH that was just wrapped
    stargateRouter.swap{value: messageFee}(
        dstChainId, // destination Stargate chainId
        ETH_POOL_ID, // WETH Stargate poolId on source
        ETH_POOL_ID, // WETH Stargate poolId on destination
        refundAddress, // message refund address if overpaid
        amount, // the amount in Local Decimals to swap()
        MIN_AMOUNT_LD, // the minimum amount swap()er would allow to get out (ie: slippage)
        lzTxParams,
        toAddress, // address on destination to send to
        payload // empty payload, since sending to EOA
    );
  }
}
