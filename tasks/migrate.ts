import { createContractByName, getContractAddrByName, loadAbi } from './shared'

export const migrate = async (args: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()

  const CurrencyManagerAbi = loadAbi('../artifacts/contracts/core/CurrencyManager.sol/CurrencyManager.json')
  const ExecutionManagerAbi = loadAbi('../artifacts/contracts/core/ExecutionManager.sol/ExecutionManager.json')

  createContractByName(hre, 'CurrencyManager', CurrencyManagerAbi().abi, owner)
  const executionManager = createContractByName(hre, 'ExecutionManager', ExecutionManagerAbi().abi, owner)

  console.log('StrategyStargateSale: ', await executionManager.isStrategyWhitelisted(getContractAddrByName(network.name, 'StrategyStargateSale')))
  console.log('StrategyStargateSaleForCollection', await executionManager.isStrategyWhitelisted(getContractAddrByName(network.name, 'StrategyStargateSaleForCollection')))
}
