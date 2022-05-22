// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./interfaces/IOmniNFT.sol";
import "./token/onft/ONFT721.sol";

contract OmniNFT is ONFT721, IOmniNFT {
    uint256 public counter;
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

    function mint(address toAddress, uint tokenId) external override onlyBridge {
        _mint(toAddress, tokenId);
    }
}
