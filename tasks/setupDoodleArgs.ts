import { ethers } from 'ethers'
import * as CHAIN_ID from '../constants/chainIds.json'
import DOODLE_ARGS from '../constants/doodle.json'
import LZ_ENDPOINTS from '../constants/layerzeroEndpoints.json'
import STABLE_COINS from '../constants/usd.json'

type CHAINIDTYPE = {
  [key: string]: number
}

const ENDPOINTS: any = LZ_ENDPOINTS
const STABLECOINS: any = STABLE_COINS
const ARGS: any = DOODLE_ARGS
const CHAIN_IDS: CHAINIDTYPE = CHAIN_ID

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom'],
  // testnet: ['goerli', 'bsc-testnet', 'fuji', 'mumbai', 'arbitrum-goerli', 'optimism-goerli', 'fantom-testnet', 'moonbeam_testnet']
  testnet: ['goerli', 'bsc-testnet', 'fuji', 'mumbai', 'arbitrum-goerli', 'optimism-goerli', 'moonbeam_testnet', 'fantom-testnet']
}

export const setupDoodleArgs = async function (taskArgs: any, hre: any) {
  const [deployer] = await hre.ethers.getSigners()

  const contractAddr = taskArgs.addr
  const contractName = 'contracts/token/onft/extension/AdvancedONFT721GaslessClaim.sol:AdvancedONFT721GaslessClaim'
  const networks = environments[taskArgs.e]
  const srcNetwork = hre.network.name
  const args = ARGS[srcNetwork]
  const lzEndpointAddress = ENDPOINTS[srcNetwork]
  const stableAddr = STABLECOINS[srcNetwork] || ethers.constants.AddressZero
  
  const contractInstance = await hre.ethers.getContractAt(contractName, contractAddr, deployer)

  try {
    // await (await contractInstance.initialize()).wait()
    // await (await contractInstance.setLzEndpoint(lzEndpointAddress)).wait()
    // await (await contractInstance.setStableToken(stableAddr)).wait()

    // if (args) {
    //   await (await contractInstance.flipPublicSaleStarted()).wait()
    //   await (await contractInstance.flipSaleStarted()).wait()
    //   await (await contractInstance.flipRevealed()).wait()
    //   await (await contractInstance.setMintRange(args.startMintId, args.endMintId, args.maxTokensPerMint)).wait()
  
    //   await (await contractInstance.setPrice(args.price)).wait()
  
    //   if (args.claimable) {
    //     await (await contractInstance.startClaim(args.claimableTokenCount, args.claimableCollection)).wait()
    //   }
  
    // }
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
