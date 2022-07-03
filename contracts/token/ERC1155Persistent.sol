// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./../interfaces/IERC1155Persistent.sol";

contract ERC1155Persistent is IERC1155Persistent, ERC1155, Ownable {
    mapping(uint256 => string) public _uris;

    constructor() ERC1155("") {}

    function setURI(uint _tokenId, string memory newuri) external override onlyOwner {
        _setURI(newuri);
        _uris[_tokenId] = newuri;
    }

    function mint(address account, uint256 id, uint256 amount)
        external
        override
        onlyOwner
    {
        _mint(account, id, amount, "");
    }

    function burn(address account, uint256 id, uint256 value) external override onlyOwner {
        _burn(account, id, value);
    }

    function uri(uint _tokenId) public override view returns (string memory) {
        return _uris[_tokenId];
    }
}
