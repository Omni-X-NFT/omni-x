// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Nft721Mock is ERC721
{
  uint256 private _currentIndex;
  constructor() ERC721("LooksRare NFT", "LR") {
    _currentIndex = 0;
  }

  function mint(address to) external {
    _currentIndex = _currentIndex + 1;
    _mint(to, _currentIndex);
  }
}
