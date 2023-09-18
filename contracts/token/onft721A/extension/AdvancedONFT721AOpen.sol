// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8;

import "../ONFT721AOpen.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "solmate/src/utils/MerkleProofLib.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


error saleInactive();
error zeroAmount();
error maxSupplyReached();
error insufficientValue();
error nonWhitelist();
contract AdvancedONFT721AOpen is ONFT721AOpen {

    using Strings for uint;
    using MerkleProofLib for bytes32[];

    struct FinanceDetails {
        
        address payable beneficiary;
        address payable taxRecipient;
        address token;
        uint128 price;
        uint128 wlPrice;
        uint16 tax;

    }

    struct Metadata {
        string baseURI;
        string hiddenMetadataURI;
    }

    struct NFTState {
        bool saleStarted;
        bool revealed;
        uint256 startTime; // UNIX timestampt
        uint256 mintLength; // number of seconds after start time mint is available for
    }

    uint256 public startId;
    uint256 public maxId;
    uint256 public maxGlobalId;
    bytes32 public merkleRoot;


    FinanceDetails public financeDetails;
    Metadata public metadata;
    NFTState public state;

    modifier onlyBenficiaryAndOwner() {
        require(msg.sender == financeDetails.beneficiary || msg.sender == owner(), "Caller is not beneficiary or owner");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        uint256 _startId,
        uint256 _maxId,
        uint256 _maxGlobalId,
        string memory _baseTokenURI,
        string memory _hiddenURI,
        uint16 _tax,
        uint128 _price,
        uint128 _wlPrice,
        address token,
        address _taxRecipient,
        address _beneficiary
    ) ONFT721AOpen(_name, _symbol, 1, _lzEndpoint, _startId) {
        startId = _startId;
        maxGlobalId = _maxGlobalId;
        maxId = _maxId;
        financeDetails = FinanceDetails(payable(_beneficiary), payable(_taxRecipient),token, _price, _wlPrice, _tax );
        metadata = Metadata(_baseTokenURI, _hiddenURI);
    }


    function mint(uint256 _nbTokens) public virtual payable {
        if (!state.saleStarted) _revert(saleInactive.selector);
        if (_nbTokens == 0) _revert(zeroAmount.selector);
        if (_nextTokenId() + _nbTokens - 1 > maxId) _revert(maxSupplyReached.selector);
        if (state.startTime + state.mintLength < block.timestamp) _revert(saleInactive.selector);
        if (financeDetails.token == address(0)) {
            if (msg.value < financeDetails.price * _nbTokens) _revert(insufficientValue.selector);
        } else {
            IERC20(financeDetails.token).transferFrom(msg.sender, address(this), financeDetails.price * _nbTokens);
        }

        _mint(msg.sender, _nbTokens);
    }
    function whitelistMint(uint256 _nbTokens, bytes32[] calldata _merkleProof) public virtual payable {
        if (!(_merkleProof.verify(merkleRoot, keccak256(abi.encodePacked(msg.sender))))) _revert(nonWhitelist.selector);
        if (!state.saleStarted) _revert(saleInactive.selector);
        if (_nbTokens == 0) _revert(zeroAmount.selector);
        if (_nextTokenId() + _nbTokens - 1 > maxId) _revert(maxSupplyReached.selector);
        if (state.startTime + state.mintLength < block.timestamp) _revert(saleInactive.selector);
        if (financeDetails.token == address(0)) {
            if (msg.value < financeDetails.price * _nbTokens) _revert(insufficientValue.selector);
        } else {
            IERC20(financeDetails.token).transferFrom(msg.sender, address(this), financeDetails.price * _nbTokens);
        }

        _mint(msg.sender, _nbTokens);        
    }

    function _getMaxGlobalId() internal view override returns (uint256) {
        return maxGlobalId;
    }

    function _getMaxId() internal view override returns (uint256) {
        return maxId;
    }

    function _startTokenId() internal view override returns(uint256) {
        return startId;
    }

    function setMintRange(uint32 _start, uint32 _end) external onlyOwner {
        require (_start > uint32(_totalMinted()));
        require (_end > _start);
        startId = _start;
        maxId = _end;
    }
    

    function setFinanceDetails(FinanceDetails calldata _finance) external onlyOwner {
        financeDetails = _finance;
    }


    function setMetadata(Metadata calldata _metadata) external onlyBenficiaryAndOwner {
        metadata = _metadata;
    }

    function setNftState(NFTState calldata _state) external onlyBenficiaryAndOwner {
        state = NFTState(_state.saleStarted, _state.revealed, block.timestamp, _state.mintLength);
    }
    function withdraw() external onlyBenficiaryAndOwner {
        address beneficiary = financeDetails.beneficiary;
        address taxRecipient = financeDetails.taxRecipient;
        address token = financeDetails.token;
        require(beneficiary != address(0));
        require(taxRecipient != address(0));

        if (token == address(0)) {
            uint balance = address(this).balance;
            uint taxFee = balance * financeDetails.tax / 10000;
            payable(owner()).transfer(balance - taxFee);
            payable(taxRecipient).transfer(taxFee);
        } else {
            uint balance = IERC20(token).balanceOf(address(this));
            uint taxFee = balance * financeDetails.tax / 10000;
            IERC20(token).transfer(beneficiary, balance - taxFee);
            IERC20(token).transfer(taxRecipient, taxFee);

        }
    } 
    function _baseURI() internal view override returns (string memory) {
        return metadata.baseURI;
    }

    function tokenURI(uint256 _tokenId) public view virtual override(ERC721ASpecific, IERC721ASpecific) returns (string memory) {
        require(_exists(_tokenId));
        if (!state.revealed) {
            return metadata.hiddenMetadataURI;
        } 
        return metadata.baseURI;
    }

}