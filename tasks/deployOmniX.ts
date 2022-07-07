import {
  STRATEGY_PROTOCAL_FEE,
  ROYALTY_FEE_LIMIT,
  deployContract,
  toWei
} from './shared'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import STARGATE from '../constants/stargate.json'
import { OmniXExchange } from '../typechain-types'

export const deployOmniX = async () => {
  // @ts-ignore
  // eslint-disable-next-line
  const _hre = hre
  const { ethers, network } = _hre
  const [owner, , , deployer] = await ethers.getSigners()
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
  const stargateEndpoint = (STARGATE as any)[network.name]

  await deployContract(_hre, 'StrategyStandardSale', owner, [STRATEGY_PROTOCAL_FEE])

  const currencyManager = await deployContract(_hre, 'CurrencyManager', owner, [])
  const executionManager = await deployContract(_hre, 'ExecutionManager', owner, [])
  const royaltyFeeRegistry = await deployContract(_hre, 'RoyaltyFeeRegistry', owner, [ROYALTY_FEE_LIMIT])
  const royaltyFeeManager = await deployContract(_hre, 'RoyaltyFeeManager', owner, [royaltyFeeRegistry.address])
  const omniXExchange = await deployContract(_hre, 'OmniXExchange', owner, [
    currencyManager.address,
    executionManager.address,
    royaltyFeeManager.address,
    ethers.constants.AddressZero,
    owner.address
  ]) as OmniXExchange

  const transferManager721 = await deployContract(_hre, 'TransferManagerERC721', owner, [omniXExchange.address, lzEndpoint])
  const transferManager1155 = await deployContract(_hre, 'TransferManagerERC1155', owner, [omniXExchange.address, lzEndpoint])
  const transferSelector = await deployContract(_hre, 'TransferSelectorNFT', owner, [transferManager721.address, transferManager1155.address])
  const remoteAddrManager = await deployContract(_hre, 'RemoteAddrManager', owner, [])
  await deployContract(_hre, 'TransferManagerONFT721', owner, [omniXExchange.address, lzEndpoint])
  await deployContract(_hre, 'TransferManagerONFT1155', owner, [omniXExchange.address, lzEndpoint])
  await deployContract(_hre, 'TransferManagerGhosts', deployer, [omniXExchange.address, lzEndpoint])

  await deployContract(_hre, 'OFTMock', owner, ['OMNI', 'OMNI', toWei(ethers, 1000), lzEndpoint])

  await omniXExchange.updateTransferSelectorNFT(transferSelector.address)
  await omniXExchange.setRemoteAddrManager(remoteAddrManager.address)

  // deploy stargate
  let stargateRouter = stargateEndpoint.router
  const isTest = stargateEndpoint.isTest
  if (isTest) {
    const stargateRouterContract = await deployContract(_hre, 'Router', owner, [])
    stargateRouter = stargateRouterContract.address

    await deployContract(_hre, 'Bridge', owner, [lzEndpoint, stargateRouter])
    await deployContract(_hre, 'StargateFeeLibraryMock', owner, [])
    await deployContract(_hre, 'Factory', owner, [stargateRouter])

    await deployContract(_hre, 'LRTokenMock', owner, [])
  }

  const poolManager = await deployContract(_hre, 'StargatePoolManager', owner, [stargateRouter])
  await omniXExchange.setStargatePoolManager(poolManager.address)
}
