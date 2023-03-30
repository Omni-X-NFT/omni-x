import * as CHAIN_ID from '../constants/chainIds.json'
import { loadAbi, createContractByName } from './shared'
import omniElementArgs from '../constants/omniElementMainnetArgs.json'

type CHAINIDTYPE = {
  [key: string]: number
}

const CHAIN_IDS: CHAINIDTYPE = CHAIN_ID
const AdvancedONFT721GaslessAbi = loadAbi('../artifacts/contracts/token/onft/extension/AdvancedONFT721Gasless.sol/AdvancedONFT721Gasless.json')

const tx = async (tx1: any) => {
  await tx1.wait()
}

export const set721Config = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const args = (omniElementArgs as any)[network.name]
  const dstChainId = CHAIN_IDS[taskArgs.target]
  const advancedONFT721Gasless = createContractByName(hre, 'AdvancedONFT721Gasless', AdvancedONFT721GaslessAbi().abi, owner)

  try {
    await tx(await advancedONFT721Gasless.setDstChainIdToBatchLimit(dstChainId, args.batchLimit))
    await tx(await advancedONFT721Gasless.setDstChainIdToTransferGas(dstChainId, args.transferGas))
    await tx(await advancedONFT721Gasless.setMinDstGas(dstChainId, 1, args.minDstGas))
    // await tx(await advancedONFT721Gasless.setMinGasToTransferAndStore(200000))
    console.log(`${hre.network.name}`)
    console.log(`✅ set batch limit for (${dstChainId}) to ${args.batchLimit} `)
    console.log(`✅ set transfer gas for (${dstChainId}) to ${args.transferGas} `)
    console.log(`✅ set min dst gas for (${dstChainId}) to ${args.minDstGas} `)

  } catch (e: any) {
    console.log(e)
  }
}