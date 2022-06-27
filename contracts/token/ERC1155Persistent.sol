// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./../interfaces/IERC1155Persistent.sol";

contract ERC1155Persistent is IERC1155Persistent, ERC1155, Ownable {
    constructor(string memory _name) ERC1155("") {}

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function mint(address account, uint256 id, uint256 amount)
        external
        override
        onlyOwner
    {
        _mint(account, id, amount, "");
    }

    function burn(uint256 id, uint256 value) external override onlyOwner {
        _burn(_msgSender(), id, value);
    }

    function uri(uint _tokenId) public override view returns (string memory) {

    }
}