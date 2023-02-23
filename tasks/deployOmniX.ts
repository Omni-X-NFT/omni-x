import {
  deployContract,
  toWei,
  getContractAddrByName,
  createContractByName,
  loadAbi
} from './shared'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import STARGATE from '../constants/stargate.json'
import shell from 'shelljs'

export const deployOmniX = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
  const stargateEndpoint = (STARGATE as any)[network.name]

  // await deployContract(hre, 'StrategyStargateSale', owner, [])
  // await deployContract(hre, 'StrategyStargateSaleForCollection', owner, [])

  // const currencyManager = await deployContract(hre, 'CurrencyManager', owner, [])
  // const executionManager = await deployContract(hre, 'ExecutionManager', owner, [])
  // const royaltyFeeManager = await deployContract(hre, 'RoyaltyFeeManager', owner, [])
  // const omniXExchange = await deployContract(hre, 'OmniXExchange', owner, [
  //   currencyManager.address,
  //   executionManager.address,
  //   royaltyFeeManager.address,
  //   getContractAddrByName(network.name, 'SGETH') || ethers.constants.AddressZero,
  //   owner.address,
  //   lzEndpoint
  // ])

  // const transferManager721 = await deployContract(hre, 'TransferManagerERC721', owner, [])
  // const transferManager1155 = await deployContract(hre, 'TransferManagerERC1155', owner, [])
  // const transferSelector = await deployContract(hre, 'TransferSelectorNFT', owner, [
  //   transferManager721.address,
  //   transferManager1155.address
  // ])

  // await deployContract(hre, 'OFTMock', owner, ['OMNI', 'OMNI', toWei(ethers, 1000), lzEndpoint])

  // await (await omniXExchange.updateTransferSelectorNFT(transferSelector.address)).wait()

  // const fundManager = await deployContract(hre, 'FundManager', owner, [omniXExchange.address])
  // await (await omniXExchange.setFundManager(fundManager.address)).wait()

  // // deploy stargate
  // let stargateRouter = stargateEndpoint?.router

  // if (stargateRouter) {
  //   const poolManager = await deployContract(hre, 'StargatePoolManager', owner, [stargateRouter, getContractAddrByName(network.name, 'SGETH')])
  //   if (stargateEndpoint?.routerEth) {
  //       await (await poolManager.setStargateRouterEth(stargateEndpoint.routerEth)).wait()
  //   }

  //   await (await omniXExchange.setStargatePoolManager(poolManager.address)).wait()
  // }


  // const omniXExchange = await deployContract(hre, 'OmniXExchange', owner, [
  //   getContractAddrByName(network.name, 'CurrencyManager'),
  //   getContractAddrByName(network.name, 'ExecutionManager'),
  //   getContractAddrByName(network.name, 'RoyaltyFeeManager'),
  //   getContractAddrByName(network.name, 'SGETH') || ethers.constants.AddressZero,
  //   owner.address,
  //   lzEndpoint
  // ])

  // await (await omniXExchange.updateTransferSelectorNFT(getContractAddrByName(network.name, 'TransferSelectorNFT'))).wait()

  // const fundManager = await deployContract(hre, 'FundManager', owner, [omniXExchange.address])
  // await (await omniXExchange.setFundManager(fundManager.address)).wait()

  // // deploy stargate
  // let stargateRouter = stargateEndpoint?.router

  // if (stargateRouter) {
  //   const poolManager = await deployContract(hre, 'StargatePoolManager', owner, [stargateRouter, getContractAddrByName(network.name, 'SGETH') || ethers.constants.AddressZero])

  //   await (await omniXExchange.setStargatePoolManager(poolManager.address)).wait()
  // }

  // const OmniXExchangeAbi = loadAbi('../artifacts/contracts/core/OmniXExchange.sol/OmniXExchange.json')
  // const omniXExchange = createContractByName(hre, 'OmniXExchange', OmniXExchangeAbi().abi, owner)
  // const fundManager = await deployContract(hre, 'FundManager', owner, [omniXExchange.address])
  // await (await omniXExchange.setFundManager(fundManager.address)).wait()

  const omniXExchange = await deployContract(hre, 'OmniXExchange', owner, [
    getContractAddrByName(network.name, 'CurrencyManager'),
    getContractAddrByName(network.name, 'ExecutionManager'),
    getContractAddrByName(network.name, 'RoyaltyFeeManager'),
    getContractAddrByName(network.name, 'SGETH') || ethers.constants.AddressZero,
    owner.address,
    lzEndpoint
  ])

  await (await omniXExchange.updateTransferSelectorNFT(getContractAddrByName(network.name, 'TransferSelectorNFT'))).wait()
  await (await omniXExchange.setFundManager(getContractAddrByName(network.name, 'FundManager'))).wait()
  await (await omniXExchange.setStargatePoolManager(getContractAddrByName(network.name, 'StargatePoolManager'))).wait()
}

export const deployGhosts = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [, , deployer] = await ethers.getSigners()
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]

  await deployContract(hre, 'TransferManagerGhosts', deployer, [getContractAddrByName(network.name, 'OmniXExchange'), lzEndpoint])
}

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'fantom'],
  // testnet: ['fuji', 'mumbai', 'bsc-testnet', 'goerli', 'arbitrum-goerli', 'optimism-goerli']
  testnet: ['mumbai', 'bsc-testnet', 'fuji', 'goerli', 'arbitrum-goerli', 'optimism-goerli']
}

export const deployOmnixAll = async function (taskArgs: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }

  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat deployOmniX --network ${network}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}
