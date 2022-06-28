// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";
import "./interfaces/IOmniBridge1155.sol";
import "./interfaces/IERC1155Persistent.sol";
import "./lzApp/NonblockingLzApp.sol";
import "./token/ERC1155Persistent.sol";

error NoZeroAddress();

contract OmniBridge1155 is
    NonblockingLzApp,
    IOmniBridge1155,
    Pausable
{

    event LzReceive(address ercAddress, address toAddress, uint tokenId, bytes payload, address onftaddress);

    // regular address => PersistentNFT address
    mapping(address => address) public persistentAddresses;
    // PersistentNFT address => regular address
    mapping(address => address) public originAddresses;
    mapping(address => uint256) public collectionLockedCounter;

    constructor(address _lzEndpoint) NonblockingLzApp(_lzEndpoint) {}

    function wrap(
        uint16 _dstChainId,
        address _erc1155Address,
        uint256 _tokenId,
        uint256 _amount,
        bytes memory _adapterParams
    ) external override payable {
        if (_erc1155Address == address(0)) revert NoZeroAddress();

        string memory tokenURI;
        address erc1155Address;
        if (persistentAddresses[_erc1155Address] != address(0)) {
            // In case re-send ONFT to sender chain
            erc1155Address = persistentAddresses[_erc1155Address];
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
        bytes memory payload = abi.encode(erc1155Address, msg.sender, tokenURI, _tokenId, _amount);

        // get the fees we need to pay to LayerZero for message delivery
        (uint messageFee, ) = lzEndpoint.estimateFees(_dstChainId, address(this), payload, false, _adapterParams);
        require(msg.value >= messageFee, "Insufficient fee amount");

        _lzSend(_dstChainId, payload, payable(msg.sender), address(0x0), _adapterParams);
    }

    function withdraw(address _persistentAddress, uint256 _tokenId, uint256 _amount)
        external
        override
    {
        if (persistentAddresses[_persistentAddress] == address(0)) revert NoZeroAddress();

        IERC1155Persistent(_persistentAddress).burn(_tokenId, _amount);

        IERC1155(persistentAddresses[_persistentAddress]).safeTransferFrom(address(this), msg.sender, _tokenId, _amount, "");
    }

    //@notice override this function
    function _nonblockingLzReceive(
        uint16,
        bytes memory,
        uint64,
        bytes memory _payload
    ) internal override {
        // decode the parameter
        (address _tokenAddress, address _toAddress, string memory _tokenURI, uint _tokenId, uint _amount) = abi.decode(_payload, (address, address, string, uint, uint));

        address persistentAddress;
        if (persistentAddresses[_tokenAddress] == address(0)) {
            ERC1155Persistent persistentNFT = new ERC1155Persistent();
            persistentNFT.mint(_toAddress, _tokenId, _amount);
            persistentNFT.setURI(_tokenId, _tokenURI);
            persistentAddresses[_tokenAddress] = address(persistentNFT);
            originAddresses[address(persistentNFT)] = _tokenAddress;
            collectionLockedCounter[address(persistentNFT)] += 1;
            persistentAddress = address(persistentNFT);
        } else {
            IERC1155Persistent(persistentAddresses[_tokenAddress]).mint(_toAddress, _tokenId, _amount);
            IERC1155Persistent(persistentAddresses[_tokenAddress]).setURI(_tokenId, _tokenURI);
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
        return interfaceId == type(IOmniBridge1155).interfaceId;
    }
}
