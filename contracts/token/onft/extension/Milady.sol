// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8;

import { AdvancedONFT721Gasless } from "./AdvancedONFT721Gasless.sol";

/// @title Interface of the AdvancedONFT standard
/// @author exakoss
/// @notice this implementation supports: batch mint, payable public and private mint, reveal of metadata and EIP-2981 on-chain royalties
contract Milady is AdvancedONFT721Gasless {
    /// @notice Constructor for the AdvancedONFT
    /// @param _name the name of the token
    /// @param _symbol the token symbol
    /// @param _layerZeroEndpoint handles message transmission across chains
    /// @param _startMintId the starting mint number on this chain, excluded
    /// @param _endMintId the max number of mints on this chain
    /// @param _maxTokensPerMint the max number of tokens that could be minted in a single transaction
    /// @param _baseTokenURI the base URI for computing the tokenURI
    /// @param _hiddenURI the URI for computing the hiddenMetadataUri
    constructor(string memory _name, string memory _symbol, address _layerZeroEndpoint, uint _startMintId, uint _endMintId, uint _maxTokensPerMint, string memory _baseTokenURI, string memory _hiddenURI, address _stableToken)
        AdvancedONFT721Gasless(_name, _symbol, _layerZeroEndpoint, _startMintId, _endMintId, _maxTokensPerMint, _baseTokenURI, _hiddenURI, _stableToken) {
    }
}