// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8;

import "../AdvancedONFT721Gasless.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import { GelatoRelayContext } from "@gelatonetwork/relay-context/contracts/GelatoRelayContext.sol";

/// @title Interface of the Elements standard
/// @author green9016
/// @notice this implementation supports: batch mint, payable public and private mint, reveal of metadata and EIP-2981 on-chain royalties
contract AdvancedONFT721GaslessClaim is AdvancedONFT721Gasless {
    // claimable
    bool public _claimable;
    uint public _claimableTokenCount;
    uint public _claimedTokenCount;
    mapping(uint => address) public _claimedTokens;
    IERC721 public _claimableCollection;

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
        AdvancedONFT721GaslessClaim(_name, _symbol, _layerZeroEndpoint, _startMintId, _endMintId, _maxTokensPerMint, _baseTokenURI, _hiddenURI, _stableToken)
    {
    }

    function claim(address claimer, uint tokenId) external onlyGelatoRelay {
        require(_claimable == true, "ElementONFT721: Sale has not started yet!");
        require(nextMintId + 1 <= maxMintId, "ElementONFT721: max mint limit reached");
        require(_claimedTokenCount + 1 <= _claimableTokenCount, "ElementONFT721: max claim limit reached");
        require(_claimableCollection.ownerOf(tokenId) == claimer, "ElementONFT721: not owner of");
        require(_claimedTokens[tokenId] == address(0), "ElementONFT721: already claimed");

        _transferRelayFee();

        _claimedTokens[tokenId] = claimer;
        ++_claimedTokenCount;

        _mintTokens(claimer, 1);
    }

    function startClaim(uint claimableTokenCount, address claimableCollection) external onlyOwner {
        _claimable = true;
        _claimableTokenCount = claimableTokenCount;
        _claimableCollection = IERC721(claimableCollection);
    }

    function stopClaim() external onlyOwner {
        _claimable = false;
    }
}