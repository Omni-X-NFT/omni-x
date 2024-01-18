// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../../interfaces/IBlast.sol";

contract YieldNFT is ERC721A, Ownable {
    uint256 public constant MAX_SUPPLY = 1000000000;
    uint256 public mintPrice = 0.001 ether;
    address public creatorAddress;

    constructor(address _creatorAddress) ERC721A("YieldNFT", "YNFT") {
      IBlast(0x4300000000000000000000000000000000000002).configureAutomaticYield();
      creatorAddress = _creatorAddress;

      //mint token Id 0 to creator
      _safeMint(msg.sender, 1);
    }

    function mint(uint256 numberOfTokens) public payable {
        require(totalSupply() + numberOfTokens <= MAX_SUPPLY, "YieldNFT: Exceeds maximum supply");
        require(msg.value >= mintPrice * numberOfTokens, "YieldNFT: Ether sent is not correct");

        _safeMint(msg.sender, numberOfTokens);
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "YieldNFT: No funds to withdraw");

        payable(owner()).transfer(balance / 2);
        payable(creatorAddress).transfer(balance / 2);
    }
}