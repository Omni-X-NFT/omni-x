import {
    createContractByName,
    getContractAddrByName
} from './shared'
import {
    CurrencyManager,
    ExecutionManager,
    TransferSelectorNFT,
    TransferManagerGhosts,
    RemoteAddrManager
  } from '../typechain-types'
import CurrencyManagerAbi from '../artifacts/contracts/core/CurrencyManager.sol/CurrencyManager.json'
import ExecutionManagerAbi from '../artifacts/contracts/core/ExecutionManager.sol/ExecutionManager.json'
import TransferSelectorNFTAbi from '../artifacts/contracts/core/TransferSelectorNFT.sol/TransferSelectorNFT.json'
import TransferManagerGhostsAbi from '../artifacts/contracts/transfer/TransferManagerGhosts.sol/TransferManagerGhosts.json'
import RemoteAddrManagerAbi from '../artifacts/contracts/core/RemoteAddrManager.sol/RemoteAddrManager.json'

export const prepareOmniX = async() => {
    // @ts-ignore
    const _hre = hre
    const { ethers, network } = _hre
    const [ owner ] = await ethers.getSigners()

    const currencyManager = createContractByName(_hre, 'CurrencyManager', CurrencyManagerAbi.abi, owner) as CurrencyManager
    const executionManager = createContractByName(_hre, 'ExecutionManager', ExecutionManagerAbi.abi, owner) as ExecutionManager
    const transferSelector = createContractByName(_hre, 'TransferSelectorNFT', TransferSelectorNFTAbi.abi, owner) as TransferSelectorNFT

    await currencyManager.addCurrency(getContractAddrByName(network.name, 'OFTMock'))
    await executionManager.addStrategy(getContractAddrByName(network.name, 'StrategyStandardSale'))
    await transferSelector.addCollectionTransferManager(getContractAddrByName(network.name, 'ghosts'), getContractAddrByName(_hre, 'TransferManagerGhosts'))
}

export const linkOmniX = async(taskArgs: any) => {
    // @ts-ignore
    const _hre = hre
    const { ethers, network } = _hre
    const [ owner ] = await ethers.getSigners()

    const {dstchainid: dstChainId, dstchainname: dstNetwork } = taskArgs

    const transferManagerGhosts = createContractByName(_hre, 'TransferManagerGhosts', TransferManagerGhostsAbi.abi, owner) as TransferManagerGhosts    
    await transferManagerGhosts.setTrustedRemote(dstChainId, getContractAddrByName(network.name, 'TransferManagerGhosts'))

    const remoteAddrManager = createContractByName(_hre, 'RemoteAddrManager', RemoteAddrManagerAbi.abi, owner) as RemoteAddrManager
    await remoteAddrManager.addRemoteAddress(getContractAddrByName(dstNetwork, 'OFTMock'), dstChainId, getContractAddrByName(network.name, 'OFTMock'))
    await remoteAddrManager.addRemoteAddress(getContractAddrByName(dstNetwork, 'ghosts'), dstChainId, getContractAddrByName(network.name, 'ghosts'))

}