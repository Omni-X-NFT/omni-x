// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./../interfaces/IERC721Persistent.sol";

contract ERC721Persistent is IERC721Persistent, ERC721, ERC721URIStorage, Ownable {
    address private bridgeAddress;

    constructor(
        string memory _name,
        string memory _symbol,
        address _bridgeAddress
    ) ERC721(_name, _symbol) {
        require(_bridgeAddress != address(0), "Can't be zero address");
        bridgeAddress = _bridgeAddress;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function safeMint(address to, uint256 tokenId, string memory uri)
        external
        override
        onlyOwner
    {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function burn(uint tokenId) external override {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "1");
        require(_msgSender() == bridgeAddress, "2");
        _burn(tokenId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}