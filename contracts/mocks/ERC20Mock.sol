// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../stargate/LPTokenERC20.sol";

contract ERC20Mock is LPTokenERC20
{
  constructor() LPTokenERC20("USDC", "usd") {
    decimals = 18;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}