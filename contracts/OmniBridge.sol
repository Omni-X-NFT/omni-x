// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
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
    // regular address => ONFT address
    mapping(address => address) public onftAddresses;
    mapping(address => uint256) public collectionLockedCounter;

    constructor(address _lzEndpoint) NonblockingLzApp(_lzEndpoint) {
    }

    function wrap(
        uint16 _dstChainId,
        address _toAddress,
        address _erc721Address,
        uint256 _tokenId
    ) external payable override {
        if (_erc721Address == address(0)) revert NoZeroAddress();

        IERC721(_erc721Address).transferFrom(
            _msgSender(),
            address(this),
            _tokenId
        );
        
        if (onftAddresses[_erc721Address] == address(0)) {
            OmniNFT onft = new OmniNFT("name", "symbol", address(lzEndpoint), address(this));
            onftAddresses[_erc721Address] = address(onft);
        }

        // encode the payload with the number of tokenAddress, toAddress, tokenId
        bytes memory payload = abi.encode(_erc721Address, msg.sender, _tokenId);

        // get the fees we need to pay to LayerZero for message delivery
        (uint messageFee, ) = lzEndpoint.estimateFees(_dstChainId, address(this), payload, false, "");
        require(msg.value >= messageFee, "Required at least message fee amount");

        // send LayerZero message
        lzEndpoint.send{value: msg.value}(
            _dstChainId, // destination chainId
            abi.encodePacked(_toAddress), // destination address of PingPong contract
            payload, // abi.encode()'ed bytes
            payable(msg.sender), // refund address (LayerZero will refund any extra gas back to caller of send()
            address(0x0), // future param, unused for this example
            ""
        );
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
        (address _erc721Address, address _toAddress, uint _tokenId) = abi.decode(_payload, (address, address, uint));
        if (onftAddresses[_erc721Address] != address(0)) {
            IOmniNFT(onftAddresses[_erc721Address]).mint(_toAddress, _tokenId);
            collectionLockedCounter[onftAddresses[_erc721Address]] += 1;
        } else {
            OmniNFT onft = new OmniNFT("name", "symbol", address(lzEndpoint), address(this));
            IOmniNFT(address(onft)).mint(_toAddress, _tokenId);
            onftAddresses[_erc721Address] = address(onft);
            collectionLockedCounter[address(onft)] += 1;
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
