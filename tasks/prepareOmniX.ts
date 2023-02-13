import {
  createContract,
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

const CurrencyManagerAbi = loadAbi('../artifacts/contracts/core/CurrencyManager.sol/CurrencyManager.json')
const ExecutionManagerAbi = loadAbi('../artifacts/contracts/core/ExecutionManager.sol/ExecutionManager.json')
const TransferSelectorNFTAbi = loadAbi('../artifacts/contracts/core/TransferSelectorNFT.sol/TransferSelectorNFT.json')
const TransferManager721Abi = loadAbi('../artifacts/contracts/transfer/TransferManagerERC721.sol/TransferManagerERC721.json')
const TransferManager1155Abi = loadAbi('../artifacts/contracts/transfer/TransferManagerERC721.sol/TransferManagerERC721.json')
const TransferManagerONFT721Abi = loadAbi('../artifacts/contracts/transfer/TransferManagerONFT721.sol/TransferManagerONFT721.json')
const TransferManagerONFT1155Abi = loadAbi('../artifacts/contracts/transfer/TransferManagerONFT1155.sol/TransferManagerONFT1155.json')
const OFTMockAbi = loadAbi('../artifacts/contracts/mocks/OFTMock.sol/OFTMock.json')
const StargatePoolManagerAbi = loadAbi('../artifacts/contracts/core/StargatePoolManager.sol/StargatePoolManager.json')
const OmniXExchangeAbi = loadAbi('../artifacts/contracts/core/OmniXExchange.sol/OmniXExchange.json')
const TransferManagerGhostsAbi = loadAbi('../artifacts/contracts/transfer/TransferManagerGhosts.sol/TransferManagerGhosts.json')
const StargateFactoryAbi = loadAbi('../artifacts/contracts/stargate/Factory.sol/Factory.json')
const StargateRouterAbi = loadAbi('../artifacts/contracts/stargate/Router.sol/Router.json')
const StargateBridgeAbi = loadAbi('../artifacts/contracts/stargate/Bridge.sol/Bridge.json')
const LRTokenMockAbi = loadAbi('../artifacts/contracts/mocks/LRTokenMock.sol/LRTokenMock.json')
const FundManagerAbi = loadAbi('../artifacts/contracts/core/FundManager.sol/FundManager.json')

const tx = async (tx1: any) => {
  await tx1.wait()
}

export const prepareOmniX = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()

  // const currencyManager = createContractByName(hre, 'CurrencyManager', CurrencyManagerAbi().abi, owner)
  // const executionManager = createContractByName(hre, 'ExecutionManager', ExecutionManagerAbi().abi, owner)

  // // await tx(await currencyManager.addCurrency(getContractAddrByName(network.name, 'OFTMock')))
  // // await tx(await currencyManager.addCurrency(getContractAddrByName(network.name, 'USDC')))
  // if (getContractAddrByName(network.name, 'SGETH')) {
  //   await tx(await currencyManager.addCurrency(getContractAddrByName(network.name, 'SGETH')))
  // }
  // // await tx(await executionManager.addStrategy(getContractAddrByName(network.name, 'StrategyStargateSale')))
  // // await tx(await executionManager.addStrategy(getContractAddrByName(network.name, 'StrategyStargateSaleForCollection')))

  const omniXExchange = createContractByName(hre, 'OmniXExchange', OmniXExchangeAbi().abi, owner)
  await tx(await omniXExchange.setGasForOmniLZReceive(700000, 500000))
}

const packTrustedRemote = (hre: any, srcNetwork: string, dstNetwork: string, contractName: string) => {
  const dstAddr = getContractAddrByName(dstNetwork, contractName)
  const srcAddr = getContractAddrByName(srcNetwork, contractName)
  const trustedRemote = hre.ethers.utils.solidityPack(['address', 'address'], [dstAddr, srcAddr])
  return trustedRemote
}

