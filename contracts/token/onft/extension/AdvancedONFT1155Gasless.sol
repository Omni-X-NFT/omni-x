// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8;

import "../ONFT1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";


import { GelatoRelayContext } from "@gelatonetwork/relay-context/contracts/GelatoRelayContext.sol";

/// @title Interface of the AdvancedONFT1155Gasless standard
/// @author exakoss
/// @notice this implementation supports: publicMintGasless, mintGasless
contract AdvancedONFT1155Gasless is ONFT1155, GelatoRelayContext, ReentrancyGuard {

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
    //Merkle Root for WL implementation
    bytes32 public merkleRoot;


    string public contractURI;
    string private hiddenMetadataURI;

    bool public _publicSaleStarted;
    bool public _saleStarted;
    bool revealed;

    IERC20 public stableToken;
    uint public maxTokensPerMint;
    uint public maxTokenPerID;

    
    uint public ableToMint;

    modifier onlyBeneficiaryAndOwner() {
        require(msg.sender == beneficiary || msg.sender == owner() , "AdvancedONFT1155Gasless: caller is not the beneficiary");
        _;
    }

    /// @notice Constructor for the AdvancedONFT1155Gasless
    /// @param _layerZeroEndpoint handles message transmission across chains
    /// @param _baseTokenURI the base URI for computing the tokenURI
    /// @param _hiddenURI the URI for computing the hiddenMetadataUri
    constructor(
        address _layerZeroEndpoint,
        string memory _baseTokenURI,
        string memory _hiddenURI,
        uint _tax,
        address _taxRecipient,
        address _stableToken,
        uint _maxTokensPerMint,
        uint _ableToMint,
        uint _maxTokenPerID

   
    ) ONFT1155(_baseTokenURI, _layerZeroEndpoint) {
        beneficiary = payable(msg.sender);
        hiddenMetadataURI = _hiddenURI;
        tax = _tax;
        taxRecipient = payable(_taxRecipient);
        stableToken = IERC20(_stableToken);
        maxTokensPerMint = _maxTokensPerMint;
        maxTokenPerID = _maxTokenPerID;
        ableToMint = _ableToMint;
      
       
    }

    function setTax(uint _tax) external onlyOwner {
        tax = _tax;
    }

    function setTaxRecipient(address payable _taxRecipient) external onlyOwner {
        taxRecipient = _taxRecipient;
    }
    function mint(uint _tokenId, uint _amount, bytes32[] calldata _merkleProof) external {
        require(_saleStarted == true, "AdvancedONFT1155Gasless: Sale has not started yet!");
        require(_tokenId == ableToMint, "AdvancedONFT1155Gasless: trying to mint from an invalid chain");
        require(_amount <= maxTokensPerMint, "AdvancedONFT1155Gasless: trying to mint too many tokens");
        require(totalSupply(_tokenId) + _amount <= maxTokenPerID , "AdvancedONFT1155Gasless: token limit exceeded");
        require(_tokenId != 0, "AdvancedONFT1155Gasless: Invalid token ID");
        require(price > 0, "AdvancedONFT1155Gasless: you need to set stable price");
        require(address(stableToken) != address(0), "AdvancedONFT1155Gasless: not support stable token");
     

        bool isWL = MerkleProof.verify(_merkleProof, merkleRoot, keccak256(abi.encodePacked(_msgSender())));
        require(isWL == true, "AdvancedONFT1155Gasless: Invalid Merkle Proof");

        stableToken.safeTransferFrom(msg.sender, address(this), price * _amount);

        _mint(msg.sender, _tokenId, _amount, bytes(""));
    }

    /// @notice Mint your ONFTs
    function publicMint(uint _tokenId, uint _amount) external {
        
        require(_publicSaleStarted == true, "AdvancedONFT1155: Public sale has not started yet!");
        require(_saleStarted == true, "AdvancedONFT1155: Sale has not started yet!");
        require(_tokenId == ableToMint, "AdvancedONFT1155Gasless: trying to mint from an invalid chain");
        require(_amount <= maxTokensPerMint, "AdvancedONFT1155Gasless: trying to mint too many tokens");
        require(totalSupply(_tokenId)+ _amount <= maxTokenPerID, "AdvancedONFT1155Gasless: token limit exceeded");
        require(_tokenId != 0, "AdvancedONFT1155Gasless: Invalid token ID");
        require(price > 0, "AdvancedONFT1155Gasless: you need to set stable price");
        require(address(stableToken) != address(0), "ONFT721Gasless: not support stable token");

        stableToken.safeTransferFrom(msg.sender, address(this), price * _amount);

        _mint(msg.sender, _tokenId, _amount, bytes(""));
       
    }
     function mintGasless(uint _tokenId, uint _amount, bytes32[] calldata _merkleProof, address _minter) external onlyGelatoRelay {
        require(_saleStarted == true, "AdvancedONFT1155Gasless: Sale has not started yet!");
        require(_publicSaleStarted == true, "AdvancedONFT1155: Public sale has not started yet!");
        require(_saleStarted == true, "AdvancedONFT1155: Sale has not started yet!");
        require(_tokenId == ableToMint, "AdvancedONFT1155Gasless: trying to mint from an invalid chain");
        require(_amount <= maxTokensPerMint, "AdvancedONFT1155Gasless: trying to mint too many tokens at once");
        require(totalSupply(_tokenId)+ _amount <= maxTokenPerID, "AdvancedONFT1155Gasless: token limit exceeded");
        require(_tokenId != 0 , "AdvancedONFT1155Gasless: Invalid token ID");
        require(price > 0, "AdvancedONFT1155Gasless: you need to set stable price");
        require(address(stableToken) != address(0), "ONFT721Gasless: not support stable token");

        bool isWL = MerkleProof.verify(_merkleProof, merkleRoot, keccak256(abi.encodePacked(_msgSender())));
        require(isWL == true, "AdvancedONFT1155Gasless: Invalid Merkle Proof");
        
        _transferRelayFee();

        stableToken.safeTransferFrom(_minter, address(this), price * _amount);

        _mint(_minter, _tokenId, _amount, bytes(""));
    }


    /// @notice Mint your ONFTs
    function publicMintGasless(uint _tokenId, uint _amount, address _minter) external onlyGelatoRelay {
    
        require(_tokenId == ableToMint, "AdvancedONFT1155Gasless: trying to mint from an invalid chain");
        require(_amount <= maxTokensPerMint, "AdvancedONFT1155Gasless: trying to mint too many tokens");
        require(totalSupply(_tokenId)+ _amount <= maxTokenPerID, "AdvancedONFT1155Gasless: token limit exceeded");

        require(_tokenId != 0 , "AdvancedONFT1155Gasless: Invalid token ID");

        require(price > 0, "AdvancedONFT1155Gasless: you need to set stable price");
        require(address(stableToken) != address(0), "ONFT721Gasless: not support stable token");
        
        _transferRelayFee();

        stableToken.safeTransferFrom(_minter, address(this), price * _amount);

        _mint(_minter, _tokenId, _amount, bytes(""));
        
        
    }


    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function setPrice(uint newPrice) external onlyOwner {
        price = newPrice;
    }

    function withdraw() public virtual onlyBeneficiaryAndOwner {
        require(beneficiary != address(0), "A9");
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