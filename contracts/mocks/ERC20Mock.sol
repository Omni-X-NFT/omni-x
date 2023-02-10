// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20
{
  constructor() ERC20("USDC", "TEST") {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}
