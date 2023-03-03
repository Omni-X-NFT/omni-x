// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// OpenZeppelin contracts
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// OmniX interfaces
import {ICurrencyManager} from "../interfaces/ICurrencyManager.sol";
import {IExecutionStrategy} from "../interfaces/IExecutionStrategy.sol";
import {IRoyaltyFeeManager} from "../interfaces/IRoyaltyFeeManager.sol";
import {IStargatePoolManager} from "../interfaces/IStargatePoolManager.sol";
import {IOFT} from "../token/oft/IOFT.sol";

interface IFundManager {
    function getFeesAndFunds(
        address strategy,
        address collection,
        uint256 tokenId,
        uint256 amount,
        bytes memory royaltyInfo
    ) external view returns(uint256, uint256, uint256, address);

    /**
     * @notice Calculate protocol fee for an execution strategy
     * @param executionStrategy strategy
     * @param amount amount to transfer
     */
    function calculateProtocolFee(address executionStrategy, uint256 amount) external view returns (uint256);

    function lzFeeTransferCurrency(
        address currency,
        address to,
        uint256 amount,
        uint16 fromChainId,
        uint16 toChainId
    ) external view returns(uint256);

    function transferFeesAndFunds(
        address strategy,
        address collection,
        uint256 tokenId,
        address currency,
        address from,
        address to,
        uint256 amount,
        uint16 fromChainId,
        uint16 toChainId,
        bytes memory royaltyInfo
    ) external payable;

    function transferFeesAndFundsWithWETH(
        address strategy,
        address collection,
        uint256 tokenId,
        address from,
        address to,
        uint256 amount,
        uint16 fromChainId,
        uint16 toChainId,
        bytes memory royaltyInfo
    ) external payable;

    function processFunds(uint proxyDataId, uint8 resp) external;

    function proxyTransfer(
        bytes memory royaltyInfo,
        uint256 amount,
        uint256 tokenId,
        address[2] memory operators,
        address[3] memory addresses,
        uint16[2] memory chainIds
    ) external payable returns (uint);
}