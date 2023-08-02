// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8;

import "./CC2ONFT721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title Interface of the AdvancedONFT standard
/// @author exakoss
/// @notice this implementation supports: batch mint, payable public and private mint, reveal of metadata and EIP-2981 on-chain royalties
contract CC2AccessPass is CC2ONFT721, ReentrancyGuard {
    using Strings for uint;

    uint public tax = 2000; // 100% = 10000
    uint public price = 241000000000000000; // 0.241 eth
    uint public nextMintId;
    uint public maxMintId;



    // address for withdrawing money and receiving royalties, separate from owner
    address payable beneficiary;
    // address for tax recipient;
    address payable taxRecipient;



    string private baseURI;


    bool public _saleStarted;
    bool revealed;


    modifier onlyBeneficiaryAndOwner() {
        require(msg.sender == beneficiary || msg.sender == owner() , "AdvancedONFT721: caller is not the beneficiary");
        _;
    }


    constructor(
        string memory _name,
        string memory _symbol,
        address _layerZeroEndpoint,
        uint _startMintId,
        uint _endMintId,
        string memory _baseTokenURI,
        address _beneficiary,
        address _taxRecipient,
        bool premint
    ) CC2ONFT721(_name, _symbol, _layerZeroEndpoint, 200000) {
        nextMintId = _startMintId;
        maxMintId = _endMintId;
        beneficiary = payable(_beneficiary);
        baseURI = _baseTokenURI;
        taxRecipient = payable(_taxRecipient);

        if (premint) {
          for (uint i = 1; i <= uint(124); i++) {
            _mint(_beneficiary, i);
          }
          nextMintId = 124;
        }

    }

    function setMintRange(uint _startMintId, uint _endMintId) external onlyOwner {
        nextMintId = _startMintId;
        maxMintId = _endMintId;

    }

    function setTax(uint _tax) external onlyOwner {
        tax = _tax;
    }

    function setTaxRecipient(address payable _taxRecipient) external onlyOwner {
        taxRecipient = _taxRecipient;
    }

    /// @notice Mint your ONFTs
    function mint() external payable {
        require(_saleStarted == true, "AdvancedONFT721: Sale has not started yet!");
        require(nextMintId + 1 <= maxMintId, "AdvancedONFT721: max mint limit reached");
        require( price <= msg.value, "AdvancedONFT721: Inconsistent amount sent!");

        _mint(msg.sender, ++nextMintId);

    }


    function setPrice(uint newPrice) external onlyOwner {
        price = newPrice;
    }

    function withdraw() public virtual onlyBeneficiaryAndOwner {
        require(beneficiary != address(0), "AdvancedONFT721: Beneficiary not set!");
        uint _balance = address(this).balance;
        // tax: 100% = 10000
        uint _taxFee = _balance * tax / 10000;
        require(payable(beneficiary).send(_balance - _taxFee));
        require(payable(taxRecipient).send(_taxFee));
    }


    function setBaseURI(string memory uri) public onlyOwner {
        baseURI = uri;
    }

    function setBeneficiary(address payable _beneficiary) external onlyOwner {
        beneficiary = _beneficiary;
    }



    function flipSaleStarted() external onlyBeneficiaryAndOwner {
        _saleStarted = !_saleStarted;
    }


    // The following functions are overrides required by Solidity.
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function tokenURI(uint tokenId) public view override(CC2ERC721) returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
      
        return baseURI;
    }

    function setNameAndSymbol(string memory name_, string memory symbol_) external onlyBeneficiaryAndOwner {
      _name = name_;
      _symbol = symbol_;
    }
    
}