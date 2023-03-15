// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract Nft1155Mock is ERC1155
{
  constructor() ERC1155("https://example.uri") {}

  function mint(address to, uint id, uint amount) external {
    _mint(to, id, amount, bytes("0x0"));
  }
}