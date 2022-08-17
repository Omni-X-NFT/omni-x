// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../token/oft/OFT.sol";

/**
 * @dev Extension of {OFT} that adds a global cap to the supply of tokens across all chains.
 */
contract OFTMock is OFT {
    constructor(string memory _name, string memory _symbol, uint _cap, address _lzEndpoint) OFT(_name, _symbol, _lzEndpoint) {
        _mint(msg.sender, _cap);
    }

    function mint() external {
        _mint(msg.sender, 10 * 1e18);
    }
}
