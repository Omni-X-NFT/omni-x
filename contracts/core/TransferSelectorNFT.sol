// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

import {ITransferSelectorNFT} from "../interfaces/ITransferSelectorNFT.sol";
import {ITransferManagerNFT} from "../interfaces/ITransferManagerNFT.sol";
import "hardhat/console.sol";

/**
 * @title TransferSelectorNFT
 * @notice It selects the NFT transfer manager based on a collection address.
 */
contract TransferSelectorNFT is ITransferSelectorNFT, IERC721Receiver, IERC1155Receiver, Ownable {
    // ERC721 interfaceID
    bytes4 public constant INTERFACE_ID_ERC721 = 0x80ac58cd;
    // ERC1155 interfaceID
    bytes4 public constant INTERFACE_ID_ERC1155 = 0xd9b67a26;
    // ERC721 interfaceID
    bytes4 public constant INTERFACE_ID_ONFT721 = 0x7bb0080b;
    // ERC1155 interfaceID
    bytes4 public constant INTERFACE_ID_ONFT1155 = 0x33577776;

    // Address of the transfer manager contract for ERC721 tokens
    address public immutable TRANSFER_MANAGER_ERC721;

    // Address of the transfer manager contract for ERC1155 tokens
    address public immutable TRANSFER_MANAGER_ERC1155;

    // Address of the transfer manager contract for ERC721 tokens
    address public immutable TRANSFER_MANAGER_ONFT721;

    // Address of the transfer manager contract for ERC1155 tokens
    address public immutable TRANSFER_MANAGER_ONFT1155;

    struct ProxyData {
        address collection;
        address from;
        address to;
        uint256 tokenId;
        uint256 amount;
    }

    // Map collection address to transfer manager address
    mapping(address => address) public transferManagerSelectorForCollection;
    // proxyDataId => ProxyData
    mapping (uint => ProxyData) private _proxyData;
    uint private _nextProxyDataId;

    event CollectionTransferManagerAdded(address indexed collection, address indexed transferManager);
    event CollectionTransferManagerRemoved(address indexed collection);

    /**
     * @notice Constructor
     * @param _transferManagerERC721 address of the ERC721 transfer manager
     * @param _transferManagerERC1155 address of the ERC1155 transfer manager
     * @param _transferManagerONFT721 address of the ONFT721 transfer manager
     * @param _transferManagerONFT1155 address of the ONFT1155 transfer manager
     */
    constructor(
        address _transferManagerERC721,
        address _transferManagerERC1155,
        address _transferManagerONFT721,
        address _transferManagerONFT1155
    ) {
        TRANSFER_MANAGER_ERC721 = _transferManagerERC721;
        TRANSFER_MANAGER_ERC1155 = _transferManagerERC1155;
        TRANSFER_MANAGER_ONFT721 = _transferManagerONFT721;
        TRANSFER_MANAGER_ONFT1155 = _transferManagerONFT1155;
    }

    function onERC721Received(address, address, uint256, bytes calldata) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function onERC1155Received(address, address, uint, uint, bytes memory) public virtual override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint[] memory, uint[] memory, bytes memory) public virtual override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId || interfaceId == type(IERC721Receiver).interfaceId;
    }

    /**
     * @notice Add a transfer manager for a collection
     * @param collection collection address to add specific transfer rule
     * @dev It is meant to be used for exceptions only (e.g., CryptoKitties)
     */
    function addCollectionTransferManager(address collection, address transferManager) external onlyOwner {
        require(collection != address(0), "Owner: Collection cannot be null address");
        require(transferManager != address(0), "Owner: TransferManager cannot be null address");

        transferManagerSelectorForCollection[collection] = transferManager;

        emit CollectionTransferManagerAdded(collection, transferManager);
    }

    /**
     * @notice Remove a transfer manager for a collection
     * @param collection collection address to remove exception
     */
    function removeCollectionTransferManager(address collection) external onlyOwner {
        require(
            transferManagerSelectorForCollection[collection] != address(0),
            "Owner: Collection has no transfer manager"
        );

        // Set it to the address(0)
        transferManagerSelectorForCollection[collection] = address(0);

        emit CollectionTransferManagerRemoved(collection);
    }

    /**
     * @notice Check the transfer manager for a token
     * @param collection collection address
     * @dev Support for ERC165 interface is checked AFTER custom implementation
     */
    function checkTransferManagerForToken(address collection) public view override returns (address transferManager) {
        // Assign transfer manager (if any)
        transferManager = transferManagerSelectorForCollection[collection];

        if (transferManager == address(0)) {
            // if (IERC165(collection).supportsInterface(INTERFACE_ID_ONFT721)) {
            //     transferManager = TRANSFER_MANAGER_ONFT721;
            // } else if (IERC165(collection).supportsInterface(INTERFACE_ID_ONFT1155)) {
            //     transferManager = TRANSFER_MANAGER_ONFT1155;
            // } else if (IERC165(collection).supportsInterface(INTERFACE_ID_ERC721)) {
            //     transferManager = TRANSFER_MANAGER_ERC721;
            // } else if (IERC165(collection).supportsInterface(INTERFACE_ID_ERC1155)) {
            //     transferManager = TRANSFER_MANAGER_ERC1155;
            // }

            if (IERC165(collection).supportsInterface(INTERFACE_ID_ERC721)) {
                transferManager = TRANSFER_MANAGER_ERC721;
            } else if (IERC165(collection).supportsInterface(INTERFACE_ID_ERC1155)) {
                transferManager = TRANSFER_MANAGER_ERC1155;
            }
        }

        return transferManager;
    }

    function is721(address collection) private view returns (bool) {
        return IERC165(collection).supportsInterface(INTERFACE_ID_ERC721);
    }

    function proxyTransferNFT(
        address collectionFrom,
        address,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint16 fromChainId,
        uint16 toChainId
    ) external payable override returns (uint) {
        require (fromChainId != toChainId, "proxy nft: invalid operation for same chain trading");

        ++_nextProxyDataId;
        _proxyData[_nextProxyDataId] = ProxyData(
            collectionFrom,
            from,
            to,
            tokenId,
            amount
        );

        address transferManager = checkTransferManagerForToken(collectionFrom);

        ITransferManagerNFT(transferManager).proxyTransfer(collectionFrom, from, address(this), tokenId, amount);

        return _nextProxyDataId;
    }

    function processNFT(
        uint proxyDataId,
        uint8 resp
    ) external override {
        require (_proxyData[proxyDataId].collection != address(0), "proxy nft: invalid data id");

        ProxyData storage data = _proxyData[proxyDataId];
        address transferManager = checkTransferManagerForToken(data.collection);

        if (is721(data.collection)) {
            if (!IERC721(data.collection).isApprovedForAll(address(this), transferManager)) {
                IERC721(data.collection).setApprovalForAll(transferManager, true);
            }
        } else {
            if (!IERC1155(data.collection).isApprovedForAll(address(this), transferManager)) {
                IERC1155(data.collection).setApprovalForAll(transferManager, true);
            }
        }

        // success
        if (resp == 1) {
            // ship
            ITransferManagerNFT(transferManager).proxyTransfer(
                data.collection,
                address(this),
                data.to,
                data.tokenId,
                data.amount
            );
        } else {
            // revert
            ITransferManagerNFT(transferManager).proxyTransfer(
                data.collection,
                address(this),
                data.from,
                data.tokenId,
                data.amount
            );
        }
    }
}
