// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "./interfaces/IOmniBridge.sol";
import "./interfaces/IOmniNFT.sol";
import "./lzApp/NonblockingLzApp.sol";
import "./OmniNFT.sol";

error NoZeroAddress();

contract OmniBridge is
    NonblockingLzApp,
    IOmniBridge,
    Pausable
{

    event LzReceive(address ercAddress, address toAddress, uint tokenId, bytes payload, address onftaddress);
    // regular address => ONFT address
    mapping(address => address) public onftAddresses;
    mapping(address => uint256) public collectionLockedCounter;

    constructor(address _lzEndpoint) NonblockingLzApp(_lzEndpoint) {
    }

    function wrap(
        uint16 _dstChainId,
        address _erc721Address,
        uint256 _tokenId
    ) external payable override {
        if (_erc721Address == address(0)) revert NoZeroAddress();

        IERC721(_erc721Address).transferFrom(
            _msgSender(),
            address(this),
            _tokenId
        );

        string memory name;
        string memory symbol;
        string memory tokenURI;
        if (onftAddresses[_erc721Address] == address(0)) {
            name = IERC721Metadata(_erc721Address).name();
            symbol = IERC721Metadata(_erc721Address).symbol();
            tokenURI = IERC721Metadata(_erc721Address).tokenURI(_tokenId);
            OmniNFT onft = new OmniNFT("name", "symbol", address(lzEndpoint), address(this));
            onftAddresses[_erc721Address] = address(onft);
        }

        // encode the payload with the number of tokenAddress, toAddress, tokenId
        bytes memory payload = abi.encode(_erc721Address, msg.sender, name, symbol, tokenURI, _tokenId);

        // use adapterParams v1 to specify more gas for the destination
        uint16 version = 1;
        uint gasForDestinationLzReceive = 6000000;
        bytes memory adapterParams = abi.encodePacked(version, gasForDestinationLzReceive);

        // get the fees we need to pay to LayerZero for message delivery
        (uint messageFee, ) = lzEndpoint.estimateFees(_dstChainId, address(this), payload, false, adapterParams);
        require(msg.value >= messageFee, "Required at least message fee amount");

        _lzSend(_dstChainId, payload, payable(msg.sender), address(0x0), adapterParams);
    }

    function withdraw(uint256 collectionId, uint256 tokenId)
        external
        override
    {}

    function setOnftAddress(address _erc721Address, address _onftAddress) public {
        if (_erc721Address == address(0)) revert NoZeroAddress();
        if (_onftAddress == address(0)) revert NoZeroAddress();

        onftAddresses[_erc721Address] = _onftAddress;
    }

    //@notice override this function
    function _nonblockingLzReceive(
        uint16,
        bytes memory,
        uint64,
        bytes memory _payload
    ) internal override {
        // decode the parameter
        (address _erc721Address, address _toAddress, string memory _name, string memory _symbol, string memory _tokenURI, uint _tokenId) = abi.decode(_payload, (address, address, string, string, string, uint));

        address onftAddress;
        if (onftAddresses[_erc721Address] != address(0)) {
            IOmniNFT(onftAddresses[_erc721Address]).mint(_toAddress, _tokenId);
            collectionLockedCounter[onftAddresses[_erc721Address]] += 1;
        } else {
            OmniNFT onft = new OmniNFT(_name, _symbol, address(lzEndpoint), address(this));
            onft.mintWithURI(_toAddress, _tokenId, _tokenURI);
            // IOmniNFT(address(onft)).mint(_toAddress, _tokenId);
            onftAddresses[_erc721Address] = address(onft);
            collectionLockedCounter[address(onft)] += 1;
            onftAddress = address(onft);
        }
        emit LzReceive(_erc721Address, _toAddress, _tokenId, _payload, onftAddress);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        returns (bool)
    {
        return interfaceId == type(IOmniBridge).interfaceId;
    }
}
