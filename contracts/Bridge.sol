// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IOmniBridge.sol";
import "./interfaces/IOmniNFT.sol";
import "./lzApp/NonblockingLzApp.sol";
import "./OmniNFT.sol";
import "hardhat/console.sol";

error NoZeroAddress();

contract OmniBridge is
    NonblockingLzApp,
    ERC165,
    IOmniBridge,
    Pausable,
    ReentrancyGuard,
    AccessControl
{
    using Counters for Counters.Counter;

    Counters.Counter private _collectionIdCounter;
    mapping(address => bytes) public collectionIds;
    mapping(bytes => uint256) public collectionLockedCounter;

    constructor(address _lzEndpoint) NonblockingLzApp(_lzEndpoint) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _collectionIdCounter.increment();
    }

    function wrap(uint16 _dstChainId, bytes memory _toAddress, address _erc721Address, uint256 _tokenId) external override {
        if (_erc721Address == address(0)) revert NoZeroAddress();

        if (collectionIds[_erc721Address].length > 0) {
            (address onftAddress, uint onftTokenId) = abi.decode(collectionIds[_erc721Address], (address, uint));
            IOmniNFT(onftAddress).moveTo(_dstChainId, _toAddress, onftTokenId);
            collectionLockedCounter[collectionIds[_erc721Address]] += 1;
        } else {
            // string memory _name = IERC721(_erc721Address).name();
            _deploy(address(lzEndpoint), address(this), 121231234123123);
            address onftAddress = getAddress(address(lzEndpoint), address(this), 121231234123123);
            console.log(onftAddress);
            // OmniNFT onft = new OmniNFT("", "", address(lzEndpoint), address(this));
            // bytes memory collectionId = abi.encode(address(onft), _collectionIdCounter.current());
            // _collectionIdCounter.increment();
            // collectionIds[_erc721Address] = collectionId;
            // collectionLockedCounter[collectionId] += 1;
        }

        IERC721(_erc721Address).transferFrom(
            _msgSender(),
            address(this),
            _tokenId
        );
    }

    function withdraw(uint256 collectionId, uint256 tokenId)
        external
        override
    {}

    function _deploy(address lzEndpoint, address bridgeAddress, uint _salt) internal {
        address addr;
        bytes memory bytecode = abi.encodePacked(type(OmniNFT).creationCode, abi.encode("", "", lzEndpoint, bridgeAddress));
        assembly {
            addr := create2(
                0, // wei sent with current call
                // Actual code starts after skipping the first 32 bytes
                add(bytecode, 0x20),
                mload(bytecode), // Load the size of code contained in the first 32 bytes
                _salt // Salt from function arguments
            )

            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }
    }

    function getAddress(address lzEndpoint, address bridgeAddress, uint _salt)
        internal
        view
        returns (address)
    {
        bytes memory bytecode = abi.encodePacked(type(OmniNFT).creationCode, abi.encode("", "", lzEndpoint, bridgeAddress));

        bytes32 hash = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), _salt, keccak256(bytecode))
        );

        // NOTE: cast last 20 bytes of hash to address
        return address(uint160(uint(hash)));
    }

    function _send(
        address _from,
        uint16 _dstChainId,
        bytes memory _toAddress,
        uint256 _tokenId,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes memory _adapterParams
    ) internal virtual {
        // _debitFrom(_from, _dstChainId, _toAddress, _tokenId);

        bytes memory payload = abi.encode(_toAddress, _tokenId);
        _lzSend(
            _dstChainId,
            payload,
            _refundAddress,
            _zroPaymentAddress,
            _adapterParams
        );

        uint64 nonce = lzEndpoint.getOutboundNonce(_dstChainId, address(this));
        emit SendToChain(_from, _dstChainId, _toAddress, _tokenId, nonce);
    }

    //@notice override this function
    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal virtual override {}

    // overriding the virtual function in LzReceiver
    function _blockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal virtual override {
        // try-catch all errors/exceptions
        try
            this.nonblockingLzReceive(
                _srcChainId,
                _srcAddress,
                _nonce,
                _payload
            )
        {
            // do nothing
        } catch {
            // error / exception
            failedMessages[_srcChainId][_srcAddress][_nonce] = keccak256(
                _payload
            );
            emit MessageFailed(_srcChainId, _srcAddress, _nonce, _payload);
        }
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC165, AccessControl)
        returns (bool)
    {
        return interfaceId == type(IOmniBridge).interfaceId;
    }

    function estimateSendFee(
        uint16 _dstChainId,
        bytes memory _toAddress,
        uint256 _tokenId,
        bool _useZro,
        bytes memory _adapterParams
    ) public view virtual override returns (uint256 nativeFee, uint256 zroFee) {
        // mock the payload for send()
        bytes memory payload = abi.encode(_toAddress, _tokenId);
        return
            lzEndpoint.estimateFees(
                _dstChainId,
                address(this),
                payload,
                _useZro,
                _adapterParams
            );
    }

    function sendFrom(
        address _from,
        uint16 _dstChainId,
        bytes memory _toAddress,
        uint256 _tokenId,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes memory _adapterParams
    ) public payable {
        _send(
            _from,
            _dstChainId,
            _toAddress,
            _tokenId,
            _refundAddress,
            _zroPaymentAddress,
            _adapterParams
        );
    }
}
