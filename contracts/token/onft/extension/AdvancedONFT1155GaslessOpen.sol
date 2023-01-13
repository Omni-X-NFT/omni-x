// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8;

import "../ONFT1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import { GelatoRelayContext } from "@gelatonetwork/relay-context/contracts/GelatoRelayContext.sol";

/// @title Interface of the AdvancedONFT1155GaslessOpen standard
/// @author exakoss
/// @notice this implementation supports: publicMintGasless, mintGasless
contract AdvancedONFT1155GaslessOpen is ONFT1155, GelatoRelayContext, ReentrancyGuard {
    using Strings for uint;
    using SafeERC20 for IERC20;

    uint public tax = 1000; // 100% = 10000
    uint public price = 0;

    // royalty fee in basis points (i.e. 100% = 10000, 1% = 100)
    uint royaltyBasisPoints = 500;
    // address for withdrawing money and receiving royalties, separate from owner
    address payable beneficiary;
    // address for tax recipient;
    address payable taxRecipient;

    string public contractURI;
    string private hiddenMetadataURI;

    bool public _openEditionStarted;
    uint public openEditionEndedBy;
    bool revealed;

    IERC20 public stableToken;

    /// @notice Constructor for the AdvancedONFT1155GaslessOpen
    /// @param _layerZeroEndpoint handles message transmission across chains
    /// @param _baseTokenURI the base URI for computing the tokenURI
    /// @param _hiddenURI the URI for computing the hiddenMetadataUri
    constructor(
        address _layerZeroEndpoint,
        string memory _baseTokenURI,
        string memory _hiddenURI,
        uint _tax,
        address _taxRecipient
    ) ONFT1155(_baseTokenURI, _layerZeroEndpoint) {
        beneficiary = payable(msg.sender);
        hiddenMetadataURI = _hiddenURI;
        tax = _tax;
        taxRecipient = payable(_taxRecipient);
    }

    function setTax(uint _tax) external onlyOwner {
        tax = _tax;
    }

    function setTaxRecipient(address payable _taxRecipient) external onlyOwner {
        taxRecipient = _taxRecipient;
    }

    /// @notice Mint your ONFTs
    function mintGasless(uint _tokenId, uint _amount, address _minter) external onlyGelatoRelay {
        require(_openEditionStarted == true, "AdvancedONFT1155GaslessOpen: Open Edition has not started yet!");
        require(openEditionEndedBy >= block.timestamp, "AdvancedONFT1155GaslessOpen: Open Edition has been ended.");
        require(_tokenId != 0, "AdvancedONFT1155GaslessOpen: Cannot invalid token id!");
        require(price > 0, "AdvancedONFT1155GaslessOpen: you need to set stable price");
        require(address(stableToken) != address(0), "AdvancedONFT1155GaslessOpen: not support stable token");
        
        _transferRelayFee();

        stableToken.safeTransferFrom(_minter, address(this), price * _amount);

        _mint(_minter, _tokenId, _amount, bytes(""));
    }

    /// @notice Mint your ONFTs, whitelisted addresses only
    function mint(uint _tokenId, uint _amount, bytes32[] calldata _merkleProof) external {
        require(_openEditionStarted == true, "AdvancedONFT1155GaslessOpen: Open Edition has not started yet!");
        require(openEditionEndedBy >= block.timestamp, "AdvancedONFT1155GaslessOpen: Open Edition has been ended.");
        require(_tokenId != 0, "AdvancedONFT1155GaslessOpen: Cannot mint 0 tokens!");
        require(price > 0, "AdvancedONFT1155GaslessOpen: you need to set stable price");
        require(address(stableToken) != address(0), "AdvancedONFT1155GaslessOpen: not support stable token");

        stableToken.safeTransferFrom(msg.sender, address(this), price * _amount);

        _mint(msg.sender, _tokenId, _amount, bytes(""));
    }

    function setPrice(uint newPrice) external onlyOwner {
        price = newPrice;
    }

    function withdraw() public virtual onlyOwner {
        require(beneficiary != address(0), "AdvancedONFT1155GaslessOpen: Beneficiary not set!");
        uint _balance = address(this).balance;
        // tax: 100% = 10000
        uint _taxFee = _balance * tax / 10000;
        require(payable(beneficiary).send(_balance - _taxFee));
        require(payable(taxRecipient).send(_taxFee));
    }

    function royaltyInfo(uint, uint salePrice) external view returns (address receiver, uint royaltyAmount) {
        receiver = beneficiary;
        royaltyAmount = (salePrice * royaltyBasisPoints) / 10000;
    }

    function setContractURI(string memory _contractURI) public onlyOwner {
        contractURI = _contractURI;
    }

    function setBaseURI(string memory baseUri) public onlyOwner {
        _setURI(baseUri);
    }

    function setRoyaltyFee(uint _royaltyBasisPoints) external onlyOwner {
        royaltyBasisPoints = _royaltyBasisPoints;
    }

    function setBeneficiary(address payable _beneficiary) external onlyOwner {
        beneficiary = _beneficiary;
    }

    function setHiddenMetadataUri(string memory _hiddenMetadataUri) external onlyOwner {
        hiddenMetadataURI = _hiddenMetadataUri;
    }

    function flipRevealed() external onlyOwner {
        revealed = !revealed;
    }

    function startOpenEdition(uint openEditionStoppedBy) external onlyOwner {
        _openEditionStarted = true;
        openEditionEndedBy = openEditionStoppedBy;
    }

    function stopOpenEdition() external onlyOwner {
        _openEditionStarted = false;
    }

    function uri(uint tokenId) public view override(ERC1155) returns (string memory) {
        if (!revealed) {
            return hiddenMetadataURI;
        }
        return string(abi.encodePacked(super.uri(tokenId), tokenId.toString()));
    }
}