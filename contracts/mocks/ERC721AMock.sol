// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "../token/onft721A/ERC721ASpecific.sol";

contract ERC721AMock is ERC721ASpecific {

  
  uint public startId;
  constructor (string memory name_, string memory symbol_, uint256 _startId ) ERC721ASpecific(name_, symbol_, _startId) {
    startId = _startId;
  }


  function mint(uint amount) public payable {
    _safeMint(msg.sender, amount);
  }

    function _startTokenId() internal view override returns(uint256) {
        return startId;
    }
}