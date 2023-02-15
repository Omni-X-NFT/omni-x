// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";
import "./interfaces/IOmniBridge.sol";
import "./interfaces/IERC721Persistent.sol";
import "./interfaces/IERC1155Persistent.sol";
import "./lzApp/NonblockingLzApp.sol";
import "./token/ERC721Persistent.sol";
import "./token/ERC1155Persistent.sol";

error NoZeroAddress();

contract OmniBridge is
    NonblockingLzApp,
    IOmniBridge,
    Pausable
{

    event LzReceive(address ercAddress, address toAddress, uint tokenId, bytes payload, address persistentAddress);
    // regular address => PersistentNFT address
    mapping(address => address) public persistentAddresses;
    // PersistentNFT address => regular address
    mapping(address => address) public originAddresses;
    mapping(address => uint256) public collectionLockedCounter;

    constructor(address _lzEndpoint) NonblockingLzApp(_lzEndpoint) {}

    function wrap(
        uint16 _dstChainId,
        address _toAddress,
        address _erc721Address,
        uint256 _tokenId,
        bytes memory _adapterParams
    ) external payable override {
        if (_erc721Address == address(0)) revert NoZeroAddress();

        string memory name;
        string memory symbol;
        string memory tokenURI;
        address erc721Address;
        if (originAddresses[_erc721Address] != address(0)) {
            // In case re-send PersistentNFT to sender chain
            erc721Address = originAddresses[_erc721Address];
            name = IERC721Metadata(_erc721Address).name();
            symbol = IERC721Metadata(_erc721Address).symbol();
            tokenURI = IERC721Metadata(_erc721Address).tokenURI(_tokenId);
            IERC721Persistent(_erc721Address).burn(_tokenId);
        } else {
            erc721Address = _erc721Address;
            IERC721(_erc721Address).transferFrom(
                _msgSender(),
                address(this),
                _tokenId
            );
            name = IERC721Metadata(_erc721Address).name();
            symbol = IERC721Metadata(_erc721Address).symbol();
            tokenURI = IERC721Metadata(_erc721Address).tokenURI(_tokenId);
        }

        // encode the payload with the number of tokenAddress, toAddress, tokenId
        bytes memory payload = abi.encode(erc721Address, _toAddress, name, symbol, tokenURI, _tokenId);

        // get the fees we need to pay to LayerZero for message delivery
        (uint messageFee, ) = lzEndpoint.estimateFees(_dstChainId, address(this), payload, false, _adapterParams);
        require(msg.value >= messageFee, "Insufficient fee amount");

        _lzSend(_dstChainId, payload, payable(msg.sender), address(0x0), _adapterParams, msg.value);
    }

    function withdraw(address _persistentAddress, uint256 _tokenId)
        external
        override
    {
        if (originAddresses[_persistentAddress] == address(0)) revert NoZeroAddress();

        IERC721Persistent(_persistentAddress).burn(_tokenId);

        IERC721(originAddresses[_persistentAddress]).transferFrom(address(this), msg.sender, _tokenId);
    }

    function compareOwName(string memory _name) internal pure returns (bool) {
        if (bytes(_name).length <= 2) {
            return false;
        }
        bytes memory a = new bytes(2);
        a[0] = bytes(_name)[0];
        a[1] = bytes(_name)[1];
        return (keccak256(abi.encodePacked((string(a)))) == keccak256(abi.encodePacked(("Ow"))));
    }

    //@notice override this function
    function _nonblockingLzReceive(
        uint16,
        bytes memory,
        uint64,
        bytes memory _payload
    ) internal override {
        // decode the parameter
        (address _tokenAddress, address _toAddress, string memory _name, string memory _symbol, string memory _tokenURI, uint _tokenId) = abi.decode(_payload, (address, address, string, string, string, uint));

        address persistentAddress;
        if (persistentAddresses[_tokenAddress] == address(0)) {
            string memory _newName = _name;
            if (!compareOwName(_name)) {
                _newName = string(abi.encodePacked("Ow", _name));
            }
            ERC721Persistent persistentNFT = new ERC721Persistent(_newName, _symbol, address(this));
            persistentNFT.safeMint(_toAddress, _tokenId, _tokenURI);
            persistentAddresses[_tokenAddress] = address(persistentNFT);
            originAddresses[address(persistentNFT)] = _tokenAddress;
            collectionLockedCounter[address(persistentNFT)] += 1;
            persistentAddress = address(persistentNFT);
        } else {
            IERC721Persistent(persistentAddresses[_tokenAddress]).safeMint(_toAddress, _tokenId, _tokenURI);
            collectionLockedCounter[persistentAddresses[_tokenAddress]] += 1;
            persistentAddress = persistentAddresses[_tokenAddress];
        }
        emit LzReceive(_tokenAddress, _toAddress, _tokenId, _payload, persistentAddress);
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