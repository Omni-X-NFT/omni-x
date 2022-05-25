const fs = require('fs')
const path = require('path')
const CHAIN_ID = require('../constants/chainIds.json')
const { getDeploymentAddresses } = require('../utils/readStatic')
const OFT_CONFIG = require('../constants/oftConfig.json')

module.exports = async function (taskArgs, hre) {
  const [deployer] = await ethers.getSigners()

  console.log(taskArgs)
  console.log(hre.network.name)
  let srcContractName = 'OmniNFT'
  let dstContractName = srcContractName
  if (taskArgs.contractname) {
    srcContractName = taskArgs.contractname
    dstContractName = srcContractName
  }
  // if (hre.network.name == OFT_CONFIG.baseChain) {
  //   srcContractName = 'ExampleBasedOFT'
  // }

  const dstChainId = CHAIN_ID[taskArgs.target]
  // console.log(getDeploymentAddresses(taskArgs.target))
  const dstAddr = getDeploymentAddresses(taskArgs.target)[dstContractName]
  console.log(dstAddr)
  // get local contract instance
  const addresses = getDeploymentAddresses(hre.network.name)[srcContractName]
  const contractInstance = await hre.ethers.getContractAt(srcContractName, addresses, deployer)
  console.log(`[source] contract address: ${contractInstance.address}`)

  // setTrustedRemote() on the local contract, so it can receive message from the source contract
  try {
    const tx = await (await contractInstance.setTrustedRemote(dstChainId, dstAddr)).wait()
    console.log(`✅ [${hre.network.name}] setTrustedRemote(${dstChainId}, ${dstAddr})`)
    console.log(` tx: ${tx.transactionHash}`)
  } catch (e) {
    if (e.error.message.includes('The chainId + address is already trusted')) {
      console.log('*source already set*')
    } else {
      console.log(e)
    }
  }
}
