// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LRTokenMock is ERC20
{
  constructor() ERC20("LooksRare Token", "lkr") {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}
