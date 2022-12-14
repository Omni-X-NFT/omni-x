// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8;

import "../ONFT721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import { GelatoRelayContext } from "@gelatonetwork/relay-context/contracts/GelatoRelayContext.sol";

/// @title Interface of the Elements standard
/// @author green9016
/// @notice this implementation supports: batch mint, payable public and private mint, reveal of metadata and EIP-2981 on-chain royalties
contract ElementONFT721 is ONFT721, GelatoRelayContext, ReentrancyGuard {
    using Strings for uint;
    using SafeERC20 for IERC20;

    uint public price = 0;
    uint public nextMintId;
    uint public maxMintId;
    uint public maxTokensPerMint;

    // royalty fee in basis points (i.e. 100% = 10000, 1% = 100)
    uint royaltyBasisPoints = 500;
    // address for withdrawing money and receiving royalties, separate from owner
    address payable beneficiary;
    // Merkle Root for WL implementation
    bytes32 public merkleRoot;

    string public contractURI;
    string private baseURI;
    string private hiddenMetadataURI;

    mapping(address => uint) public _boughtCount;

    bool public _publicSaleStarted;
    bool public _saleStarted;
    bool public _revealed;

    IERC20 public stableToken;

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
    constructor(string memory _name, string memory _symbol, address _layerZeroEndpoint, uint _startMintId, uint _endMintId, uint _maxTokensPerMint, string memory _baseTokenURI, string memory _hiddenURI, address _stableToken) ONFT721(_name, _symbol, _layerZeroEndpoint) {
        nextMintId = _startMintId;
        maxMintId = _endMintId;
        maxTokensPerMint = _maxTokensPerMint;
        //set default beneficiary to owner
        beneficiary = payable(msg.sender);
        baseURI = _baseTokenURI;
        hiddenMetadataURI = _hiddenURI;
        stableToken = IERC20(_stableToken);
    }

    function setMintRage(uint _startMintId, uint _endMintId, uint _maxTokensPerMint) external onlyOwner {
        nextMintId = _startMintId;
        maxMintId = _endMintId;
        maxTokensPerMint = _maxTokensPerMint;
    }

    /// @notice mint with stable coin
    function _mintTokens(address minter, uint _nbTokens) internal {
        //using a local variable, _mint and ++X pattern to save gas
        uint local_nextMintId = nextMintId;
        for (uint i; i < _nbTokens; i++) {
            _mint(minter, ++local_nextMintId);
        }
        nextMintId = local_nextMintId;
    }

    /// @notice gasless mint 
    function publicMintGasless(uint _nbTokens, address minter) external onlyGelatoRelay {
        require(_publicSaleStarted == true, "ElementONFT721: Public sale has not started yet!");
        require(_saleStarted == true, "ElementONFT721: Sale has not started yet!");
        require(_nbTokens != 0, "ElementONFT721: Cannot mint 0 tokens!");
        require(_nbTokens <= maxTokensPerMint, "ElementONFT721: You cannot mint more than maxTokensPerMint tokens at once!");
        require(nextMintId + _nbTokens <= maxMintId, "ElementONFT721: max mint limit reached");
        require(price > 0, "ElementONFT721: you need to set stable price");
        require(address(stableToken) != address(0), "ElementONFT721: not support stable token");

        _transferRelayFee();

        stableToken.safeTransferFrom(minter, beneficiary, price * _nbTokens);

        _mintTokens(minter, _nbTokens);
    }

    /// @notice mint with stable coin
    function publicMint(uint _nbTokens) external {
        require(_publicSaleStarted == true, "ElementONFT721: Public sale has not started yet!");
        require(_saleStarted == true, "ElementONFT721: Sale has not started yet!");
        require(_nbTokens != 0, "ElementONFT721: Cannot mint 0 tokens!");
        require(_nbTokens <= maxTokensPerMint, "ElementONFT721: You cannot mint more than maxTokensPerMint tokens at once!");
        require(nextMintId + _nbTokens <= maxMintId, "ElementONFT721: max mint limit reached");
        require(price > 0, "ElementONFT721: you need to set stable price");
        require(address(stableToken) != address(0), "ElementONFT721: not support stable mint");

        stableToken.safeTransferFrom(msg.sender, beneficiary, price * _nbTokens);

        //using a local variable, _mint and ++X pattern to save gas
        _mintTokens(msg.sender, _nbTokens);
    }

    /// @notice Gasless Mint your ONFTs, whitelisted addresses only
    function mintGasless(uint _nbTokens, address minter, bytes32[] calldata _merkleProof) external onlyGelatoRelay {
        require(_saleStarted == true, "ElementONFT721: Sale has not started yet!");
        require(_nbTokens != 0, "ElementONFT721: Cannot mint 0 tokens!");
        require(_nbTokens <= maxTokensPerMint, "ElementONFT721: You cannot mint more than maxTokensPerMint tokens at once!");
        require(nextMintId + _nbTokens <= maxMintId, "ElementONFT721: max mint limit reached");
        require(_boughtCount[minter] + _nbTokens <= maxTokensPerMint, "ElementONFT721: You exceeded your token limit.");

        bool isWL = MerkleProof.verify(_merkleProof, merkleRoot, keccak256(abi.encodePacked(minter)));
        require(isWL == true, "ElementONFT721: Invalid Merkle Proof");

        _transferRelayFee();

        stableToken.safeTransferFrom(minter, beneficiary, price * _nbTokens);
        
        _boughtCount[minter] += _nbTokens;

        _mintTokens(minter, _nbTokens);
    }

    /// @notice Mint your ONFTs, whitelisted addresses only
    function mint(uint _nbTokens, bytes32[] calldata _merkleProof) external {
        require(_saleStarted == true, "ElementONFT721: Sale has not started yet!");
        require(_nbTokens != 0, "ElementONFT721: Cannot mint 0 tokens!");
        require(_nbTokens <= maxTokensPerMint, "ElementONFT721: You cannot mint more than maxTokensPerMint tokens at once!");
        require(nextMintId + _nbTokens <= maxMintId, "ElementONFT721: max mint limit reached");
        require(_boughtCount[msg.sender] + _nbTokens <= maxTokensPerMint, "ElementONFT721: You exceeded your token limit.");

        bool isWL = MerkleProof.verify(_merkleProof, merkleRoot, keccak256(abi.encodePacked(_msgSender())));
        require(isWL == true, "ElementONFT721: Invalid Merkle Proof");

        stableToken.safeTransferFrom(msg.sender, beneficiary, price * _nbTokens);

        _boughtCount[msg.sender] += _nbTokens;

        _mintTokens(msg.sender, _nbTokens);
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

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function setPrice(uint newPrice) external onlyOwner {
        price = newPrice;
    }

    function withdraw() public virtual onlyOwner {
        require(beneficiary != address(0), "AdvancedONFT721: Beneficiary not set!");
        uint _balance = address(this).balance;
        require(payable(beneficiary).send(_balance));
    }

    function royaltyInfo(uint, uint salePrice) external view returns (address receiver, uint royaltyAmount) {
        receiver = beneficiary;
        royaltyAmount = (salePrice * royaltyBasisPoints) / 10000;
    }

    function setContractURI(string memory _contractURI) public onlyOwner {
        contractURI = _contractURI;
    }

    function setBaseURI(string memory uri) public onlyOwner {
        baseURI = uri;
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

    function setStableToken(address _stableToken) external onlyOwner {
        stableToken = IERC20(_stableToken);
    }

    function flipRevealed() external onlyOwner {
        _revealed = !_revealed;
    }

    function flipSaleStarted() external onlyOwner {
        _saleStarted = !_saleStarted;
    }

    function flipPublicSaleStarted() external onlyOwner {
        _publicSaleStarted = !_publicSaleStarted;
    }

    function startClaim(uint claimableTokenCount, address claimableCollection) external onlyOwner {
        _claimable = true;
        _claimableTokenCount = claimableTokenCount;
        _claimableCollection = IERC721(claimableCollection);
    }

    function stopClaim() external onlyOwner {
        _claimable = false;
    }

    // The following functions are overrides required by Solidity.
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function tokenURI(uint tokenId) public view override(ERC721) returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        if (!_revealed) {
            return hiddenMetadataURI;
        }
        return string(abi.encodePacked(_baseURI(), tokenId.toString()));
    }

    receive() external payable {}
}