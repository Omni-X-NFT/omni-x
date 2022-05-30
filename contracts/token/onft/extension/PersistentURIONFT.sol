// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../IPersistentURIONFT.sol";
import "../ONFT721.sol";

contract PersistentURIONFT is ONFT721, IPersistentURIONFT {
    mapping(uint256 => string) private _tokenURIs;
    address private bridgeAddress;

    /// @notice Constructor for the PersistentURIONFT
    /// @param _name the name of the token
    /// @param _symbol the token symbol
    /// @param _lzEndpoint handles message transmission across chains
    /// @param _bridge bridge contract address
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
