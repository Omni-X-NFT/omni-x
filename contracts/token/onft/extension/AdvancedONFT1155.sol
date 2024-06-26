// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8;

import "../ONFT1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title Interface of the AdvancedONFT1155 standard
/// @author exakoss
/// @notice this implementation supports: batch mint, payable public and private mint, reveal of metadata and EIP-2981 on-chain royalties
contract AdvancedONFT1155 is ONFT1155, ReentrancyGuard {
    using Strings for uint;

    uint public tax = 1000; // 100% = 10000
    uint public price = 0;


    // address for withdrawing money and receiving royalties, separate from owner
    address payable beneficiary;
    // address for tax recipient;
    address payable taxRecipient;
    // Merkle Root for WL implementation
    bytes32 public merkleRoot;

    string public contractURI;
    string private hiddenMetadataURI;

    bool public _publicSaleStarted;
    bool public _saleStarted;
    bool revealed;

    modifier onlyBeneficiaryAndOwner() {
        require(msg.sender == beneficiary || msg.sender == owner() , "AdvancedONFT1155: caller is not the beneficiary");
        _;
    }

    /// @notice Constructor for the AdvancedONFT1155
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
    function publicMint(uint _tokenId, uint _amount) external payable {
        require(_publicSaleStarted == true, "AdvancedONFT1155: Public sale has not started yet!");
        require(_saleStarted == true, "AdvancedONFT1155: Sale has not started yet!");
        require(_tokenId != 0, "AdvancedONFT1155: Cannot invalid token id!");
        require(_amount * price <= msg.value, "AdvancedONFT1155: Inconsistent amount sent!");

        _mint(msg.sender, _tokenId, _amount, bytes(""));
    }

    /// @notice Mint your ONFTs, whitelisted addresses only
    function mint(uint _tokenId, uint _amount, bytes32[] calldata _merkleProof) external payable {
        require(_saleStarted == true, "AdvancedONFT1155: Sale has not started yet!");
        require(_tokenId != 0, "AdvancedONFT1155: Cannot mint 0 tokens!");
        require(_amount * price <= msg.value, "AdvancedONFT1155: Inconsistent amount sent!");

        bool isWL = MerkleProof.verify(_merkleProof, merkleRoot, keccak256(abi.encodePacked(_msgSender())));
        require(isWL == true, "AdvancedONFT1155: Invalid Merkle Proof");

        _mint(msg.sender, _tokenId, _amount, bytes(""));
    }

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function setPrice(uint newPrice) external onlyOwner {
        price = newPrice;
    }

    function withdraw() public virtual onlyBeneficiaryAndOwner {
        require(beneficiary != address(0), "AdvancedONFT1155: Beneficiary not set!");
        uint _balance = address(this).balance;
        // tax: 100% = 10000
        uint _taxFee = _balance * tax / 10000;
        require(payable(beneficiary).send(_balance - _taxFee));
        require(payable(taxRecipient).send(_taxFee));
    }

    function setContractURI(string memory _contractURI) public onlyOwner {
        contractURI = _contractURI;
    }

    function setBaseURI(string memory baseUri) public onlyOwner {
        _setURI(baseUri);
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

    function flipSaleStarted() external onlyOwner {
        _saleStarted = !_saleStarted;
    }

    function flipPublicSaleStarted() external onlyOwner {
        _publicSaleStarted = !_publicSaleStarted;
    }

    function uri(uint tokenId) public view override(ERC1155) returns (string memory) {
        if (!revealed) {
            return hiddenMetadataURI;
        }
        return string(abi.encodePacked(super.uri(tokenId), tokenId.toString()));
    }
}