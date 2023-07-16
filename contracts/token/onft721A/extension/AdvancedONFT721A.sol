// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8;

import "../ONFT721A.sol";
import "@openzeppelin/contracts/utils/Strings.sol";


contract AdvancedONFT721A is ONFT721A {

    using Strings for uint;

    struct FinanceDetails {
        address payable beneficiary;
        address payable taxRecipient;
        uint16 tax; // 100% = 10000
        uint price;
    }

    struct Metadata {
        string baseURI;
        string hiddenMetadataURI;
    }

    struct NFTState {
        bool saleStarted;
        bool revealed;
    }

    uint256 public startId;
    uint256 public maxId;
    uint256 public maxGlobalId;

    FinanceDetails private _financeDetails;
    Metadata public metadata;
    NFTState public state;

    modifier onlyBenficiaryAndOwner() {
        require(msg.sender == _financeDetails.beneficiary || msg.sender == owner(), "Caller is not beneficiary or owner");
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
        uint _price,
        address _taxRecipient
    ) ONFT721A(_name, _symbol, 1, _lzEndpoint, _startId) {
        startId = _startId;
        maxGlobalId = _maxGlobalId;
        maxId = _maxId;
        _financeDetails = FinanceDetails(payable(msg.sender), payable(_taxRecipient), _tax, _price );
        metadata = Metadata(_baseTokenURI, _hiddenURI);
    }

    function mint(uint256 _nbTokens) external payable {
        require(state.saleStarted);
        require(_nbTokens != 0);
        require(_nextTokenId() + _nbTokens - 1 <= maxId);
        require(_nbTokens * _financeDetails.price <= msg.value);
        _safeMint(msg.sender, _nbTokens);
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
        _financeDetails = _finance;
    }


    function setMetadata(Metadata calldata _metadata) external onlyBenficiaryAndOwner {
        metadata = _metadata;
    }

    function setNftState(NFTState calldata _state) external onlyBenficiaryAndOwner {
        state = _state;
    }

    function withdraw() external onlyBenficiaryAndOwner {
        require(_financeDetails.beneficiary != address(0));
        require(_financeDetails.taxRecipient != address(0));
        uint balance = address(this).balance;
        uint taxFee = balance * _financeDetails.tax / 10000;
        require(payable(_financeDetails.beneficiary).send(balance - taxFee));
        require(payable(_financeDetails.taxRecipient).send(taxFee));
        require(payable(_financeDetails.beneficiary).send(address(this).balance));
    } 

    function _baseURI() internal view override returns (string memory) {
        return metadata.baseURI;
    }

    function tokenURI(uint256 _tokenId) public view override(ERC721ASpecific, IERC721ASpecific) returns (string memory) {
        require(_exists(_tokenId));
        if (state.revealed) {
            return metadata.hiddenMetadataURI;
        } 
        return string(abi.encodePacked(_baseURI(), _tokenId.toString()));

    }

}