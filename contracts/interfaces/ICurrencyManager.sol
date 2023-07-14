// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICurrencyManager {

    function getCorrespondingCurrency(address currency, uint16 lzChainId) external view  returns (address);
    
    function addCurrency(address currency, uint16[] calldata lzChainIds, address[] calldata currencies) external;

    function removeCurrency(address currency) external;

    function isCurrencyWhitelisted(address currency) external view returns (bool);

    function isOmniCurrency(address currency) external view returns (bool);

    function viewWhitelistedCurrencies(uint256 cursor, uint256 size) external view returns (address[] memory, uint256);

    function viewCountWhitelistedCurrencies() external view returns (uint256);
}