// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/mocks/ERC721Mock.sol";

contract GasTest is Test {


  ERC721Mock public nftMock;
  address public owner;
  function setUp() public {
    nftMock = new ERC721Mock();
    owner = msg.sender;
  }



  function testTenNFTs() public {
    vm.prank(owner);
    nftMock.batchMint(10);
  }
  function testTwentyNFTs() public {
    vm.prank(owner);
    nftMock.batchMint(20);
  }

  function testThirtyNFTs() public {
    vm.prank(owner);
    nftMock.batchMint(30);
  }

  function testFourtyNFTs() public {
    vm.prank(owner);
    nftMock.batchMint(40);
  }

  function test50NFTs() public {
    vm.prank(owner);
    nftMock.batchMint(50);
  }
  
}
