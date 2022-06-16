import {
  createContractByName,
  getChainId,
  getContractAddrByName
} from './shared'
import {
  CurrencyManager,
  ExecutionManager,
  TransferSelectorNFT,
  TransferManagerGhosts,
  RemoteAddrManager,
  OFTMock,
  TransferManagerERC721,
  TransferManagerERC1155,
  TransferManagerONFT721,
  TransferManagerONFT1155
} from '../typechain-types'
import CurrencyManagerAbi from '../artifacts/contracts/core/CurrencyManager.sol/CurrencyManager.json'
import ExecutionManagerAbi from '../artifacts/contracts/core/ExecutionManager.sol/ExecutionManager.json'
import TransferSelectorNFTAbi from '../artifacts/contracts/core/TransferSelectorNFT.sol/TransferSelectorNFT.json'
import TransferManagerGhostsAbi from '../artifacts/contracts/transfer/TransferManagerGhosts.sol/TransferManagerGhosts.json'
import TransferManager721Abi from '../artifacts/contracts/transfer/TransferManagerERC721.sol/TransferManagerERC721.json'
import TransferManager1155Abi from '../artifacts/contracts/transfer/TransferManagerERC721.sol/TransferManagerERC721.json'
import TransferManagerONFT721Abi from '../artifacts/contracts/transfer/TransferManagerONFT721.sol/TransferManagerONFT721.json'
import TransferManagerONFT1155Abi from '../artifacts/contracts/transfer/TransferManagerONFT1155.sol/TransferManagerONFT1155.json'
import RemoteAddrManagerAbi from '../artifacts/contracts/core/RemoteAddrManager.sol/RemoteAddrManager.json'
import OFTMockAbi from '../artifacts/contracts/mocks/OFTMock.sol/OFTMock.json'

export const prepareOmniX = async () => {
  // @ts-ignore
  // eslint-disable-next-line
  const _hre = hre
  const { ethers, network } = _hre
  const [owner] = await ethers.getSigners()

  const currencyManager = createContractByName(_hre, 'CurrencyManager', CurrencyManagerAbi.abi, owner) as CurrencyManager
  const executionManager = createContractByName(_hre, 'ExecutionManager', ExecutionManagerAbi.abi, owner) as ExecutionManager
  const transferSelector = createContractByName(_hre, 'TransferSelectorNFT', TransferSelectorNFTAbi.abi, owner) as TransferSelectorNFT

  await currencyManager.addCurrency(getContractAddrByName(network.name, 'OFTMock'))
  await executionManager.addStrategy(getContractAddrByName(network.name, 'StrategyStandardSale'))
  await transferSelector.addCollectionTransferManager(getContractAddrByName(network.name, 'ghosts'), getContractAddrByName(network.name, 'TransferManagerGhosts'))
}

export const linkOmniX = async (taskArgs: any) => {
  // @ts-ignore
  // eslint-disable-next-line
  const _hre = hre
  const { ethers, network } = _hre
  const [owner, , , deployer] = await ethers.getSigners()

  const { dstchainname: dstNetwork } = taskArgs
  const dstChainId = getChainId(dstNetwork)

  const transferManagerGhosts = createContractByName(_hre, 'TransferManagerGhosts', TransferManagerGhostsAbi.abi, deployer) as TransferManagerGhosts
  await transferManagerGhosts.setTrustedRemote(dstChainId, getContractAddrByName(dstNetwork, 'TransferManagerGhosts'))
  const transferManager721 = createContractByName(_hre, 'TransferManagerERC721', TransferManager721Abi.abi, owner) as TransferManagerERC721
  await transferManager721.setTrustedRemote(dstChainId, getContractAddrByName(dstNetwork, 'TransferManagerERC721'))
  const transferManager1155 = createContractByName(_hre, 'TransferManagerERC1155', TransferManager1155Abi.abi, owner) as TransferManagerERC1155
  await transferManager1155.setTrustedRemote(dstChainId, getContractAddrByName(dstNetwork, 'TransferManagerERC1155'))
  const transferManagerONFT721 = createContractByName(_hre, 'TransferManagerONFT721', TransferManagerONFT721Abi.abi, owner) as TransferManagerONFT721
  await transferManagerONFT721.setTrustedRemote(dstChainId, getContractAddrByName(dstNetwork, 'TransferManagerONFT721'))
  const transferManagerONFT1155 = createContractByName(_hre, 'TransferManagerONFT1155', TransferManagerONFT1155Abi.abi, owner) as TransferManagerONFT1155
  await transferManagerONFT1155.setTrustedRemote(dstChainId, getContractAddrByName(dstNetwork, 'TransferManagerONFT1155'))

  const omni = createContractByName(_hre, 'OFTMock', OFTMockAbi.abi, owner) as OFTMock
  await omni.setTrustedRemote(dstChainId, getContractAddrByName(dstNetwork, 'OFTMock'))

  const remoteAddrManager = createContractByName(_hre, 'RemoteAddrManager', RemoteAddrManagerAbi.abi, owner) as RemoteAddrManager
  await remoteAddrManager.addRemoteAddress(getContractAddrByName(dstNetwork, 'OFTMock'), dstChainId, getContractAddrByName(network.name, 'OFTMock'))
  await remoteAddrManager.addRemoteAddress(getContractAddrByName(dstNetwork, 'ghosts'), dstChainId, getContractAddrByName(network.name, 'ghosts'))
  await remoteAddrManager.addRemoteAddress(getContractAddrByName(dstNetwork, 'StrategyStandardSale'), dstChainId, getContractAddrByName(network.name, 'StrategyStandardSale'))
}
