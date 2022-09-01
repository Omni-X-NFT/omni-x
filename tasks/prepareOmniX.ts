import {
  createContractByName,
  getChainId,
  getContractAddrByName,
  getPoolId,
  loadAbi,
  toWei,
  waitFor
} from './shared'
import STARGATE from '../constants/stargate.json'
import shell from 'shelljs'

const TRANSACTION_CONFIRM_DELAY = 5000
const CurrencyManagerAbi = loadAbi('../artifacts/contracts/core/CurrencyManager.sol/CurrencyManager.json')
const ExecutionManagerAbi = loadAbi('../artifacts/contracts/core/ExecutionManager.sol/ExecutionManager.json')
const TransferSelectorNFTAbi = loadAbi('../artifacts/contracts/core/TransferSelectorNFT.sol/TransferSelectorNFT.json')
const TransferManagerGhostsAbi = loadAbi('../artifacts/contracts/transfer/TransferManagerGhosts.sol/TransferManagerGhosts.json')
const TransferManager721Abi = loadAbi('../artifacts/contracts/transfer/TransferManagerERC721.sol/TransferManagerERC721.json')
const TransferManager1155Abi = loadAbi('../artifacts/contracts/transfer/TransferManagerERC721.sol/TransferManagerERC721.json')
const TransferManagerONFT721Abi = loadAbi('../artifacts/contracts/transfer/TransferManagerONFT721.sol/TransferManagerONFT721.json')
const TransferManagerONFT1155Abi = loadAbi('../artifacts/contracts/transfer/TransferManagerONFT1155.sol/TransferManagerONFT1155.json')
const RemoteAddrManagerAbi = loadAbi('../artifacts/contracts/core/RemoteAddrManager.sol/RemoteAddrManager.json')
const OFTMockAbi = loadAbi('../artifacts/contracts/mocks/OFTMock.sol/OFTMock.json')
const StargateFactoryAbi = loadAbi('../artifacts/contracts/stargate/Factory.sol/Factory.json')
const StargateRouterAbi = loadAbi('../artifacts/contracts/stargate/Router.sol/Router.json')
const StargateBridgeAbi = loadAbi('../artifacts/contracts/stargate/Bridge.sol/Bridge.json')
const LRTokenMockAbi = loadAbi('../artifacts/contracts/mocks/LRTokenMock.sol/LRTokenMock.json')

export const prepareOmniX = async () => {
  // @ts-ignore
  // eslint-disable-next-line
  const _hre = hre
  const { ethers, network } = _hre
  const [owner] = await ethers.getSigners()

  const currencyManager = createContractByName(_hre, 'CurrencyManager', CurrencyManagerAbi().abi, owner)
  const executionManager = createContractByName(_hre, 'ExecutionManager', ExecutionManagerAbi().abi, owner)
  const transferSelector = createContractByName(_hre, 'TransferSelectorNFT', TransferSelectorNFTAbi().abi, owner)

  await currencyManager.addCurrency(getContractAddrByName(network.name, 'OFTMock'))
  await executionManager.addStrategy(getContractAddrByName(network.name, 'StrategyStandardSale'))
  // await transferSelector.addCollectionTransferManager(getContractAddrByName(network.name, 'ghosts'), getContractAddrByName(network.name, 'TransferManagerGhosts'))
}

export const linkOmniX = async (taskArgs: any) => {
  // @ts-ignore
  // eslint-disable-next-line
  const _hre = hre
  const { ethers, network } = _hre
  const [owner, , deployer] = await ethers.getSigners()

  const { dstchainname: dstNetwork } = taskArgs
  const dstChainId = getChainId(dstNetwork)

  // const transferManagerGhosts = createContractByName(_hre, 'TransferManagerGhosts', TransferManagerGhostsAbi().abi, deployer)
  // await transferManagerGhosts.setTrustedRemote(dstChainId, getContractAddrByName(dstNetwork, 'TransferManagerGhosts'))
  const transferManager721 = createContractByName(_hre, 'TransferManagerERC721', TransferManager721Abi().abi, owner)
  await transferManager721.setTrustedRemote(dstChainId, getContractAddrByName(dstNetwork, 'TransferManagerERC721'))
  const transferManager1155 = createContractByName(_hre, 'TransferManagerERC1155', TransferManager1155Abi().abi, owner)
  await transferManager1155.setTrustedRemote(dstChainId, getContractAddrByName(dstNetwork, 'TransferManagerERC1155'))
  const transferManagerONFT721 = createContractByName(_hre, 'TransferManagerONFT721', TransferManagerONFT721Abi().abi, owner)
  await transferManagerONFT721.setTrustedRemote(dstChainId, getContractAddrByName(dstNetwork, 'TransferManagerONFT721'))
  const transferManagerONFT1155 = createContractByName(_hre, 'TransferManagerONFT1155', TransferManagerONFT1155Abi().abi, owner)
  await transferManagerONFT1155.setTrustedRemote(dstChainId, getContractAddrByName(dstNetwork, 'TransferManagerONFT1155'))

  const omni = createContractByName(_hre, 'OFTMock', OFTMockAbi().abi, owner)
  await omni.setTrustedRemote(dstChainId, getContractAddrByName(dstNetwork, 'OFTMock'))

  const omniXExchange = createContractByName(_hre, 'OmniXExchange', OFTMockAbi().abi, owner)
  await omniXExchange.setTrustedRemote(dstChainId, getContractAddrByName(dstNetwork, 'OmniXExchange'))

  const remoteAddrManager = createContractByName(_hre, 'RemoteAddrManager', RemoteAddrManagerAbi().abi, owner)
  await remoteAddrManager.addRemoteAddress(getContractAddrByName(dstNetwork, 'OFTMock'), dstChainId, getContractAddrByName(network.name, 'OFTMock'))
  // await remoteAddrManager.addRemoteAddress(getContractAddrByName(dstNetwork, 'ghosts'), dstChainId, getContractAddrByName(network.name, 'ghosts'))
  await remoteAddrManager.addRemoteAddress(getContractAddrByName(dstNetwork, 'StrategyStandardSale'), dstChainId, getContractAddrByName(network.name, 'StrategyStandardSale'))
}

