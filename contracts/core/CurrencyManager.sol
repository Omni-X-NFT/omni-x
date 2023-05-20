// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// Interfaces
import {ICurrencyManager} from "../interfaces/ICurrencyManager.sol";

import {InterfaceChecker} from "../libraries/InterfaceChecker.sol";

// Dependencies
import {AffiliateManager} from "./AffiliateManager.sol";
import {IOFT} from "../token/oft/IOFT.sol";

/**
 * @title CurrencyManager
 * @notice This contract manages the list of valid fungible currencies.
 * @author LooksRare protocol team (👀,💎)
 */
abstract contract CurrencyManager is ICurrencyManager, AffiliateManager {
    /**
     * @notice It checks whether the currency is allowed for transacting.
     */
    mapping(address => bool) public isCurrencyAllowed;
    mapping(address => bool) public isCurrencyOmni;

    /**
     * @notice Constructor
     * @param _owner Owner address
     */
    constructor(address _endpoint, address _owner) AffiliateManager( _endpoint , _owner) {}

    /**
     * @notice This function allows the owner to update the status of a currency.
     * @param currency Currency address (address(0) for ETH)
     * @param isAllowed Whether the currency should be allowed for trading
     * @dev Only callable by owner.
     */
    function updateCurrencyStatus(address currency, bool isAllowed) external onlyOwner {
        isCurrencyAllowed[currency] = isAllowed;
        emit CurrencyStatusUpdated(currency, isAllowed);
        if (currency == address(0)) return;
        isCurrencyOmni[currency] = InterfaceChecker.check(currency, type(IOFT).interfaceId);

    }

    function isOmniCurrency(address currency) public view returns(bool) {
        return isCurrencyOmni[currency];
    }


   
}