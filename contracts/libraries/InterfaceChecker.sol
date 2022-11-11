// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import "hardhat/console.sol";

/**
 * @title InterfaceChecker
 * @notice This library allows check the inferface of the contracts.
 */
library InterfaceChecker {
    function check(
        address tokenContract,
        bytes4 interfaceId
    ) internal returns (bool) {
        bytes memory payload = abi.encodeWithSignature("supportsInterface(bytes4)", interfaceId);
        (bool success, bytes memory returnData) = tokenContract.call(payload);
        if (!success) return false;

        (bool result) = abi.decode(returnData, (bool));
        return result;
    }
}