import { ethers } from 'ethers'
import shell from 'shelljs'
import * as CHAIN_ID from '../constants/chainIds.json'
import MILADY_ARGS from '../constants/milady.json'
import DOODLE_ARGS from '../constants/doodle.json'
import ONFT_ARGS from '../constants/onftArgs.json'
import LZ_ENDPOINTS from '../constants/layerzeroEndpoints.json'
import STABLE_COINS from '../constants/usd.json'

type CHAINIDTYPE = {
  [key: string]: number
}

const ENDPOINTS: any = LZ_ENDPOINTS
const STABLECOINS: any = STABLE_COINS
const MILADYARGS: any = MILADY_ARGS
const DOODLEARGS: any = DOODLE_ARGS
const ONFTARGS: any = ONFT_ARGS
const CHAIN_IDS: CHAINIDTYPE = CHAIN_ID

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom'],
  testnet: ['goerli', 'bsc-testnet', 'fuji', 'arbitrum-goerli', 'optimism-goerli', 'fantom-testnet', 'moonbeam_testnet', 'mumbai']
}

const CONTRACT_NAMES: any = {
  'Milady': 'contracts/token/onft/extension/AdvancedONFT721Gasless.sol:AdvancedONFT721Gasless',
  'Doodle': 'contracts/token/onft/extension/AdvancedONFT721GaslessClaim.sol:AdvancedONFT721GaslessClaim',
  'ONFT': 'contracts/token/onft/extension/AdvancedONFT721.sol:AdvancedONFT721'
}

export const setupMiladyArgs = async function (taskArgs: any, hre: any) {
  const [deployer] = await hre.ethers.getSigners()
  const {addr, tag} = taskArgs

  const contractAddr = addr
  const contractName = CONTRACT_NAMES[tag]
  const srcNetwork = hre.network.name
  const args = MILADYARGS[srcNetwork]
  const lzEndpointAddress = ENDPOINTS[srcNetwork]
  const stableAddr = STABLECOINS[srcNetwork] || ethers.constants.AddressZero
  
  const contractInstance = await hre.ethers.getContractAt(contractName, contractAddr, deployer)

  try {
    await (await contractInstance.initialize()).wait()
    await (await contractInstance.flipPublicSaleStarted()).wait()
    await (await contractInstance.flipSaleStarted()).wait()
    await (await contractInstance.flipRevealed()).wait()
    await (await contractInstance.setStableToken(stableAddr)).wait()
    await (await contractInstance.setLzEndpoint(lzEndpointAddress)).wait()

    if (args) {
      await (await contractInstance.setMintRange(args.startMintId, args.endMintId, args.maxTokensPerMint)).wait()
      await (await contractInstance.setPrice(args.price)).wait()
    }
  } catch (e: any) {
    console.log(e)
  }
}

export const setupDoodleArgs = async function (taskArgs: any, hre: any) {
  const [deployer] = await hre.ethers.getSigners()
  const {addr, tag} = taskArgs

  const contractAddr = addr
  const contractName = CONTRACT_NAMES[tag]
  const srcNetwork = hre.network.name
  const args = DOODLEARGS[srcNetwork]
  const lzEndpointAddress = ENDPOINTS[srcNetwork]
  const stableAddr = STABLECOINS[srcNetwork] || ethers.constants.AddressZero
  
  const contractInstance = await hre.ethers.getContractAt(contractName, contractAddr, deployer)

  try {
    await (await contractInstance.initialize()).wait()
    await (await contractInstance.setLzEndpoint(lzEndpointAddress)).wait()
    await (await contractInstance.setStableToken(stableAddr)).wait()
    await (await contractInstance.flipRevealed()).wait()

    if (args) {
      await (await contractInstance.flipPublicSaleStarted()).wait()
      await (await contractInstance.flipSaleStarted()).wait()
      await (await contractInstance.setMintRange(args.startMintId, args.endMintId, args.maxTokensPerMint)).wait()
  
      await (await contractInstance.setPrice(args.price)).wait()
  
      if (args.claimable) {
        await (await contractInstance.startClaim(args.claimableTokenCount, args.claimableCollection)).wait()
      }
    }
  } catch (e: any) {
    console.log(e)
  }
}

// Tiny Dinos, Art Gobblers, Metroverse, Founder Pirates
export const setupONFTArgs = async function (taskArgs: any, hre: any) {
  const [deployer] = await hre.ethers.getSigners()
  const {addr, tag} = taskArgs

  const contractAddr = addr
  const contractName = CONTRACT_NAMES[tag]
  const srcNetwork = hre.network.name
  const args = ONFTARGS[srcNetwork]
  const lzEndpointAddress = ENDPOINTS[srcNetwork]
  
  const contractInstance = await hre.ethers.getContractAt(contractName, contractAddr, deployer)

  try {
    await (await contractInstance.initialize()).wait()
    await (await contractInstance.setLzEndpoint(lzEndpointAddress)).wait()

    if (args) {
      await (await contractInstance.flipPublicSaleStarted()).wait()
      await (await contractInstance.flipSaleStarted()).wait()
      await (await contractInstance.setMintRange(args.startMintId, args.endMintId, args.maxTokensPerMint)).wait()
  
      await (await contractInstance.setPrice(args.price)).wait()
    }
  } catch (e: any) {
    console.log(e)
  }
}

export const setXTrustedRemote = async function (taskArgs: any, hre: any) {
  const [deployer] = await hre.ethers.getSigners()
  const {addr, tag, e: env} = taskArgs
  const contractAddr = addr
  const contractName = CONTRACT_NAMES[tag]
  const networks = environments[env]
  const srcNetwork = hre.network.name
  
  const contractInstance = await hre.ethers.getContractAt(contractName, contractAddr, deployer)

  try {
    // setTrustedRemote() on the local contract, so it can receive message from the source contract
    const trustedRemote = hre.ethers.utils.solidityPack(['address', 'address'], [contractAddr, contractAddr])

    for (const dstNetwork of networks) {
      if (srcNetwork != dstNetwork) {
        const dstChainId = CHAIN_IDS[dstNetwork]
        const tx = await (await contractInstance.setTrustedRemote(dstChainId, trustedRemote)).wait()

        console.log(`✅ [${hre.network.name}] setTrustedRemote(${dstChainId}, ${contractAddr})`)
        console.log(` tx: ${tx.transactionHash}`)
      }
    }
  } catch (e: any) {
    console.log(e)
  }
}

export const setAllXTrustedRemote = async function (taskArgs: any, hre: any) {
  const {e: env, tag, addr} = taskArgs
  const networks = environments[env]

  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat --network ${network} setXTrustedRemote --tag ${tag} --e ${env} --addr ${addr}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

export const setupAllArgs = async function (taskArgs: any, hre: any) {
  const {tag, addr, e: env} = taskArgs
  const networks = environments[env]

  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat --network ${network} setup${tag}Args --tag ${tag} --addr ${addr}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}