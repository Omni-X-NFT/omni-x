// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.4;

import "../../interfaces/ILayerZeroEndpoint.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../../lzApp/NonblockingLzApp.sol";
import "hardhat/console.sol";

//This is an advanced version of the Omnichain NFT contract
//It supports: persistent tokenId, private mint, maximum supply, expandable whitelist, metadata reveal and withdrawals
contract AdvancedONT is ERC721Enumerable, AccessControl, NonblockingLzApp {
    using Strings for uint256;

    /**
     * @dev Emitted when `_tokenId` are sent from `_srcChainId` to the `_toAddress` at this chain. `_nonce` is the inbound nonce.
     */
    event ReceiveFromChain(uint16 indexed _srcChainId, bytes indexed _srcAddress, address indexed _toAddress, uint _tokenId, uint64 _nonce);

    //Token price
    uint256 internal _price = 0;
    //Maximum id of the token that can be minted, included. nextTokenId on the next chain should start with this number
    uint256 public constant MAX_MINT = 10;
    uint256 public constant MAX_TOKENS_PER_MINT = 5;
    uint256 public nextTokenId = 0;

    // ** Address for withdrawing money, separate from owner
    address payable beneficiary;
    // address for receiving royalties and royalty fee in basis points (i.e. 100% = 10000, 1% = 100)
    address royaltyReceiver;
    uint256 royaltyBasisPoints = 500;

    uint gasForDestinationLzReceive = 350000;

    string private baseURI;
    string private uriSuffix = ".json";
    string private hiddenMetadataUri;

    mapping(address => uint256) public _allowList;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    bool public _publicSaleStarted;
    bool public _saleStarted;
    bool revealed;

    modifier whenSaleStarted() {
        require(_saleStarted, "Sale not started");
        _;
    }

    constructor(string memory name_, string memory symbol_, address _lzEndpoint, string memory baseURI_) ERC721(name_, symbol_) NonblockingLzApp(_lzEndpoint) {
        _setupRole(DEFAULT_ADMIN_ROLE, address(this));
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        beneficiary = payable(msg.sender);
        royaltyReceiver = msg.sender;
        baseURI = baseURI_;
        hiddenMetadataUri = "https://gateway.pinata.cloud/ipfs/QmdKa2BDar2Gws866ENUgXojmKXBSdyNm4KKfWHsRE4hrv";
    }

    function mint(uint256 _nbTokens) whenSaleStarted public payable virtual onlyRole(MINTER_ROLE) {
        require(_nbTokens != 0, "Cannot mint 0 tokens!");
        require(_nbTokens <= MAX_TOKENS_PER_MINT, "You cannot mint more than MAX_TOKENS_PER_MINT tokens at once!");
        require(nextTokenId + _nbTokens <= MAX_MINT, "Not enough Tokens left.");
        require(_nbTokens * _price <= msg.value, "Inconsistent amount sent!");
        require(_allowList[msg.sender] >= _nbTokens, "You exceeded the token limit.");

        _allowList[msg.sender] -= _nbTokens;

        uint256 local_nextTokenId = nextTokenId;
        for (uint256 i; i < _nbTokens; i++) {
            _mint(msg.sender, ++local_nextTokenId);
        }
        nextTokenId = local_nextTokenId;
    }

    function publicMint(uint256 _nbTokens) whenSaleStarted public payable virtual {
        require(_publicSaleStarted == true, "Public sale has not started yet!");
        require(_nbTokens != 0, "Cannot mint 0 tokens!");
        require(_nbTokens <= MAX_TOKENS_PER_MINT, "You cannot mint more than MAX_TOKENS_PER_MINT tokens at once!");
        require(nextTokenId + _nbTokens <= MAX_MINT, "Not enough Tokens left.");
        require(_nbTokens * _price <= msg.value, "Inconsistent amount sent!");

        uint256 local_nextTokenId = nextTokenId;
        for (uint256 i; i < _nbTokens; i++) {
            _mint(msg.sender, ++local_nextTokenId);
        }
        nextTokenId = local_nextTokenId;
    }

    function estimateFeesSendNFT(uint16 _chainId, uint _id) public view returns (uint fees) {
        require(trustedRemoteLookup[_chainId].length > 0, "This chain is currently unavailable for transfer");
        // abi.encode() the payload with the values to send
        bytes memory payload = abi.encode(msg.sender, _id);
        //abi encode a higher gas limit to pass to tx parameters
        bytes memory parameters = abi.encodePacked(uint16(1),gasForDestinationLzReceive);
        (uint nativeFee, ) = lzEndpoint.estimateFees(_chainId, address(this), payload, false, parameters);
        return nativeFee;
    }

    // send NFTs to another chain.    
    // this function sends NFTs from your address to the same address on the destination.
    function sendNFT(uint16 _chainId, uint _id) public payable {
        require(_isApprovedOrOwner(msg.sender, _id), "You need to approve or be owner of the token to send your NFTs!");
        require(trustedRemoteLookup[_chainId].length > 0, "This chain is currently unavailable for transfer");

        // abi.encode() the payload with the values to send
        bytes memory payload = abi.encode(msg.sender, _id);
        //abi encode a higher gas limit to pass to tx parameters
        bytes memory parameters = abi.encodePacked(uint16(1),gasForDestinationLzReceive);

        (uint nativeFee, ) = lzEndpoint.estimateFees(_chainId, address(this), payload, false, parameters);
        require(msg.value >= nativeFee, "Not enough for a cross-chain fee!");

        // burn the NFT
         _burn(_id);

        // send LayerZero message
        lzEndpoint.send{value:msg.value}(
            _chainId,                       // destination chainId
            trustedRemoteLookup[_chainId],  // destination address of Advanced ONT
            payload,                        // abi.encode()'ed bytes
            payable (msg.sender),           // on destination send to the same address as the caller of this function
            address(0x0),                   // 'zroPaymentAddress' unused for this mock/example
            parameters                      // 'txParameters'
        );
    }

    // receive the bytes payload from the source chain via LayerZero
    // _fromAddress is the source OmnichainNFT address
    function _nonblockingLzReceive(uint16 _srcChainId, bytes memory _fromAddress, uint64 _nonce, bytes memory _payload) override internal {
        // decode
        (address toAddr, uint tokenId) = abi.decode(_payload, (address, uint));

        // mint the NFT back into existence, to the toAddr from the message payload
        _mint(toAddr, tokenId);

        // emit the event
        emit ReceiveFromChain(_srcChainId, _fromAddress, toAddr, tokenId, _nonce);
    }

    // just in case this fixed variable limits us from future integrations
    function setGasForDestinationLzReceive(uint newGas) external onlyRole(DEFAULT_ADMIN_ROLE) {
        gasForDestinationLzReceive = newGas;
    }

    function withdraw() public virtual onlyRole(DEFAULT_ADMIN_ROLE) {
        require(beneficiary != address(0), "Beneficiary not set");

        uint256 _balance = address(this).balance;

        require(payable(beneficiary).send(_balance));
    }

    function flipSaleStarted() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _saleStarted = !_saleStarted;
    }

    function flipPublicSaleStarted() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _publicSaleStarted = !_publicSaleStarted;
    }
    
    function royaltyInfo(uint256, uint256 salePrice) external view returns (address receiver, uint256 royaltyAmount) {
        receiver = royaltyReceiver;
        royaltyAmount = salePrice * royaltyBasisPoints / 10000;
    }

    function setRoyaltyFee(uint256 _royaltyBasisPoints) external onlyRole(DEFAULT_ADMIN_ROLE) {
        royaltyBasisPoints = _royaltyBasisPoints;
    }

    function setRoyaltyReceiver(address _receiver) external onlyRole(DEFAULT_ADMIN_ROLE) {
        royaltyReceiver = _receiver;
    } 

    function setAllowList(address[] calldata addresses) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < addresses.length; i++) {
            grantRole(MINTER_ROLE, addresses[i]);
            _allowList[addresses[i]] = MAX_TOKENS_PER_MINT;
        }
    }

    function setBeneficiary(address payable _beneficiary) public virtual onlyRole(DEFAULT_ADMIN_ROLE) {
        beneficiary = _beneficiary;
    }

    function setHiddenMetadataUri(string memory _hiddenMetadataUri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        hiddenMetadataUri = _hiddenMetadataUri;
    }

    function flipRevealed() external onlyRole(DEFAULT_ADMIN_ROLE) {
        revealed = !revealed;
    }

    function setPrice(uint256 newPrice) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _price = newPrice;
    }

    // The following functions are overrides required by Solidity.
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721) {
        super._burn(tokenId);
    }
    
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function contractURI() public view returns (string memory) {
        return baseURI;
    }

    function setBaseURI(string calldata uri) public onlyRole(DEFAULT_ADMIN_ROLE) {
        baseURI = uri;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721)
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        if (revealed == false) {
            return hiddenMetadataUri;
        }
        string memory currentBaseURI = _baseURI();
        return bytes(currentBaseURI).length > 0
            ? string(abi.encodePacked(currentBaseURI, tokenId.toString(), uriSuffix))
            : "";
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}