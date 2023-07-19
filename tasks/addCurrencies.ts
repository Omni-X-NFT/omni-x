import {
  createContractByName,
  loadAbi,
  environments
} from './shared'


import shell from 'shelljs'

import tokenDependencies from '../constants/crossChainTokens.json'
const tx = async (tx1: any) => {
  await tx1.wait()
}
const CurrencyManagerAbi = loadAbi('../artifacts/contracts/core/CurrencyManager.sol/CurrencyManager.json')
const StargatePoolManagerAbi = loadAbi('../artifacts/contracts/core/StargatePoolManager.sol/StargatePoolManager.json')


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
    // if (network.name === 'optimism-goerli') {
    //   await tx(await currencyManager.addCurrency(dependencies.address, dependencies.lzChainIds, dependencies.complimentTokens, {gasPrice: 30000}))
    // } else {
    //   await tx(await currencyManager.addCurrency(dependencies.address, dependencies.lzChainIds, dependencies.complimentTokens))
    // }
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


export const removeCurrency = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const token = taskArgs.token
  const currencyManager = createContractByName(hre, 'CurrencyManager', CurrencyManagerAbi().abi, owner)

  try {
    await tx(await currencyManager.removeCurrency(token))
  } catch (e) {
    console.log(e)
  }

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