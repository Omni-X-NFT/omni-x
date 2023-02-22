// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IONFT1155.sol";
import "./ONFT1155Core.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "operator-filter-registry/src/DefaultOperatorFilterer.sol";



// NOTE: this ONFT contract has no public minting logic.
// must implement your own minting logic in child classes
contract ONFT1155 is ONFT1155Core, ERC1155Supply, DefaultOperatorFilterer, IONFT1155 {
    constructor(string memory _uri, address _lzEndpoint) ERC1155(_uri) ONFT1155Core(_lzEndpoint) {}

    function supportsInterface(bytes4 interfaceId) public view virtual override(ONFT1155Core, ERC1155, IERC165) returns (bool) {
        return interfaceId == type(IONFT1155).interfaceId || super.supportsInterface(interfaceId);
    }

    function _debitFrom(address _from, uint16, bytes memory, uint[] memory _tokenIds, uint[] memory _amounts) internal virtual override {
        address spender = _msgSender();
        require(spender == _from || isApprovedForAll(_from, spender), "ONFT1155: send caller is not owner nor approved");
        _burnBatch(_from, _tokenIds, _amounts);
    }

    function _creditTo(uint16, address _toAddress, uint[] memory _tokenIds, uint[] memory _amounts) internal virtual override {
        _mintBatch(_toAddress, _tokenIds, _amounts, "");
    }
    function setApprovalForAll(address operator, bool approved) public override(ERC1155, IERC1155) onlyAllowedOperatorApproval(operator) {
        super.setApprovalForAll(operator, approved);
    }

    /**
     * @dev See {IERC1155-safeTransferFrom}.
     *      In this example the added modifier ensures that the operator is allowed by the OperatorFilterRegistry.
     */
    function safeTransferFrom(address from, address to, uint256 tokenId, uint256 amount, bytes memory data)
        public
        override(ERC1155, IERC1155)
        onlyAllowedOperator(from)
    {
        super.safeTransferFrom(from, to, tokenId, amount, data);
    }

    /**
     * @dev See {IERC1155-safeBatchTransferFrom}.
     *      In this example the added modifier ensures that the operator is allowed by the OperatorFilterRegistry.
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public virtual override(ERC1155, IERC1155) onlyAllowedOperator(from) {
        super.safeBatchTransferFrom(from, to, ids, amounts, data);
    }

  
}

