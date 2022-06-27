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

    event LzReceive(uint8 method, address ercAddress, address toAddress, uint tokenId, bytes payload, address onftaddress);

    uint8 public constant ERC721TYPE = 1;
    uint8 public constant ERC1155TYPE = 2;
    // regular address => PersistentNFT address
    mapping(address => address) public onftAddresses;
    // PersistentNFT address => regular address
    mapping(address => address) public regnftAddresses;
    mapping(address => uint256) public collectionLockedCounter;

    constructor(address _lzEndpoint) NonblockingLzApp(_lzEndpoint) {}

    function wrap(
        uint16 _dstChainId,
        address _erc721Address,
        uint256 _tokenId,
        bytes memory _adapterParams
    ) external payable override {
        if (_erc721Address == address(0)) revert NoZeroAddress();

        string memory name;
        string memory symbol;
        string memory tokenURI;
        address erc721Address;
        if (regnftAddresses[_erc721Address] != address(0)) {
            // In case re-send ONFT to sender chain
            erc721Address = regnftAddresses[_erc721Address];
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
        bytes memory payload = abi.encode(ERC721TYPE, erc721Address, msg.sender, name, symbol, tokenURI, _tokenId);

        // // use adapterParams v1 to specify more gas for the destination
        // uint16 version = 1;
        // uint gasForDestinationLzReceive = 3500000;
        // bytes memory adapterParams = abi.encodePacked(version, gasForDestinationLzReceive);

        // get the fees we need to pay to LayerZero for message delivery
        (uint messageFee, ) = lzEndpoint.estimateFees(_dstChainId, address(this), payload, false, _adapterParams);
        require(msg.value >= messageFee, "Insufficient fee amount");

        _lzSend(_dstChainId, payload, payable(msg.sender), address(0x0), _adapterParams);
    }

    function wrap1155(
        uint16 _dstChainId,
        address _erc1155Address,
        uint256 _tokenId,
        uint256 _amount,
        bytes memory _adapterParams
    ) external payable {
        if (_erc1155Address == address(0)) revert NoZeroAddress();

        string memory tokenURI;
        address erc1155Address;
        if (regnftAddresses[_erc1155Address] != address(0)) {
            // In case re-send ONFT to sender chain
            erc1155Address = regnftAddresses[_erc1155Address];
            tokenURI = IERC1155MetadataURI(_erc1155Address).uri(_tokenId);
            IERC1155Persistent(_erc1155Address).burn(_tokenId, _amount);
        } else {
            erc1155Address = _erc1155Address;
            IERC1155(_erc1155Address).safeTransferFrom(
                _msgSender(),
                address(this),
                _tokenId,
                _amount,
                ""
            );
            tokenURI = IERC1155MetadataURI(_erc1155Address).uri(_tokenId);
        }

        // encode the payload with the number of tokenAddress, toAddress, tokenId
        bytes memory payload = abi.encode(ERC1155TYPE, erc1155Address, msg.sender, "", "", tokenURI, _tokenId);

        // // use adapterParams v1 to specify more gas for the destination
        // uint16 version = 1;
        // uint gasForDestinationLzReceive = 3500000;
        // bytes memory adapterParams = abi.encodePacked(version, gasForDestinationLzReceive);

        // get the fees we need to pay to LayerZero for message delivery
        (uint messageFee, ) = lzEndpoint.estimateFees(_dstChainId, address(this), payload, false, _adapterParams);
        require(msg.value >= messageFee, "Insufficient fee amount");

        _lzSend(_dstChainId, payload, payable(msg.sender), address(0x0), _adapterParams);
    }

    function withdraw(address _onftAddress, uint256 _tokenId)
        external
        override
    {
        if (regnftAddresses[_onftAddress] == address(0)) revert NoZeroAddress();

        IERC721Persistent(_onftAddress).burn(_tokenId);

        IERC721(regnftAddresses[_onftAddress]).transferFrom(address(this), msg.sender, _tokenId);
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
        (uint8 _type, address _tokenAddress, address _toAddress, string memory _name, string memory _symbol, string memory _tokenURI, uint _tokenId) = abi.decode(_payload, (uint8, address, address, string, string, string, uint));

        if (_type == ERC721TYPE) {
            address onftAddress;
            if (onftAddresses[_tokenAddress] == address(0)) {
                string memory _newName = _name;
                if (!compareOwName(_name)) {
                    _newName = string(abi.encodePacked("Ow", _name));
                }
                ERC721Persistent onft = new ERC721Persistent(_newName, _symbol, address(this));
                onft.safeMint(_toAddress, _tokenId, _tokenURI);
                onftAddresses[_tokenAddress] = address(onft);
                regnftAddresses[address(onft)] = _tokenAddress;
                collectionLockedCounter[address(onft)] += 1;
                onftAddress = address(onft);
            } else {
                IERC721Persistent(onftAddresses[_tokenAddress]).safeMint(_toAddress, _tokenId, _tokenURI);
                collectionLockedCounter[onftAddresses[_tokenAddress]] += 1;
                onftAddress = onftAddresses[_tokenAddress];
            }
            emit LzReceive(_type, _tokenAddress, _toAddress, _tokenId, _payload, onftAddress);
        } else if (_type == ERC1155TYPE) {
            address onftAddress;
            if (onftAddresses[_tokenAddress] == address(0)) {
                ERC1155Persistent onft = new ERC1155Persistent("");
                onft.mint(_toAddress, _tokenId, _tokenId);
                onftAddresses[_tokenAddress] = address(onft);
                regnftAddresses[address(onft)] = _tokenAddress;
                collectionLockedCounter[address(onft)] += 1;
                onftAddress = address(onft);
            } else {
                IERC1155Persistent(onftAddresses[_tokenAddress]).mint(_toAddress, _tokenId, _tokenId);
                collectionLockedCounter[onftAddresses[_tokenAddress]] += 1;
                onftAddress = onftAddresses[_tokenAddress];
            }
            emit LzReceive(_type, _tokenAddress, _toAddress, _tokenId, _payload, onftAddress);
        }
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