export const linkOmniX = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()

  const { dstchainname: dstNetwork } = taskArgs
  const srcNetwork = network.name
  const dstChainId = getChainId(dstNetwork)
  const scrChainId = getChainId(srcNetwork)

  // const transferManager721 = createContractByName(hre, 'TransferManagerERC721', TransferManager721Abi().abi, owner)
  // await tx(await transferManager721.setTrustedRemote(dstChainId, packTrustedRemote(hre, srcNetwork, dstNetwork, 'TransferManagerERC721')))
  // const transferManager1155 = createContractByName(hre, 'TransferManagerERC1155', TransferManager1155Abi().abi, owner)
  // await tx(await transferManager1155.setTrustedRemote(dstChainId, packTrustedRemote(hre, srcNetwork, dstNetwork, 'TransferManagerERC1155')))
  // const transferManagerONFT721 = createContractByName(hre, 'TransferManagerONFT721', TransferManagerONFT721Abi().abi, owner)
  // await tx(await transferManagerONFT721.setTrustedRemote(dstChainId, packTrustedRemote(hre, srcNetwork, dstNetwork, 'TransferManagerONFT721')))
  // const transferManagerONFT1155 = createContractByName(hre, 'TransferManagerONFT1155', TransferManagerONFT1155Abi().abi, owner)
  // await tx(await transferManagerONFT1155.setTrustedRemote(dstChainId, packTrustedRemote(hre, srcNetwork, dstNetwork, 'TransferManagerONFT1155')))

  // const omni = createContractByName(hre, 'OFTMock', OFTMockAbi().abi, owner)
  // await tx(await omni.setTrustedRemote(dstChainId, packTrustedRemote(hre, srcNetwork, dstNetwork, 'OFTMock')))

  const omniXExchange = createContractByName(hre, 'OmniXExchange', OmniXExchangeAbi().abi, owner)
  await tx(await omniXExchange.setTrustedRemote(dstChainId, packTrustedRemote(hre, srcNetwork, dstNetwork, 'OmniXExchange')))

  // const stargatePoolManager = createContractByName(hre, 'StargatePoolManager', StargatePoolManagerAbi().abi, owner)
  // if (getContractAddrByName(srcNetwork, 'SGETH') && getContractAddrByName(dstNetwork, 'SGETH')) {
  //   await (await stargatePoolManager.setPoolId(getContractAddrByName(srcNetwork, 'SGETH'), dstChainId, 13, 13)).wait()
  // }
  // await (await stargatePoolManager.setPoolId(getContractAddrByName(srcNetwork, 'USDC'), dstChainId, getPoolId(srcNetwork), getPoolId(dstNetwork))).wait()

  const fundManager = createContractByName(hre, 'FundManager', FundManagerAbi().abi, owner)
  await tx(await fundManager.setTrustedRemoteAddress(dstChainId, getContractAddrByName(dstNetwork, 'FundManager')))
}

export const prepareStargate = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()

  const currencyManager = createContractByName(hre, 'CurrencyManager', CurrencyManagerAbi().abi, owner)
  await currencyManager.addCurrency(getContractAddrByName(network.name, 'USDC'))
}

export const setupBridge = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()

  const { dstchainname: dstNetwork } = taskArgs

  const dstChainId = getChainId(dstNetwork)
  const srcPoolId = getPoolId(network.name)
  const dstPoolId = getPoolId(dstNetwork)

  const stargateEndpoint = (STARGATE as any)[network.name]
  const isTest = stargateEndpoint.isTest

  if (isTest) {
    const router = createContract(ethers, stargateEndpoint.router, StargateRouterAbi().abi, owner)

    const erc20 = createContractByName(hre, 'USDC', LRTokenMockAbi().abi, owner)
    await (await erc20.mint(owner.address, toWei(ethers, 100000000000))).wait()
    await (await erc20.connect(owner).approve(router.address, toWei(ethers, 100000000000))).wait()

    console.log('--1--', router.address, erc20.address, srcPoolId, dstPoolId, network.name, dstNetwork)
    await (await router.connect(owner).addLiquidity(srcPoolId, toWei(ethers, 100000000000), owner.address)).wait()
    let quoteData = await router.quoteLayerZeroFee(
      dstChainId,                 // destination chainId
      2,                          // function type: see Bridge.sol for all types
      owner.address,              // destination of tokens
      "0x",                         // payload, using abi.encode()
      ({
          dstGasForCall: 0,       // extra gas, if calling smart contract,
          dstNativeAmount: 0,     // amount of dust dropped in destination wallet 
          dstNativeAddr: "0x" // destination wallet for dust
      })
    )
    let credits = quoteData[0] // toWei(ethers, '0.1')
    if (credits.lt(quoteData[0])) {
      credits = quoteData[0]
    }
    console.log('--2--', ethers.utils.formatEther(quoteData[0]))
    await (await router.callDelta(srcPoolId, true)).wait()
    await (await router.sendCredits(dstChainId, srcPoolId, dstPoolId, owner.address, { value: credits })).wait()
    console.log('--3--')
  }

  const stargatePoolManager = createContractByName(hre, 'StargatePoolManager', StargatePoolManagerAbi().abi, owner)
  await stargatePoolManager.setPoolId(getContractAddrByName(network.name, 'USDC'), dstChainId, srcPoolId, dstPoolId)
}

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'fantom'],
  // testnet: ['bsc-testnet', 'fuji', 'mumbai', 'goerli', 'arbitrum-goerli', 'optimism-goerli']
  testnet: ['bsc-testnet', 'fuji', 'mumbai', 'goerli', 'arbitrum-goerli', 'optimism-goerli']
}

export const prepareOmnixAll = async function (taskArgs: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }

  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat prepareOmniX --network ${network}`
      console.log(checkWireUpCommand)
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
          {
            const checkWireUpCommand = `npx hardhat linkOmniX --network ${dst} --dstchainname ${network}`
            console.log(checkWireUpCommand)
            shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
          }
        }
      })
    )
  }
}