import {
  STRATEGY_PROTOCAL_FEE,
  ROYALTY_FEE_LIMIT,
  deployContract,
  toWei,
  getContractAddrByName
} from './shared'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import STARGATE from '../constants/stargate.json'
import shell from 'shelljs'

export const deployOmniX = async () => {
  // @ts-ignore
  // eslint-disable-next-line
  const _hre = hre
  const { ethers, network } = _hre
  const [owner, , deployer] = await ethers.getSigners()
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
  const stargateEndpoint = (STARGATE as any)[network.name]

  // await deployContract(_hre, 'StrategyStandardSale', owner, [STRATEGY_PROTOCAL_FEE])

  // const currencyManager = await deployContract(_hre, 'CurrencyManager', owner, [])
  // const executionManager = await deployContract(_hre, 'ExecutionManager', owner, [])
  const royaltyFeeRegistry = await deployContract(_hre, 'RoyaltyFeeRegistry', owner, [ROYALTY_FEE_LIMIT])
  const royaltyFeeManager = await deployContract(_hre, 'RoyaltyFeeManager', owner, [royaltyFeeRegistry.address])
  // const omniXExchange = await deployContract(_hre, 'OmniXExchange', owner, [
  //   currencyManager.address,
  //   executionManager.address,
  //   royaltyFeeManager.address,
  //   ethers.constants.AddressZero,
  //   owner.address,
  //   lzEndpoint
  // ])

  // const transferManager721 = await deployContract(_hre, 'TransferManagerERC721', owner, [omniXExchange.address, lzEndpoint])
  // const transferManager1155 = await deployContract(_hre, 'TransferManagerERC1155', owner, [omniXExchange.address, lzEndpoint])
  // const transferSelector = await deployContract(_hre, 'TransferSelectorNFT', owner, [transferManager721.address, transferManager1155.address])
  // const remoteAddrManager = await deployContract(_hre, 'RemoteAddrManager', owner, [])
  // await deployContract(_hre, 'TransferManagerONFT721', owner, [omniXExchange.address, lzEndpoint])
  // await deployContract(_hre, 'TransferManagerONFT1155', owner, [omniXExchange.address, lzEndpoint])
  // // await deployContract(_hre, 'TransferManagerGhosts', deployer, [omniXExchange.address, lzEndpoint])

  // await deployContract(_hre, 'OFTMock', owner, ['OMNI', 'OMNI', toWei(ethers, 1000), lzEndpoint])

  // await omniXExchange.updateTransferSelectorNFT(transferSelector.address)
  // await omniXExchange.setRemoteAddrManager(remoteAddrManager.address)

  // // deploy stargate
  // let stargateRouter = stargateEndpoint.router
  // // const isTest = stargateEndpoint.isTest
  // // if (isTest) {
  // //   const stargateRouterContract = await deployContract(_hre, 'Router', owner, [])
  // //   stargateRouter = stargateRouterContract.address

  // //   await deployContract(_hre, 'Bridge', owner, [lzEndpoint, stargateRouter])
  // //   await deployContract(_hre, 'StargateFeeLibraryMock', owner, [])
  // //   await deployContract(_hre, 'Factory', owner, [stargateRouter])

  // //   await deployContract(_hre, 'LRTokenMock', owner, [])
  // // }

  // const poolManager = await deployContract(_hre, 'StargatePoolManager', owner, [stargateRouter])
  // await omniXExchange.setStargatePoolManager(poolManager.address)

  // const fundManager = await deployContract(_hre, 'FundManager', owner, [omniXExchange.address])
  // await omniXExchange.setFundManager(fundManager.address)
}

export const deployGhosts = async () => {
  // @ts-ignore
  // eslint-disable-next-line
  const _hre = hre
  const { ethers, network } = _hre
  const [, , deployer] = await ethers.getSigners()
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]

  await deployContract(_hre, 'TransferManagerGhosts', deployer, [getContractAddrByName(network.name, 'OmniXExchange'), lzEndpoint])
}

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'fantom'],
  // testnet: ['rinkeby', 'bsc-testnet', 'fuji', 'mumbai', 'arbitrum-rinkeby', 'fantom-testnet'],
  testnet: ['fuji', 'mumbai']
}

export const deployOmnixAll = async function (taskArgs: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }

  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat deployOmniX --network ${network}`
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

