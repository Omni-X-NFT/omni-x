//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC404.sol";

contract BeraArtio404 is ERC404 {

    uint256 public constant MAX_SUPPLY = 100000000000000000000000000;
    uint256 public mintPrice = 0.001 ether;
    address public creatorAddress;

    constructor(address _creatorAddress) ERC404("BeraArtio404", "BA404", 18, MAX_SUPPLY, msg.sender){
        creatorAddress = _creatorAddress;
        _mint(msg.sender);
    }

    /// @notice Mint function to create new tokens
    /// @param numberOfTokens The number of tokens to mint
    function mint(uint256 numberOfTokens) public payable {
        require(minted + numberOfTokens <= MAX_SUPPLY, "BeraArtio404: Exceeds maximum supply");
        require(msg.value >= mintPrice * numberOfTokens, "BeraArtio404: Ether sent is not correct");

        for (uint256 i = 0; i < numberOfTokens; i++) {
            _mintTo(msg.sender);
        }
    }

    /// @notice Internal function to handle minting logic
    /// @param to The address to mint tokens to
    function _mintTo(address to) internal {
        require(minted < MAX_SUPPLY, "BeraArtio404: Max supply reached");

        minted++; // Increment the total minted tokens
        uint256 newTokenId = minted;
        
        // This is a simplified version of minting. Depending on your implementation,
        // you might need to track the balance and ownership manually if not already handled.
        _ownerOf[newTokenId] = to;
        balanceOf[to] += _getUnit(); // Assuming each NFT equals one unit of balance

        // Simulate the ERC721 transfer event for the minted token
        emit Transfer(address(0), to, newTokenId);
    }

  function withdraw() public onlyOwner {
    uint256 balance = address(this).balance;
    require(balance > 0, "BeraArtio404: No funds to withdraw");

    payable(owner).transfer(balance / 2);
    payable(creatorAddress).transfer(balance / 2);
  }
  
  function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC404: URI query for nonexistent token");

        string memory svg = string(abi.encodePacked(
            "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'>",
            "<rect width='100%' height='100%' fill='blue' />",
            "<text x='150' y='150' font-family='Arial' font-size='24' fill='white' text-anchor='middle'>Bear #",
            toString(tokenId),
            "</text>",
            "</svg>"
        ));

        return string(abi.encodePacked(
            "data:image/svg+xml;base64,",
            base64(bytes(svg))
        ));
    }

    /// @notice Checks if the token exists by verifying if it has an owner
    /// @param tokenId The token ID to check
    /// @return A boolean indicating if the token exists
  function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf[tokenId] != address(0);
    }

    /// @notice Converts a string to its base64 representation
    /// @dev This function is used to encode SVG content to base64
    /// @param data The string to encode
    /// @return A string representing the base64 encoded input
  function base64(bytes memory data) internal pure returns (string memory) {
        string memory base64chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLen + 32);

        assembly {
            mstore(result, encodedLen)
            let encodedPtr := add(result, 32)
            let dataPtr := data
            let dataLen := mload(data)
            let endPtr := add(dataPtr, dataLen)
            for {} lt(dataPtr, endPtr) {}
            {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)
                mstore(encodedPtr, shl(240, mload(add(base64chars, and(shr(18, input), 0x3F)))))
                mstore(add(encodedPtr, 1), shl(240, mload(add(base64chars, and(shr(12, input), 0x3F)))))
                mstore(add(encodedPtr, 2), shl(240, mload(add(base64chars, and(shr(6, input), 0x3F)))))
                mstore(add(encodedPtr, 3), shl(240, mload(add(base64chars, and(input, 0x3F)))))
                encodedPtr := add(encodedPtr, 4)
            }
            switch mod(dataLen, 3)
            case 1 { mstore(sub(encodedPtr, 2), shl(240, 0x3D3D)) }
            case 2 { mstore(sub(encodedPtr, 1), shl(240, 0x3D)) }
        }

        return result;
    }

    /// @notice Converts a uint256 to a string
    /// @dev Helper function to convert token ID to string for embedding in the SVG
    /// @param value The uint256 value to convert
    /// @return A string representing the given uint256 value
  function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}