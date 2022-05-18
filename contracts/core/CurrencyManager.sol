// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {ICurrencyManager} from "../interfaces/ICurrencyManager.sol";
import {InterfaceChecker} from "../libraries/InterfaceChecker.sol";
import {IOFT} from "../token/oft/IOFT.sol";

/**
 * @title CurrencyManager
 * @notice It allows adding/removing currencies for trading on the OmniX exchange.
 */
contract CurrencyManager is ICurrencyManager, Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private _whitelistedCurrencies;
    mapping (address => bool) private _omniCurrencies;

    event CurrencyRemoved(address indexed currency);
    event CurrencyWhitelisted(address indexed currency);

    /**
     * @notice Add a currency in the system
     * @param currency address of the currency to add
     */
    function addCurrency(address currency) external override onlyOwner {
        require(!_whitelistedCurrencies.contains(currency), "Currency: Already whitelisted");
        _whitelistedCurrencies.add(currency);
        _omniCurrencies[currency] = InterfaceChecker.check(currency, type(IOFT).interfaceId);
        emit CurrencyWhitelisted(currency);
    }

    /**
     * @notice Remove a currency from the system
     * @param currency address of the currency to remove
     */
    function removeCurrency(address currency) external override onlyOwner {
        require(_whitelistedCurrencies.contains(currency), "Currency: Not whitelisted");
        _whitelistedCurrencies.remove(currency);
        delete _omniCurrencies[currency];

        emit CurrencyRemoved(currency);
    }

    /**
     * @notice Returns if a currency is in the system
     * @param currency address of the currency
     */
    function isCurrencyWhitelisted(address currency) external view override returns (bool) {
        return _whitelistedCurrencies.contains(currency);
    }

    function isOmniCurrency(address currency) external view override returns (bool) {
        return _omniCurrencies[currency];
    }

    /**
     * @notice View number of whitelisted currencies
     */
    function viewCountWhitelistedCurrencies() external view override returns (uint256) {
        return _whitelistedCurrencies.length();
    }

    /**
     * @notice See whitelisted currencies in the system
     * @param cursor cursor (should start at 0 for first request)
     * @param size size of the response (e.g., 50)
     */
    function viewWhitelistedCurrencies(uint256 cursor, uint256 size)
        external
        view
        override
        returns (address[] memory, uint256)
    {
        uint256 length = size;

        if (length > _whitelistedCurrencies.length() - cursor) {
            length = _whitelistedCurrencies.length() - cursor;
        }

        address[] memory whitelistedCurrencies = new address[](length);

        for (uint256 i = 0; i < length; i++) {
            whitelistedCurrencies[i] = _whitelistedCurrencies.at(cursor + i);
        }

        return (whitelistedCurrencies, cursor + length);
    }
}