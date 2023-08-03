import shell from 'shelljs'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import ONFT_ARGS from '../constants/ONFT721Args.json'
import * as CHAIN_ID from '../constants/chainIds.json'
import { loadAbi, createContractByName, deployContract, environments, submitTx } from './shared'

type CHAINIDTYPE = {
    [key: string]: number
}

const CHAIN_IDS: CHAINIDTYPE = CHAIN_ID

const AdvancedONFT721Abi = loadAbi('../artifacts/contracts/token/onft/extension/CC2/CC2AccessPass.sol/CC2AccessPass.json')
const AdvancedONFT721GaslessAbi = loadAbi('../artifacts/contracts/token/onft/extension/AdvancedONFT721Gasless.sol/AdvancedONFT721Gasless.json')

export const deployAdvancedONFT721 = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre

  const [owner] = await ethers.getSigners()
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
  const args = (ONFT_ARGS as any)[taskArgs.collection][network.name]
  if (network.name !== 'zksync' && network.name !== 'zksync-testnet') {
    await deployContract(hre, 'CC2AccessPass', owner, [
      args.name,
      args.symbol,
      lzEndpoint,
      args.startMintId,
      args.endMintId,
      args.baseTokenURI,
      args.beneficiary,
      args.taxRecipient,
      args.premint
    ])
  }
}
export const deployAllAdvancedONFT721 = async function (taskArgs: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat deployAdvancedONFT721 --network ${network} --collection ${taskArgs.collection}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

export const deployAdvancedONFT721Gasless = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre

  const [owner] = await ethers.getSigners()
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
  const args = (ONFT_ARGS as any)[taskArgs.collection][network.name]

  if (network.name !== 'zksync' && network.name !== 'zksync-testnet') {
    await deployContract(hre, 'AdvancedONFT721Gasless', owner, [
      args.name,
      args.symbol,
      lzEndpoint,
      args.startMintId,
      args.endMintId,
      args.maxTokensPerMint,
      args.baseTokenURI,
      args.hiddenURI,
      args.stableCoin,
      args.tax,
      args.taxRecipient
    ])
  }
}

export const deployAllAdvancedONFT721Gasless = async function (taskArgs: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat deployAdvancedONFT721Gasless --network ${network}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

export const prepareAdvancedONFT = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  let advancedONFT721
  if (network.name === 'zksync' || network.name === 'zksync-testnet') {
    const path = '../artifacts-zk/contracts/token/onft/extension/CC2/CC2AccessPass.sol/CC2AccessPass.json'
    const ContractArtifact = require(path)
    advancedONFT721 = createContractByName(hre, 'CC2AccessPass', ContractArtifact.abi, owner)
  } else {
    advancedONFT721 = createContractByName(hre, 'CC2AccessPass', AdvancedONFT721Abi().abi, owner)
  }
  const args = (ONFT_ARGS as any)[taskArgs.collection][network.name]
  // await submitTx(hre, advancedONFT721, 'flipPublicSaleStarted', [])
  // await submitTx(hre, advancedONFT721, 'setPrice', [args.price])
  await submitTx(hre, advancedONFT721, 'flipSaleStarted', [])
}

export const prepareAllAdvancedONFT = async function (taskArgs: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat prepareAdvancedONFT --network ${network} --collection ${taskArgs.collection}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

export const prepareAdvancedONFTGasless = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const args = (ONFT_ARGS as any)[taskArgs.collection][network.name]
  const advancedONFT721Gasless = createContractByName(hre, 'AdvancedONFT721Gasless', AdvancedONFT721GaslessAbi().abi, owner)
  await submitTx(hre, advancedONFT721Gasless, 'flipRevealed', [])
  await submitTx(hre, advancedONFT721Gasless, 'setPrice', [args.price])
  await submitTx(hre, advancedONFT721Gasless, 'flipPublicSaleStarted', [])
}

