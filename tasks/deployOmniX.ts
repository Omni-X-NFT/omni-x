import {
  STRATEGY_PROTOCAL_FEE,
  ROYALTY_FEE_LIMIT,
  deployContract,
  toWei,
  getContractAddrByName,
  STRATEGY_PROTOCAL_STABLE_FEE
} from './shared'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import STARGATE from '../constants/stargate.json'
import shell from 'shelljs'

export const deployOmniX = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
  const stargateEndpoint = (STARGATE as any)[network.name]

  await deployContract(hre, 'StrategyStandardSale', owner, [STRATEGY_PROTOCAL_FEE])
  await deployContract(hre, 'StrategyStargateSale', owner, [STRATEGY_PROTOCAL_STABLE_FEE])

  const currencyManager = await deployContract(hre, 'CurrencyManager', owner, [])
  const executionManager = await deployContract(hre, 'ExecutionManager', owner, [])
  const royaltyFeeRegistry = await deployContract(hre, 'RoyaltyFeeRegistry', owner, [ROYALTY_FEE_LIMIT])
  const royaltyFeeManager = await deployContract(hre, 'RoyaltyFeeManager', owner, [royaltyFeeRegistry.address])
  const omniXExchange = await deployContract(hre, 'OmniXExchange', owner, [
    currencyManager.address,
    executionManager.address,
    royaltyFeeManager.address,
    ethers.constants.AddressZero,
    owner.address,
    lzEndpoint
  ])

  const transferManager721 = await deployContract(hre, 'TransferManagerERC721', owner, [omniXExchange.address, lzEndpoint])
  const transferManager1155 = await deployContract(hre, 'TransferManagerERC1155', owner, [omniXExchange.address, lzEndpoint])
  const transferSelector = await deployContract(hre, 'TransferSelectorNFT', owner, [transferManager721.address, transferManager1155.address])
  await deployContract(hre, 'TransferManagerONFT721', owner, [omniXExchange.address, lzEndpoint])
  await deployContract(hre, 'TransferManagerONFT1155', owner, [omniXExchange.address, lzEndpoint])

  await deployContract(hre, 'OFTMock', owner, ['OMNI', 'OMNI', toWei(ethers, 1000), lzEndpoint])

  await omniXExchange.updateTransferSelectorNFT(transferSelector.address)

  const fundManager = await deployContract(hre, 'FundManager', owner, [omniXExchange.address])
  await omniXExchange.setFundManager(fundManager.address)

  // deploy stargate
  let stargateRouter = stargateEndpoint?.router

  if (stargateRouter) {
    const poolManager = await deployContract(hre, 'StargatePoolManager', owner, [stargateRouter])
    await omniXExchange.setStargatePoolManager(poolManager.address)
  }
}

export const deployGhosts = async (taskArgs: any, hre: any) => {
  // @ts-ignore
  // eslint-disable-next-line
  const { ethers, network } = hre
  const [, , deployer] = await ethers.getSigners()
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]

  await deployContract(hre, 'TransferManagerGhosts', deployer, [getContractAddrByName(network.name, 'OmniXExchange'), lzEndpoint])
}

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'fantom'],
  // testnet: ['rinkeby', 'bsc-testnet', 'fuji', 'mumbai', 'arbitrum-rinkeby', 'fantom-testnet'],
  testnet: ['goerli', 'optimism-goerli']
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
