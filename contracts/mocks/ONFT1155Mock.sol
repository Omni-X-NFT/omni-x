// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8;

import "../token/onft/ONFT1155.sol";

contract ONFT1155Mock is ONFT1155 {
    constructor(string memory _uri, address _layerZeroEndpoint) ONFT1155(_uri, _layerZeroEndpoint) {}

    function mint(address _tokenOwner, uint _id, uint _amount) external payable {
        _mint(_tokenOwner, _id, _amount, bytes("0x0") );
    }
}