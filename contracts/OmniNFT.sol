// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./token/onft/ONFT721.sol";

contract OmniNFT is ONFT721 {
    uint public counter;
    string private baseURI;

    constructor (string memory _name, string memory _symbol, address _lzEndpoint, string memory _baseURI) ONFT721(_name, _symbol, _lzEndpoint) {
        baseURI = _baseURI;
        // lzEndpoint
    }

    function mint() external payable {
        uint tokenId = counter;
        counter += 1;
        _safeMint(msg.sender, tokenId);
    }

    function _creditTo(uint16 _srcChainId, address _toAddress, uint _tokenId) internal override {
        // mint the tokens back into existence on destination chain
        _safeMint(_toAddress, _tokenId);
    }
}