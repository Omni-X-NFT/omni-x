// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./interfaces/IOmniNFT.sol";
import "./token/onft/ONFT721.sol";

contract OmniNFT is ONFT721, IOmniNFT {
    mapping(uint256 => string) private _tokenURIs;
    address private bridgeAddress;

    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _bridge
    ) ONFT721(_name, _symbol, _lzEndpoint) {
        bridgeAddress = _bridge;
    }

    function mintWithURI(address toAddress, uint tokenId, string memory _tokenURI) external override onlyOwner {
        _mint(toAddress, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }

    /// For testing purpose
    // function mint(uint tokenId) public onlyOwner {
    //     _mint(_msgSender(), tokenId);
    // }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return _tokenURIs[tokenId];
    }

    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        require(_exists(tokenId), "2");
        _tokenURIs[tokenId] = _tokenURI;
    }

    function burn(uint _tokenId) external override {
        require(_isApprovedOrOwner(_msgSender(), _tokenId), "1");
        require(_msgSender() == bridgeAddress, "2");
        _burn(_tokenId);
    }

    function _burn(uint256 tokenId) internal override {
        super._burn(tokenId);

        if (bytes(_tokenURIs[tokenId]).length != 0) {
            delete _tokenURIs[tokenId];
        }
    }
}
