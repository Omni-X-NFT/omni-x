import * as CHAIN_ID from '../constants/chainIds.json'
import { getDeploymentAddresses } from '../utils/readStatic'
// import OFT_CONFIG from '../constants/oftConfig.json'

type CHAINIDTYPE = {
  [key: string]: number
}

const CHAIN_IDS: CHAINIDTYPE = CHAIN_ID

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
    const tx = await (await contractInstance.setTrustedRemote(dstChainId, trustedRemote, { gasPrice: 80000000000, maxPriorityFeePerGas: 30000000000 })).wait()
    console.log(`✅ [${hre.network.name}] setTrustedRemote(${dstChainId}, ${dstAddr})`)
    console.log(` tx: ${tx.transactionHash}`)
  } catch (e: any) {
    if (e.error.message.includes('The chainId + address is already trusted')) {
      console.log('*source already set*')
    } else {
      console.log(e)
    }
  }
}
