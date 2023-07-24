import {
  deployContract,
  getContractAddrByName,
  createContractByName,
  loadAbi,
  stargateCompatibleChains,
  environments,
  getChainId,
  getPoolId,
  createContract,
  toWei

} from './shared'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import STARGATE from '../constants/stargate.json'
import shell from 'shelljs'
import tokenDependencies from '../constants/crossChainTokens.json'

const tx = async (tx1: any) => {
  await tx1.wait()
}

const FundManagerAbi = loadAbi('../artifacts/contracts/core/FundManager.sol/FundManager.json')
const CurrencyManagerAbi = loadAbi('../artifacts/contracts/core/CurrencyManager.sol/CurrencyManager.json')
const StargatePoolManagerAbi = loadAbi('../artifacts/contracts/core/StargatePoolManager.sol/StargatePoolManager.json')
const StargateRouterAbi = loadAbi('../artifacts/contracts/stargate/Router.sol/Router.json')
const LRTokenMockAbi = loadAbi('../artifacts/contracts/mocks/LRTokenMock.sol/LRTokenMock.json')

export const deployOmniX = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
  const stargateEndpoint = (STARGATE as any)[network.name]

  let _currencyManager: any
  let _executionManager: any
  let _royaltyFeeManager: any
  let _transferManager721: any
  let _transferManager1155: any
  let _transferSelector: any
  let _stargatePoolManager: any
  let _fundManager: any
  let _strategyStargateSale: any
  let _strategyStargateSaleForCollection: any
  let _omniXExchange: any

  if (taskArgs.dependencies === 'true') {
    _currencyManager = await deployContract(hre, 'CurrencyManager', owner, [])
    console.log('deployed currency manager to ', _currencyManager.address)
    _executionManager = await deployContract(hre, 'ExecutionManager', owner, [])
    console.log('deployed execution manager to ', _executionManager.address)
    _royaltyFeeManager = await deployContract(hre, 'RoyaltyFeeManager', owner, [])
    console.log('deployed royalty fee manager to ', _royaltyFeeManager.address)

    _transferManager721 = await deployContract(hre, 'TransferManagerERC721', owner, [])
    console.log('deployed transfer manager 721 to ', _transferManager721.address)
    _transferManager1155 = await deployContract(hre, 'TransferManagerERC1155', owner, [])
    console.log('deployed transfer manager 1155 to ', _transferManager1155.address)
    _transferSelector = await deployContract(hre, 'TransferSelectorNFT', owner, [_transferManager721.address, _transferManager1155.address])
    console.log('deployed transfer selector to ', _transferSelector.address)
    const stargateRouter = stargateEndpoint?.router
    if (stargateRouter) {
      _stargatePoolManager = await deployContract(hre, 'StargatePoolManager', owner, [stargateRouter, getContractAddrByName(network.name, 'SGETH') || ethers.constants.AddressZero])
      console.log('deployed stargate pool manager to ', _stargatePoolManager.address)
    } else {
      console.log('stargate not available on this chain')
    }

    _omniXExchange = await deployContract(hre, 'OmniXExchange', owner, [
      _currencyManager.address,
      _executionManager.address,
      _royaltyFeeManager.address,
      getContractAddrByName(network.name, 'SGETH') || ethers.constants.AddressZero,
      owner.address,
      lzEndpoint
    ])

    _fundManager = await deployContract(hre, 'FundManager', owner, [_omniXExchange.address])
    console.log('deployed fund manager to ', _fundManager.address)

    await (await _fundManager.setOmnixExchange(_omniXExchange.address)).wait()

    await (await _omniXExchange.setFundManager(_fundManager.address)).wait()

    if (_stargatePoolManager) {
      await (await _omniXExchange.setStargatePoolManager(_stargatePoolManager.address)).wait()
    }

    await (await _omniXExchange.updateTransferSelectorNFT(_transferSelector.address)).wait()

    _strategyStargateSale = await deployContract(hre, 'StrategyStargateSale', owner, [])
    console.log('deployed strategy stargate sale to ', _strategyStargateSale.address)
    _strategyStargateSaleForCollection = await deployContract(hre, 'StrategyStargateSaleForCollection', owner, [])
    console.log('deployed strategy stargate sale for collection to ', _strategyStargateSaleForCollection.address)

    await (await _executionManager.addStrategy(_strategyStargateSale.address)).wait()
    await (await _executionManager.addStrategy(_strategyStargateSaleForCollection.address)).wait()

    console.log('deployed OmniXExchange to ', _omniXExchange.address)
  } else {
    _currencyManager = getContractAddrByName(network.name, 'CurrencyManager')
    _executionManager = getContractAddrByName(network.name, 'ExecutionManager')
    _royaltyFeeManager = getContractAddrByName(network.name, 'RoyaltyFeeManager')
    _transferSelector = getContractAddrByName(network.name, 'TransferSelectorNFT')
    _omniXExchange = await deployContract(hre, 'OmniXExchange', owner, [
      _currencyManager,
      _executionManager,
      _royaltyFeeManager,
      getContractAddrByName(network.name, 'SGETH') || ethers.constants.AddressZero,
      owner.address,
      lzEndpoint
    ])
    _fundManager = getContractAddrByName(network.name, 'FundManager')
    await (await _omniXExchange.setFundManager(_fundManager)).wait()

    if (stargateCompatibleChains.mainnet.includes(network.name) || stargateCompatibleChains.testnet.includes(network.name)) {
      _stargatePoolManager = getContractAddrByName(network.name, 'StargatePoolManager')
      await (await _omniXExchange.setStargatePoolManager(_stargatePoolManager)).wait()
    }

    await (await _omniXExchange.updateTransferSelectorNFT(_transferSelector)).wait()

    _fundManager = createContractByName(hre, _fundManager, FundManagerAbi().abi, owner)
    await (await _fundManager.setOmnixExchange(_omniXExchange.address)).wait()

    console.log('deployed OmniXExchange to ', _omniXExchange.address)
  }
}

