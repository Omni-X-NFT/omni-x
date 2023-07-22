import {createClient} from '@layerzerolabs/scan-client';
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import LZEndpointABI from '../constants/LZEndpointABI.json'
import * as CHAIN_ID from '../constants/chainIds.json'
import { createContractByName, loadAbi } from './shared'; 
type CHAINIDTYPE = {
    [key: string]: number
}
const AdvancedONFT721AAbi = loadAbi('../artifacts/contracts/token/onft721A/extension/collections/OmnichainAdventures.sol/OmnichainAdventures.json')

const tx = async (tx1: any) => {
  await tx1.wait()
}
const CHAIN_IDS: CHAINIDTYPE = CHAIN_ID
export const lzScan = async function(taskArgs: any, hre: any) {
    // Initialize a client with the desired environment
    let client
    if (taskArgs.e === 'testnet') {
        client = createClient('testnet')
    } else {
        client = createClient('mainnet')
    }
    // Get a list of messages by transaction hash
    const {messages} = await client.getMessagesBySrcTxHash(
    taskArgs.hash,
    );
    console.log(messages)
}


export const forceResume = async function(taskArgs: any, hre: any) {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const targetDstChainId = CHAIN_IDS[taskArgs.target]
  const onft = createContractByName(hre, 'OmnichainAdventures', AdvancedONFT721AAbi().abi, owner)
  try {
    await (await onft.forceResumeReceive(targetDstChainId, ethers.utils.arrayify(taskArgs.srcua))).wait()
  } catch (e: any) {
    console.log(e.message)
  }
}

export const convertToBytes = async function(taskArgs: any, hre: any) {
    const { ethers, network } = hre
    const [owner] = await ethers.getSigners()

}

export const hasStoredPayload = async function(taskArgs: any, hre: any) {

  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const targetDstChainId = CHAIN_IDS[taskArgs.target]
  const lzEndpointAddress = (LZ_ENDPOINT as any)[network.name]
  const lzEndpoint = new ethers.Contract(lzEndpointAddress, LZEndpointABI, owner)
  try {
    const val = await lzEndpoint.hasStoredPayload(targetDstChainId, ethers.utils.arryify(taskArgs.srcua))
    console.log(val)
  } catch (e: any) {
    console.log(e.message)
  }

}


