// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./interfaces/IOmniNFT.sol";
import "./token/onft/ONFT721.sol";

contract OmniNFT is ONFT721, ERC721URIStorage, IOmniNFT {
    string private baseURI;
    address public bridgeAddress;

    modifier onlyBridge() {
        require(msg.sender == bridgeAddress, "Bridge can call this function");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _bridge
    ) ONFT721(_name, _symbol, _lzEndpoint) {
        bridgeAddress = _bridge;
        // lzEndpoint
    }

    function mint(address toAddress, uint tokenId) external override onlyOwner {
        _mint(toAddress, tokenId);
    }

    function mintWithURI(address toAddress, uint tokenId, string memory _tokenURI) external override onlyOwner {
        _mint(toAddress, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ONFT721, ERC721)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