export const addSingleChainCurrency = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const token = taskArgs.token
  const networkName = network.name
  const tokensObj: any = (tokenDependencies as any)[networkName]
  const dependencies: any = tokensObj[token]
  const currencyManager = createContractByName(hre, 'CurrencyManager', CurrencyManagerAbi().abi, owner)
  const stargatePoolManager = createContractByName(hre, 'StargatePoolManager', StargatePoolManagerAbi().abi, owner)
  try {
    if (network.name === 'optimism-goerli') {
      await tx(await currencyManager.addCurrency(dependencies.address, dependencies.lzChainIds, dependencies.complimentTokens, {gasPrice: 30000}))
    } else {
      await tx(await currencyManager.addCurrency(dependencies.address, dependencies.lzChainIds, dependencies.complimentTokens))
    }
    for (let i = 0; i < dependencies.lzChainIds.length; i++) {
      if (network.name === 'optimism-goerli') {
        await tx(await stargatePoolManager.setPoolId(dependencies.address, dependencies.lzChainIds[i], dependencies.poolIds[dependencies.lzChainIds[i]][0], dependencies.poolIds[dependencies.lzChainIds[i]][1], {gasPrice: 30000}))
      } else {
        await tx(await stargatePoolManager.setPoolId(dependencies.address, dependencies.lzChainIds[i], dependencies.poolIds[dependencies.lzChainIds[i]][0], dependencies.poolIds[dependencies.lzChainIds[i]][1]))
      }
    }
  } catch (e) {
    console.log(e)
  }
}

export const removeCurrency = async (taskArgs: any, hre: any) => {
  const { ethers } = hre
  const [owner] = await ethers.getSigners()
  const token = taskArgs.token
  const currencyManager = createContractByName(hre, 'CurrencyManager', CurrencyManagerAbi().abi, owner)

  try {
    await tx(await currencyManager.removeCurrency(token))
  } catch (e) {
    console.log(e)
  }
}

export const addCurrency = async (taskArgs: any, hre: any) => {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }

  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat addSingleChainCurrency --network ${network} --token ${taskArgs.token}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

export const removeAllUSDC = async (taskArgs: any) => {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }

  await Promise.all(
    networks.map(async (network: string) => {
      const tokensObj: any = (tokenDependencies as any)[network]
      const checkWireUpCommand = `npx hardhat removeCurrency --network ${network} --token ${tokensObj.sgUSDC.address}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

export const deployOmnixAll = async function (taskArgs: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }

  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat deployOmniX --network ${network} --dependencies ${taskArgs.dependencies}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

export const omnix = async (taskArgs: any, hre: any) => {
  let checkWireUpCommand = `npx hardhat deployAllX --e ${taskArgs.e} --dependencies ${taskArgs.dependencies}`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat setAllTrustedRemote --e ${taskArgs.e} --contract OmniXExchange`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat addCurrency --e ${taskArgs.e} --token sgUSDC`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat addCurrency --e ${taskArgs.e} --token sgETH`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  for (let i = 0; i < environments[taskArgs.e].length; i++) {
    checkWireUpCommand = `npx hardhat verifyOmniX --network ${environments[taskArgs.e][i]}`
    console.log(checkWireUpCommand)
    shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  }
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
    const quoteData = await router.quoteLayerZeroFee(
      dstChainId, // destination chainId
      2, // function type: see Bridge.sol for all types
      owner.address, // destination of tokens
      '0x', // payload, using abi.encode()
      ({
        dstGasForCall: 0, // extra gas, if calling smart contract,
        dstNativeAmount: 0, // amount of dust dropped in destination wallet
        dstNativeAddr: '0x' // destination wallet for dust
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

export const deployReservoirRouter = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre

  const [owner] = await ethers.getSigners()
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]

  const router = await deployContract(hre, 'ExchangeRouter', owner, [
    lzEndpoint
  ])

  await router.setStargatePoolManager(getContractAddrByName(network.name, 'StargatePoolManager'))
}
