// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/mocks/ERC721AMock.sol";

contract GasTest is Test {


  ERC721AMock public nftMock;
  address public owner;
  function setUp() public {
    nftMock = new ERC721AMock("NAME", "SYM", 1);
    owner = msg.sender;
  }



  function testTenNFTs() public {
    vm.prank(owner);
    nftMock.mint(10);
  }
  function testTwentyNFTs() public {
    vm.prank(owner);
    nftMock.mint(20);
  }

  function testThirtyNFTs() public {
    vm.prank(owner);
    nftMock.mint(30);
  }

  function testFourtyNFTs() public {
    vm.prank(owner);
    nftMock.mint(40);
  }

  function test50NFTs() public {
    vm.prank(owner);
    nftMock.mint(50);
  }
  
}
