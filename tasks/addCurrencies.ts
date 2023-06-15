import {
  createContractByName,
  loadAbi
} from './shared'

import shell from 'shelljs'

import tokenDependencies from '../constants/crossChainTokens.json'
const tx = async (tx1: any) => {
  await tx1.wait()
}
const CurrencyManagerAbi = loadAbi('../artifacts/contracts/core/CurrencyManager.sol/CurrencyManager.json')
const StargatePoolManagerAbi = loadAbi('../artifacts/contracts/core/StargatePoolManager.sol/StargatePoolManager.json')
const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom'],
  testnet: ['arbitrum-goerli', 'goerli', 'optimism-goerli', 'mumbai', 'bsc-testnet', 'fuji', 'fantom-testnet']
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
    await tx(await currencyManager.addCurrency(dependencies.address, dependencies.lzChainIds, dependencies.complimentTokens))
    for (let i = 0; i < dependencies.lzChainIds.length; i++) {
      await tx(await stargatePoolManager.setPoolId(dependencies.address, dependencies.lzChainIds[i], dependencies.poolIds[dependencies.lzChainIds[i]][0], dependencies.poolIds[dependencies.lzChainIds[i]][1]))
    }
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