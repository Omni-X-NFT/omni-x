// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./token/onft/ONFT721.sol";

contract OmniNFT is ONFT721 {
    uint public counter;
    string private baseURI;
    uint gasForDestinationLzReceive = 350000;

    constructor (string memory _name, string memory _symbol, address _lzEndpoint, string memory _baseURI) ONFT721(_name, _symbol, _lzEndpoint) {
        baseURI = _baseURI;
        // lzEndpoint
    }

    function mint() external payable {
        uint tokenId = counter;
        counter += 1;
        _safeMint(msg.sender, tokenId);
    }

    function traverseChains(uint16 _chainId, uint tokenId) public payable {
        require(msg.sender == ownerOf(tokenId), "You must own the token to traverse");
        require(trustedRemoteLookup[_chainId].length > 0, "This chain is currently unavailable for travel");

        // burn NFT, eliminating it from circulation on src chain
        _burn(tokenId);

        // abi.encode() the payload with the values to send
        bytes memory payload = abi.encode(msg.sender, tokenId);

        // encode adapterParams to specify more gas for the destination
        uint16 version = 1;
        bytes memory adapterParams = abi.encodePacked(version, gasForDestinationLzReceive);

        // get the fees we need to pay to LayerZero + Relayer to cover message delivery
        // you will be refunded for extra gas paid
        (uint messageFee, ) = lzEndpoint.estimateFees(_chainId, address(this), payload, false, adapterParams);
        
        require(msg.value >= messageFee, "GG: msg.value not enough to cover messageFee. Send gas for message fees");

        lzEndpoint.send{value: msg.value}(
            _chainId,                           // destination chainId
            trustedRemoteLookup[_chainId],      // destination address of nft contract
            payload,                            // abi.encoded()'ed bytes
            payable(msg.sender),                // refund address
            address(0x0),                       // 'zroPaymentAddress' unused for this
            adapterParams                       // txParameters 
        );
    }

    // just in case this fixed variable limits us from future integrations
    function setGasForDestinationLzReceive(uint newVal) external onlyOwner {
        gasForDestinationLzReceive = newVal;
    }

    function _nonblockingLzReceive(uint16 _srcChainId, bytes memory _srcAddress, uint64 _nonce, bytes memory _payload) internal override {
        // decode
        (address toAddr, uint tokenId) = abi.decode(_payload, (address, uint));

        // mint the tokens back into existence on destination chain
        _safeMint(toAddr, tokenId);
    }
}