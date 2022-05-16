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

    function mint() external onlyBridge {
        uint256 tokenId = counter;
        counter += 1;
        _safeMint(msg.sender, tokenId);
    }

    function _creditTo(
        uint16 _srcChainId,
        address _toAddress,
        uint256 _tokenId
    ) internal override {
        // mint the tokens back into existence on destination chain
        _safeMint(_toAddress, _tokenId);
    }

    function collectionId() external override returns (bytes32) {

    }

    function moveTo(uint16 _dstChainId, bytes calldata _destinationBridge, uint _tokenId) external override payable {
        sendFrom(msg.sender, _dstChainId, _destinationBridge, _tokenId, payable(msg.sender), address(0x0), bytes(""));
    }
}