export const prepareAllAdvancedONFTGasless = async function (taskArgs: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat prepareAdvancedONFTGasless --network ${network} --collection ${taskArgs.collection}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

export const set721GaslessConfig = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const args = (ONFT_ARGS as any)[taskArgs.collection][network.name]
  const dstChainId = CHAIN_IDS[taskArgs.target]
  const advancedONFT721Gasless = createContractByName(hre, 'AdvancedONFT721Gasless', AdvancedONFT721GaslessAbi().abi, owner)

  try {
    await submitTx(hre, advancedONFT721Gasless, 'setDstChainIdToBatchLimit', [dstChainId, 20])
    await submitTx(hre, advancedONFT721Gasless, 'setMinGasToTransferAndStore', [1])
    await submitTx(hre, advancedONFT721Gasless, 'setDstChainIdToTransferGas', [dstChainId, args.transferGas])
    console.log(`${hre.network.name}`)
    console.log(`✅ set batch limit for (${dstChainId}) to ${args.batchLimit} `)
    console.log(`✅ set transfer gas for (${dstChainId}) to ${args.transferGas} `)
    console.log(`✅ set min dst gas for (${dstChainId}) to ${args.minDstGas} `)
  } catch (e: any) {
    console.log(e)
  }
}

export const setAll721GaslessConfig = async function (taskArgs: any, hre: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }

  await Promise.all(
    networks.map(async (network: string) => {
      networks.map(async (target: string) => {
        if (network !== target && network !== 'ethereum') {
          const checkWireUpCommand = `npx hardhat --network ${network} set721GaslessConfig --target ${target} --collection ${taskArgs.collection}`
          shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
        }
      })
    })
  )
}

export const set721Config = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const args = (ONFT_ARGS as any)[taskArgs.collection][network.name]
  const dstChainId = CHAIN_IDS[taskArgs.target]
  let advancedONFT721
  if (network.name === 'zksync' || network.name === 'zksync-testnet') {
    const path = '../artifacts-zk/contracts/token/onft/extension/CC2/CC2AccessPass.sol/CC2AccessPass.json'
    const ContractArtifact = require(path)
    advancedONFT721 = createContractByName(hre, 'CC2AccessPass', ContractArtifact.abi, owner)
  } else {
    advancedONFT721 = createContractByName(hre, 'CC2AccessPass', AdvancedONFT721Abi().abi, owner)
  }
  try {
    if (network.name === 'arbitrum') {
      await submitTx(hre, advancedONFT721, 'setDstChainIdToBatchLimit', [dstChainId, 20], { nonce: 252 })
      await submitTx(hre, advancedONFT721, 'setMinGasToTransferAndStore', [1], { nonce: 253 })
      await submitTx(hre, advancedONFT721, 'setDstChainIdToTransferGas', [dstChainId, args.transferGas], { nonce: 254 })
    } else {
      await submitTx(hre, advancedONFT721, 'setDstChainIdToBatchLimit', [dstChainId, 20])
      await submitTx(hre, advancedONFT721, 'setMinGasToTransferAndStore', [1])
      await submitTx(hre, advancedONFT721, 'setDstChainIdToTransferGas', [dstChainId, args.transferGas])
    }
    console.log(`${hre.network.name}`)
    console.log(`✅ set batch limit for (${dstChainId}) to ${args.batchLimit} `)
    console.log(`✅ set transfer gas for (${dstChainId}) to ${args.transferGas} `)
    console.log(`✅ set min dst gas for (${dstChainId}) to ${args.minDstGas} `)
  } catch (e: any) {
    console.log(e)
  }
}

export const setAll721Config = async function (taskArgs: any, hre: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }

  await Promise.all(
    networks.map(async (network: string) => {
      networks.map(async (target: string) => {
        if (network !== target && network !== 'ethereum') {
          const checkWireUpCommand = `npx hardhat --network ${network} set721Config --target ${target} --collection ${taskArgs.collection}`
          shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
        }
      })
    })
  )
}
