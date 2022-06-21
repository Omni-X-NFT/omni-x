// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8;

import "../token/onft/ONFT721.sol";
import "../token/onft/IGhosts.sol";
import "hardhat/console.sol";

contract GhostsMock is ONFT721, IGhosts {
    uint gasForDestinationLzReceive = 350000;

    constructor(string memory _name, string memory _symbol, address _layerZeroEndpoint) ONFT721(_name, _symbol, _layerZeroEndpoint) {}

    function mint(uint8 _newId) external override payable {
        _safeMint(msg.sender, _newId);
    }

    function traverseChains(uint16 _chainId, uint tokenId) public override payable {
        require(msg.sender == ownerOf(tokenId), "You must own the token to traverse");
        require(trustedRemoteLookup[_chainId].length > 0, "This chain is currently unavailable for travel");

        // burn NFT, eliminating it from circulation on src chain
        _burn(tokenId);

        // abi.encode() the payload with the values to send
        bytes memory payload = abi.encode(abi.encodePacked(msg.sender), tokenId);

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
}
