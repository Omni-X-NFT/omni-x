// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@layerzerolabs/solidity-examples/contracts/token/oft/extension/ProxyOFT.sol";

contract WrappedFriendProxy is ProxyOFT {


  constructor(
    address _lzEndpoint,
    address _wrappedFriend
  ) ProxyOFT(_lzEndpoint, _wrappedFriend) {}


}