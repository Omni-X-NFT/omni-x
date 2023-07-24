import { createClient } from '@layerzerolabs/scan-client'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import LZEndpointABI from '../constants/LZEndpointABI.json'
import * as CHAIN_ID from '../constants/chainIds.json'
import { getDeploymentAddresses } from '../utils/readStatic'
import shell from 'shelljs'
import { createContractByName, loadAbi, submitReturnTx, submitTx, environments } from './shared'
type CHAINIDTYPE = {
    [key: string]: number
}
const AdvancedONFT721AAbi = loadAbi('../artifacts/contracts/token/onft721A/extension/collections/OmnichainAdventures.sol/OmnichainAdventures.json')

const CHAIN_IDS: CHAINIDTYPE = CHAIN_ID
export const lzScan = async function (taskArgs: any, hre: any) {
  // Initialize a client with the desired environment
  let client
  if (taskArgs.e === 'testnet') {
    client = createClient('testnet')
  } else {
    client = createClient('mainnet')
  }
  // Get a list of messages by transaction hash
  const { messages } = await client.getMessagesBySrcTxHash(taskArgs.hash)
  console.log(messages)
}

export const forceResume = async function (taskArgs: any, hre: any) {
  const { ethers } = hre
  const [owner] = await ethers.getSigners()
  const targetDstChainId = CHAIN_IDS[taskArgs.target]
  const onft = createContractByName(hre, 'OmnichainAdventures', AdvancedONFT721AAbi().abi, owner)
  try {
    await submitTx(hre, onft, 'forceResumeReceive', [targetDstChainId, ethers.utils.arrayify(taskArgs.srcua)])
  } catch (e: any) {
    console.log(e.message)
  }
}

export const hasStoredPayload = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const targetDstChainId = CHAIN_IDS[taskArgs.target]
  const lzEndpointAddress = (LZ_ENDPOINT as any)[network.name]
  const lzEndpoint = new ethers.Contract(lzEndpointAddress, LZEndpointABI, owner)
  try {
    const val = await submitReturnTx(hre, lzEndpoint, 'hasStoredPayload', [targetDstChainId, ethers.utils.arrayify(taskArgs.srcua)])
    console.log(val)
  } catch (e: any) {
    console.log(e.message)
  }
}

export const setTrustedRemote = async function (taskArgs: any, hre: any) {
  const [deployer] = await hre.ethers.getSigners()

  let srcContractName = 'OmniNFT'
  let dstContractName = srcContractName
  if (taskArgs.contract) {
    srcContractName = taskArgs.contract
    dstContractName = srcContractName
  }

  const dstChainId = CHAIN_IDS[taskArgs.target]
  const dstAddr = getDeploymentAddresses(taskArgs.target)[dstContractName]
  // get local contract instance
  const addresses = getDeploymentAddresses(hre.network.name)[srcContractName]
  const contractInstance = await hre.ethers.getContractAt(srcContractName, addresses, deployer)
  console.log(`[source] contract address: ${contractInstance.address}`)

  // setTrustedRemote() on the local contract, so it can receive message from the source contract
  try {
    const trustedRemote = hre.ethers.utils.solidityPack(['address', 'address'], [dstAddr, addresses])
    await submitTx(hre, contractInstance, 'setTrustedRemote', [dstChainId, trustedRemote])
    console.log(`✅ [${hre.network.name}] setTrustedRemote(${dstChainId}, ${dstAddr})`)
  } catch (e: any) {
    console.log(e)
  }
}

export const setAllTrustedRemote = async function (taskArgs: any, hre: any) {
  const networks = environments[taskArgs.e]
  const targets = environments[taskArgs.target]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  if (taskArgs.netexclude !== 'none') {
    const exclude = taskArgs.exclude.split(' ')
    networks.filter((n: string) => !exclude.includes(n))
  }
  if (taskArgs.exclude !== 'none') {
    const exclude = taskArgs.exclude.split(' ')
    targets.filter((n: string) => !exclude.includes(n))
  }

  await Promise.all(
    networks.map(async (network: string) => {
      targets.map(async (target: string) => {
        if ((network !== target)) {
          const checkWireUpCommand = `npx hardhat --network ${network} setTrustedRemote --target ${target} --contract ${taskArgs.contract}`
          shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
        }
      })
    })
  )
}
