// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8;

import "../ONFT721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../../libraries/LinearCurve.sol";
import {toDaysWadUnsafe} from "solmate/src/utils/SignedWadMath.sol";

/// @title Interface of the AdvancedONFT standard
/// @author exakoss
/// @notice this implementation supports: batch mint, payable public and private mint, reveal of metadata and EIP-2981 on-chain royalties
contract DadBros is  ONFT721, ReentrancyGuard {
    using Strings for uint;
    using RadLinearCurve for RadLinearCurve.RadCurve;
    using SafeERC20 for IERC20;


    uint public tax = 1000; // 100% = 10000
    IERC20 public stableToken;
    uint16 public nextMintId;

    /*//////////////////////////////////////////////////////////////
                            MINT CONSTANTS
    //////////////////////////////////////////////////////////////*/

    uint16 public constant MAX_MINT_ID_FREE = 700;
    uint16 public constant MAX_MINT_ID_FRIENDS = 3000;
    uint8 public constant MAX_TOKENS_PER_MINT_FREE = 4;
    uint8 public constant MAX_TOKENS_PER_MINT_FRIENDS = 5;
    uint8 public constant MAX_TOKENS_PER_MINT_PUBLIC = 20;

    uint128 public constant MIN_PUBLIC_PRICE = 0.04 ether;
    uint128 public constant MAX_PUBLIC_PRICE = 0.1 ether;
    uint128 public constant PRICE_DECAY_AND_DELTA = 1e18 + 1e17;



   /*//////////////////////////////////////////////////////////////
                            MINT TYPES
    //////////////////////////////////////////////////////////////*/
    uint8 private constant MINT_FREE_ID = 1;
    uint8 private constant MINT_FRIENDS_ID = 2;
    uint8 private constant MINT_PUBLIC_ID = 3;

    /*//////////////////////////////////////////////////////////////
                             MINTING STATE
    //////////////////////////////////////////////////////////////*/
    uint256 public startTime;
    uint128 public spotPrice;
    uint256 public lastUpdate;


    address payable beneficiary;
    address payable taxRecipient;

    bytes32 public merkleRootFree;
    bytes32 public merkleRootFriends;

    string public contractURI;
    string private baseURI;
    string private hiddenMetadataURI;

    bool public _saleStarted;
    bool revealed;


    modifier onlyBeneficiaryAndOwner() {
        require(msg.sender == beneficiary || msg.sender == owner() , "AdvancedONFT721: caller is not the beneficiary");
        _;
    }

    /// @notice Constructor for the AdvancedONFT
    /// @param _name the name of the token
    /// @param _symbol the token symbol
    /// @param _layerZeroEndpoint handles message transmission across chains
    /// @param _baseTokenURI the base URI for computing the tokenURI
    /// @param _hiddenURI the URI for computing the hiddenMetadataUri
    constructor(
        string memory _name,
        string memory _symbol,
        address _layerZeroEndpoint,
        string memory _baseTokenURI,
        string memory _hiddenURI,
        uint _tax,
        address _taxRecipient,
        address _stableToken
    ) 
    ONFT721(_name, _symbol, _layerZeroEndpoint, 200000) 
    {
        beneficiary = payable(msg.sender);
        baseURI = _baseTokenURI;
        hiddenMetadataURI = _hiddenURI;
        tax = _tax;
        taxRecipient = payable(_taxRecipient);
        stableToken = IERC20(_stableToken);
    }

    function setTax(uint _tax) external onlyOwner {
        tax = _tax;
    }

    function setTaxRecipient(address payable _taxRecipient) external onlyOwner {
        taxRecipient = _taxRecipient;
    }
    


    /// @notice Mint your ONFTs, whitelisted addresses only
    function mint(uint _nbTokens, uint8 mintType, bytes32[] calldata _merkleProof) external payable {
        require(_saleStarted == true, "DadBros: Sale has not started yet!");
        require(_nbTokens > 0, "DadBros: Cannot mint 0 tokens");
        require(_nbTokens + nextMintId <= MAX_MINT_ID_FRIENDS, "DadBros: Max supply reached");
        require(mintType == MINT_FREE_ID || mintType == MINT_FRIENDS_ID || mintType == MINT_PUBLIC_ID, "DadBros: Invalid mint type");

        if (mintType == MINT_FREE_ID) {
            require(_nbTokens <= MAX_TOKENS_PER_MINT_FREE, "DadBros: Max tokens per mint reached");
            require(nextMintId + _nbTokens <= MAX_MINT_ID_FREE, "DadBros: Max supply reached");

            {
                bool isWl = MerkleProof.verify(_merkleProof, merkleRootFree, keccak256(abi.encodePacked(_msgSender())));
                require(isWl == true, "DadBros1: Invalid Merkle Proof");
            }
        } else if (mintType == MINT_FRIENDS_ID) {
            require(_nbTokens <= MAX_TOKENS_PER_MINT_FRIENDS, "DadBros: Max tokens per mint reached");

            {
                bool isWl = MerkleProof.verify(_merkleProof, merkleRootFriends, keccak256(abi.encodePacked(_msgSender())));
                require(isWl == true, "DadBros1: Invalid Merkle Proof");
            }
        } else if (mintType == MINT_PUBLIC_ID) {
            require(_nbTokens <= MAX_TOKENS_PER_MINT_PUBLIC, "DadBros: Max tokens per mint reached");
        }

        // GET VRGDA PRICE 
        RadLinearCurve.RadCurve memory curve = RadLinearCurve.RadCurve({
            lastUpdate: lastUpdate,
            spotPrice: spotPrice,
            priceDelta: PRICE_DECAY_AND_DELTA,
            priceDecay: PRICE_DECAY_AND_DELTA,
            maxPrice: MAX_PUBLIC_PRICE,
            minPrice: MIN_PUBLIC_PRICE
        });

        (uint128 newSpotPrice, uint256 totalPrice) = RadLinearCurve.getBuyInfo(curve, _nbTokens);

        //TRANSFER TOKENS
        if (msg.value == 0){
            stableToken.transferFrom(msg.sender, address(this), totalPrice);
        } else {
            require(msg.value >= totalPrice, "DadBros: Incorrect amount sent");
        }

       
        //using a local variable, _mint and ++X pattern to save gas
        uint16 local_nextMintId = nextMintId;
        for (uint i; i < _nbTokens; i++) {
            _mint(msg.sender, ++local_nextMintId);
        }
        nextMintId = local_nextMintId;
        spotPrice = newSpotPrice;
        lastUpdate = block.timestamp;
        
        //ADJUST WHITELIST SUPPLIES

    }

    function setMerkleRoot(bytes32 tier, bytes32 _merkleRoot) external onlyOwner {
        if (tier == "free") {
            merkleRootFree = _merkleRoot;
        } else if (tier == "friends") {
            merkleRootFriends = _merkleRoot;
        }
    }
     function setStableToken(address _stableToken) external onlyOwner {
        stableToken = IERC20(_stableToken);
    }
    // IMPLEMENT ETH WITHDRAWAL
    function withdraw() public virtual onlyBeneficiaryAndOwner {
    
        require(beneficiary != address(0), "AdvancedONFT721: Beneficiary not set!");
        uint _balance = address(this).balance;
        // tax: 100% = 10000
        uint _taxFee = _balance * tax / 10000;
        require(payable(beneficiary).send(_balance - _taxFee));
        require(payable(taxRecipient).send(_taxFee));
    }

    function setContractURI(string memory _contractURI) public onlyOwner {
        contractURI = _contractURI;
    }

    function setBaseURI(string memory uri) public onlyOwner {
        baseURI = uri;
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
        startTime = block.timestamp;
    }

    // The following functions are overrides required by Solidity.
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function tokenURI(uint tokenId) public view override(ERC721) returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        if (!revealed) {
            return hiddenMetadataURI;
        }
        return string(abi.encodePacked(_baseURI(), tokenId.toString()));
    }
    
}