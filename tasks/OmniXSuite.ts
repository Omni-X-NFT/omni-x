import {
  deployContract,
  getContractAddrByName,
  createContractByName,
  loadAbi,
  stargateCompatibleChains,
  environments
} from './shared'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import STARGATE from '../constants/stargate.json'
import shell from 'shelljs'

const FundManagerAbi = loadAbi('../artifacts/contracts/core/FundManager.sol/FundManager.json')

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

