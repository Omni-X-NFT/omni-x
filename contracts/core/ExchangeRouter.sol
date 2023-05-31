// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {NonblockingLzApp} from "../lzApp/NonblockingLzApp.sol";
import {IExchangeRouter} from "../interfaces/IExchangeRouter.sol";
import {IStargatePoolManager} from "../interfaces/IStargatePoolManager.sol";
import {IStargateReceiver} from "../interfaces/IStargateReceiver.sol";

/**
 * @title ExchangeRouter
 * @notice Exchange the reservoir orders by using this contract.
 */
contract ExchangeRouter is IExchangeRouter, IStargateReceiver, NonblockingLzApp, ReentrancyGuard {
    using Address for address;

    struct ExecutionInfo {
        address module;     // exchange module address
        bytes data;         // function call data to exchange
        uint256 value;      // value
    }

    struct AmountCheckInfo {
        address target;     // currency contract
        bytes data;         // function call data to get balance
        uint256 threshold;  // minimum hold balance amount
    }

    struct CrossExchangeInfo {
        uint16 fromChainId;     // layer zero chain id
        uint16 toChainId;       // layer zero chain id
        uint256 amount;         // currency amount to be swapped
        address from;           // buyer
        address to;             // exchange router address on destination chain
        address currency;       // currency address
        address allowedModule;  // allowed module to take the funds.
        bool isNative;          // is native eth trading?
    }

    error UnsuccessfulExecution();
    error UnsuccessfulPayment();

    modifier refundETH() {
        _;

        uint256 leftover = address(this).balance;
        if (leftover > 0) {
            (bool success, ) = payable(msg.sender).call{value: leftover}("");
            if (!success) {
                revert UnsuccessfulPayment();
            }
        }
    }

    IStargatePoolManager public stargatePoolManager;

    /**
     * receive fallback
    */

    receive() external payable {}

    /**
     * constructor
     */
    constructor(address _lzEndpoint) NonblockingLzApp(_lzEndpoint) {}

    /**
    * set stargate pool manager
    */
    function setStargatePoolManager(address manager) external onlyOwner {
        stargatePoolManager = IStargatePoolManager(manager);
    }

    /**
     * execute the set of function calls
     */
    function execute(ExecutionInfo[] calldata executionInfos)
        external
        payable
        nonReentrant
        refundETH
    {
        uint256 length = executionInfos.length;
        for (uint256 i = 0; i < length; ) {
            _executeInternal(executionInfos[i]);

            unchecked {
                ++i;
            }
        }
    }

    /**
     * execute the set of executions with amoutn checking.
     * `executeWithAmountCheck` supports stopping the executions 
     * once the provided amount check reaches a certain value. This is useful when
     * trying to fill orders with slippage (eg. provide multiple orders and try to
     * fill until a certain balance is reached). In order to be flexible, checking
     * the amount is done generically by calling the `target` contract with `data`.
     * For example, this could be used to check the ERC721 total owned balance (by
     * using `balanceOf(owner)`), the ERC1155 total owned balance per token id (by
     * using `balanceOf(owner, tokenId)`), but also for checking the ERC1155 total
     * owned balance per multiple token ids (by using a custom contract that wraps
     * `balanceOfBatch(owners, tokenIds)`).
     */
    function executeWithAmountCheck(
        ExecutionInfo[] calldata executionInfos,
        AmountCheckInfo calldata amountCheckInfo
    ) external payable nonReentrant refundETH {

        // Cache some data for efficiency
        address target = amountCheckInfo.target;
        bytes calldata data = amountCheckInfo.data;
        uint256 threshold = amountCheckInfo.threshold;

        uint256 length = executionInfos.length;
        for (uint256 i = 0; i < length; ) {
            
            // Check the amount and break if it exceeds the threshold
            uint256 amount = _getAmount(target, data);
            if (amount >= threshold) {
                break;
            }

            _executeInternal(executionInfos[i]);

            unchecked {
                ++i;
            }
        }
    }

    /**
    * @notice get stargate payload
    * @param executionInfos execution infos
    * @dev this function is used only for makerAskWithTakerBid
     */
    function _getSgPayload(address allowedModule, bool isNative, ExecutionInfo[] calldata executionInfos)
        internal pure returns (bytes memory)
    {
        bytes memory payload = abi.encode(
            allowedModule,
            isNative,
            executionInfos
        );

        return payload;
    }

    /**
     * @notice get layerzero fees for matching a takerBid with a makerAsk
     * @param executionInfos taker bid order
     * @param crossInfo maker ask order
     * @return (omnixFee, fundManagerFee, nftTransferManagerFee)
     */
    function getLzFeesForTrading(ExecutionInfo[] calldata executionInfos, CrossExchangeInfo calldata crossInfo)
        public
        view
        returns (uint256)
    {
        if (crossInfo.fromChainId == crossInfo.toChainId) return 0;
        if (address(stargatePoolManager) == address(0)) return 0;
        if (!stargatePoolManager.isSwappable(crossInfo.currency, crossInfo.toChainId)) return 0;

        bytes memory payload = _getSgPayload(crossInfo.allowedModule, crossInfo.isNative, executionInfos);
        (uint256 fee, ) = stargatePoolManager.getSwapFee(crossInfo.toChainId, crossInfo.to, payload);

        return fee;
    }

    /**
     * cross exchange execution using stargate
     * @param executionInfos execution infos
     * @param crossInfo infos to execute the cross exchange.
     */
    function executeWithCross(ExecutionInfo[] calldata executionInfos, CrossExchangeInfo calldata crossInfo)
        external
        payable
        nonReentrant
        refundETH
    {
        require (crossInfo.fromChainId != crossInfo.toChainId, "ExchangeRouter: chain ids should be different");
        require (address(stargatePoolManager) != address(0), "ExechangeRouter: stargate pool manager is null");
        require (stargatePoolManager.isSwappable(crossInfo.currency, crossInfo.toChainId), "ExechangeRouter: currency is not swappable");

        bytes memory payload = _getSgPayload(crossInfo.allowedModule, crossInfo.isNative, executionInfos);

        if (!crossInfo.isNative) {
            stargatePoolManager.swap{value: msg.value}(
                crossInfo.currency,
                crossInfo.toChainId,
                payable(msg.sender),
                crossInfo.amount,
                crossInfo.from,
                crossInfo.to,
                payload
            );
        } else {
            stargatePoolManager.swapETH{value: msg.value}(
                crossInfo.toChainId,
                payable(msg.sender),
                crossInfo.amount,
                crossInfo.to,
                payload
            );
        }
    }

    function _executeInternal(ExecutionInfo memory executionInfo) internal {
        address module = executionInfo.module;

        // Ensure the target is a contract
        if (!module.isContract()) {
            revert UnsuccessfulExecution();
        }

        (bool success, ) = module.call{value: executionInfo.value}(
            executionInfo.data
        );
        if (!success) {
            revert UnsuccessfulExecution();
        }
    }

    function _getAmount(address target, bytes calldata data)
        internal
        view
        returns (uint256 amount)
    {
        // Ensure the target is a contract
        if (!target.isContract()) {
            revert UnsuccessfulExecution();
        }

        (bool success, bytes memory result) = target.staticcall(data);
        if (!success) {
            revert UnsuccessfulExecution();
        }

        amount = abi.decode(result, (uint256));
    }

    /**
     * @notice message listener from LayerZero endpoint
     * @param _payload message data
     * @dev no need to change this function
     */
    function _nonblockingLzReceive(uint16, bytes memory, uint64, bytes memory _payload) internal virtual override {
    }

    /**
    * @notice stargate swap receive callback
    */

    function sgReceive(
        uint16 ,                // the remote chainId sending the tokens
        bytes memory,           // the remote Bridge address
        uint256,                  
        address token,                // the token contract on the local chain
        uint256 _price,         // the qty of local _token contract tokens  
        bytes memory _payload
    ) external override {
        (address allowedModule, bool isNative, ExecutionInfo[] memory executionInfos) = abi.decode(_payload, (address, bool, ExecutionInfo[]));
        
        // transfer funds to allowedModule
        if (allowedModule != address(0)) {
            if (isNative) {
                payable(allowedModule).transfer(_price);
            } else {
                IERC20(token).transfer(allowedModule, _price);
            }
        }

        uint256 length = executionInfos.length;
        for (uint256 i = 0; i < length; ) {    
            _executeInternal(executionInfos[i]);
            unchecked {
                ++i;
            }
        }
    }
}