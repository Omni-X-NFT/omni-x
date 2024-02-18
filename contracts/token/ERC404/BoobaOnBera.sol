//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC404new} from "./ERC404new.sol";

// ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⠶⠛⠉⠉⠉⠉⠛⠶⣤⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⡾⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⡤⠴⠚⠋⡹⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠳⢤⣀⣀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⡴⠛⠁⠀⠀⣠⠞⠁⠀⠀⠀⠀⠀⠀⠀⢀⣀⣀⣤⣄⣀⡀⣀⡤⠞⠋⠉⠉⠙⢷⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⠞⠉⠀⠀⠀⠀⢼⡵⠛⠉⠓⠒⠦⣤⣀⣴⠚⠉⠁⠀⠀⠀⠀⠈⠁⢠⡤⠴⠒⠢⡄⠈⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⠟⠁⠀⠀⠀⠀⢠⠀⣿⢀⣤⣀⠀⠀⠀⠀⣀⡉⠀⠀⠀⠀⠀⠀⠀⠀⠰⣏⠀⠀⠀⠀⠀⢰⡿⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⡾⠁⠀⠀⠀⠀⠀⢀⡏⠀⢻⡈⣦⠈⠛⠶⢶⡶⠁⠀⠀⠀⠀⢸⠀⠀⠀⠀⠀⠈⠙⠲⠦⣀⠀⠈⠣⢿⣧⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⠟⠀⠀⠀⡴⠀⠀⠀⡞⠀⠀⠀⢣⠈⠃⢀⣠⠞⠀⠀⠀⠀⠀⠀⢼⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⣄⠀⠀⣯⢳⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⠀⢠⡟⠀⠀⠀⣸⠁⠀⠀⢸⠃⠀⠀⠀⠈⣇⠰⠟⠁⠀⠀⠀⠀⠀⠀⠀⢸⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠁⠀⠸⣧⠻⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⠀⡾⠁⠀⠀⠀⡇⠀⠀⠀⠉⠀⠀⠀⠀⠀⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢘⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⠀⠙⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⢰⡇⠀⠀⠀⢰⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⠛⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡀⠀⢀⡿⠀⠀⢹⡆⠀⠀⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⠀⣸⠀⠀⠀⠀⣾⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠹⣦⣄⠀⠀⠀⠀⠀⣄⡀⠀⠀⠀⠀⠀⣀⣤⣤⠀⠀⠀⠀⠀⢸⠁⢀⡾⠁⠀⠀⠀⢻⡀⠀⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⢠⡿⠀⠀⠀⠀⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠹⡄⠀⠀⠀⠐⠿⡿⠇⠀⠀⠀⠀⢛⡛⠋⠀⠀⠀⠀⠀⣼⣢⠎⠀⠀⠀⠀⠀⠘⡇⠀⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⠀⣸⠇⠀⠀⠀⠀⢸⡇⠀⠀⠀⣶⠀⠀⠀⠀⠀⠀⠀⠀⠹⣆⠀⠀⠀⠀⣶⠀⠀⠀⠀⠀⠈⣧⠀⠀⠀⠀⢀⡼⠟⠁⠀⠀⠀⠀⠀⠀⠀⡇⠀⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⢀⡟⠀⠀⠀⠀⠀⠀⣷⡀⠀⠀⢿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢦⡀⠀⡀⣿⠀⠀⠀⠀⠀⠀⠹⣄⢀⠀⣤⠏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⠀⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⠀⣸⠇⠀⠀⠀⠀⠀⠀⠘⢷⡀⠀⢸⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠲⣽⡟⠀⠀⣀⣀⡀⢀⠀⣹⠃⡸⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⡆⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⢀⡿⠀⠀⠀⠀⠀⠀⠀⠀⠈⢷⡀⠀⢷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣷⣞⠋⡅⠀⠈⡟⠀⣷⠞⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣧⠀⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⢸⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢳⡄⢸⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢟⣿⣛⣛⣿⣣⡾⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢹⣦⠀⠀⠀⠀⠀
// ⠀⠀⠀⠀⣾⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢮⣧⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠑⠛⠛⠋⠁⠀⠀⡼⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⣦⠀⠀⠀⠀
// ⠀⠀⠀⠀⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣤⡴⠊⠀⢧⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠹⣷⠀⠀⠀
// ⠀⠀⠀⢠⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⠁⠀⠀⠀⠀⡟⢧⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡆⠀⠀
// ⠀⠀⠀⣼⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⠀⠀⠀⠀⣼⠁⠘⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⣷⠀⠀
// ⠀⠀⠀⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⠞⠉⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⠀⠀⠀⠀⣿⠀⠀⠘⢷⣀⠀⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⠀⠀
// ⠀⠀⢰⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⠋⠀⠀⢻⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⠀⠀⠀⠀⢻⠀⠀⠀⠀⠙⢧⣀⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡿⠀⠀
// ⠀⠀⢸⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⠞⠁⠀⠀⠀⢸⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡇⠀⠀⠀⠀⡇⠀⠀⠀⠀⣠⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⡇⠀⠀
// ⠀⠀⢸⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡾⠁⠀⠀⠀⠀⠀⠘⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡄⠀⠀⠀⢀⡿⠀⠀⠀⣾⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⠟⠀⠀⠀
// ⠀⠀⣾⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⡾⠁⠀⠀⠀⠀⠀⠀⠀⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⡄⠀⠀⣼⠁⠀⢀⣟⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⣠⡾⠋⠀⠀⠀⠀
// ⠀⠀⣿⠀⠀⠀⠀⠀⠀⠀⠀⢀⡴⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡇⠀⠀⡟⠀⠀⠈⢻⡽⠳⣦⡀⠀⠀⠀⢀⣠⡾⠋⠀⠀⠀⠀⠀⠀
// ⠀⢰⡇⠀⠀⠀⠀⠀⠀⠀⠀⣸⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⡇⠀⢸⠁⠀⠀⠀⠀⠉⠛⠉⠛⠶⠶⠖⠛⠉⠀⠀⠀⠀⠀⠀⠀⠀
// ⠀⣾⠇⠀⠀⠀⠀⠀⠀⠀⠀⡏⠀⠀⠀⢀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠈⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢧⠀⢸⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// ⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠋⠉⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣘⣷⣀⣀⣀⣀⣀⡀⠀⠀⠀⠀⢸⣶⡾⠤⠀⠀⠀⠀⠀⠀⠀⢀⣀⣀⣀⣀⣀⣀⣠⡤⡄⢀⡀⢀⠀
// ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠉⠉⠉⠉⠉⠉⢉⠉⠁⠀⠀⠀⠀⠀⠀⠨⣿⡻⠇⠋⠗⣻⣟⣧⠇⠸⠠⣜⠃

contract BoobaOnBera is ERC404new, Ownable {

  constructor() ERC404new("Booba on Bera", "BOBA", 18) Ownable() {
      // Do not mint the ERC721s to the initial owner, as it's a waste of gas.
      _setWhitelist(msg.sender, true);
    }

  function tokenURI(uint256 id_) public pure override returns (string memory) {
    return string.concat("https://gfhg4m7aktaebknho535m3nyek5rnso6ejkh7vrgxiokg3st5yra.arweave.net/MU5uM-BUwECpp3d31m24IrsWyd4iVH_WJroco25T7iI");
  }

  //free mint for Beras
  function boobaMint(
    uint256 value_,
    bool mintNFT
  ) public {
    _mintERC20(msg.sender, value_, mintNFT);
  }

  function setWhitelist(address account_, bool value_) external onlyOwner {
    _setWhitelist(account_, value_);
  } 
}