export const prepareStargate = async () => {
  // @ts-ignore
  // eslint-disable-next-line
  const _hre = hre
  const { ethers, network } = _hre
  const [owner] = await ethers.getSigners()

  const stargateEndpoint = (STARGATE as any)[network.name]
  const isTest = stargateEndpoint.isTest

  if (isTest) {
    const factory = createContractByName(_hre, 'Factory', StargateFactoryAbi().abi, owner)
    const router = createContractByName(_hre, 'Router', StargateRouterAbi().abi, owner)

    await router.setBridgeAndFactory(getContractAddrByName(network.name, 'Bridge'), getContractAddrByName(network.name, 'Factory'))
    await factory.setDefaultFeeLibrary(getContractAddrByName(network.name, 'StargateFeeLibraryMock'))
    await waitFor(TRANSACTION_CONFIRM_DELAY)

    // create pool
    await router.createPool(
      getPoolId(network.name),
      getContractAddrByName(network.name, 'LRTokenMock'),
      18,
      18,
      'pool',
      'SSS'
    )
  }
}

export const setupBridge = async (taskArgs: any) => {
  // @ts-ignore
  // eslint-disable-next-line
  const _hre = hre
  const { ethers, network } = _hre
  const [owner] = await ethers.getSigners()

  const { dstchainname: dstNetwork } = taskArgs

  const stargateEndpoint = (STARGATE as any)[network.name]
  const isTest = stargateEndpoint.isTest

  if (isTest) {
    const dstChainId = getChainId(dstNetwork)
    const srcPoolId = getPoolId(network.name)
    const dstPoolId = getPoolId(dstNetwork)

    {
      const bridge = createContractByName(_hre, 'Bridge', StargateBridgeAbi().abi, owner)
      await bridge.setBridge(dstChainId, getContractAddrByName(dstNetwork, 'Bridge'))
      await bridge.setGasAmount(dstChainId, 1, 200000)
      await bridge.setGasAmount(dstChainId, 2, 200000)
      await bridge.setGasAmount(dstChainId, 3, 200000)
      await bridge.setGasAmount(dstChainId, 4, 200000)

      await waitFor(TRANSACTION_CONFIRM_DELAY)
    }

    {
      const router = createContractByName(_hre, 'Router', StargateRouterAbi().abi, owner)

      await router.createChainPath(srcPoolId, dstChainId, dstPoolId, 1)
      await waitFor(TRANSACTION_CONFIRM_DELAY)

      await router.activateChainPath(srcPoolId, dstChainId, dstPoolId)
      await waitFor(TRANSACTION_CONFIRM_DELAY)

      const erc20 = createContractByName(_hre, 'LRTokenMock', LRTokenMockAbi().abi, owner)
      await erc20.mint(owner.address, toWei(ethers, 100))
      await erc20.connect(owner).approve(router.address, toWei(ethers, 100))
      await waitFor(TRANSACTION_CONFIRM_DELAY)

      await router.connect(owner).addLiquidity(srcPoolId, toWei(ethers, 100), owner.address)
      await waitFor(TRANSACTION_CONFIRM_DELAY)

      await router.sendCredits(dstChainId, srcPoolId, dstPoolId, owner.address, { value: toWei(ethers, 0.3) })
    }
  }
}

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'fantom'],
  // testnet: ['rinkeby', 'bsc-testnet', 'fuji', 'mumbai', 'arbitrum-rinkeby', 'fantom-testnet']
  testnet: ['rinkeby', 'bsc-testnet', 'fuji', 'mumbai']
}

export const prepareOmnixAll = async function (taskArgs: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }

  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat prepareOmniX --network ${network}`
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

export const linkOmnixAll = async function (taskArgs: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }

  for (const network of networks) {
    await Promise.all(
      networks.map(async (dst: string) => {
        if (network != dst) {
          const checkWireUpCommand = `npx hardhat linkOmniX --network ${network} --dstchainname ${dst}`
          console.log(checkWireUpCommand)
          shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
        }
      })
    )
  }
}
