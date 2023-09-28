// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// OpenZeppelin contracts
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// OmniX interfaces
import {ICurrencyManager} from "../interfaces/ICurrencyManager.sol";
import {IExecutionStrategy} from "../interfaces/IExecutionStrategy.sol";
import {IRoyaltyFeeManager} from "../interfaces/IRoyaltyFeeManager.sol";
import {IStargatePoolManager} from "../interfaces/IStargatePoolManager.sol";
import {IOFT} from "@layerzerolabs/solidity-examples/contracts/token/oft/IOFT.sol";


interface IFundManager {
    function getFeesAndFunds(
        address strategy,
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
        uint16 toChainId,
        bytes memory payload
    ) external view returns(uint256);

    function transferFeesAndFunds(address strategy, address currency, uint price, address from, address to, bytes memory royaltyInfo) external payable;
    function transferFeesAndFundsWithWETH(address strategy, address to, uint price, bytes memory royaltyInfo) external payable;
    function transferProxyFunds(address currency, address from, uint price, uint16 fromChainId, uint16 toChainId, bytes memory payload) external payable;
    function processFeesAndFunds(address currency, address seller, address buyer, address strategy, uint price, bytes memory royaltyInfo, uint16 transferType) external;
}