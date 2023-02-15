// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC721Vanila is ERC721, Ownable {
    uint public nextMintId;
    uint public maxMintId;
    uint public maxTokensPerMint;
    string private baseURI;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseTokenURI,
        uint _startMintId,
        uint _endMintId,
        uint _maxTokensPerMint
    ) ERC721(_name, _symbol) {
        nextMintId = _startMintId;
        maxMintId = _endMintId;
        maxTokensPerMint = _maxTokensPerMint;
        baseURI = _baseTokenURI;
    }

    function publicMint(uint _nbTokens) external {
        require(_nbTokens != 0, "ERC721Vanila: Cannot mint 0 tokens!");
        require(_nbTokens <= maxTokensPerMint, "ERC721Vanila: You cannot mint more than maxTokensPerMint tokens at once!");
        require(nextMintId + _nbTokens <= maxMintId, "ERC721Vanila: max mint limit reached");

        uint local_nextMintId = nextMintId;
        for (uint i; i < _nbTokens; i++) {
            _safeMint(msg.sender, ++local_nextMintId);
        }
        nextMintId = local_nextMintId;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return super.tokenURI(tokenId);
    }
}