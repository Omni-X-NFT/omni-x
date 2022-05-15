const fs = require('fs')
const path = require('path')
const CHAIN_ID = require('../constants/chainIds.json')
const { getDeploymentAddresses } = require('../utils/readStatic')
const OFT_CONFIG = require('../constants/oftConfig.json')

module.exports = async function (taskArgs, hre) {
  const [deployer] = await ethers.getSigners()

  let srcContractName = 'OmniNFT'
  let dstContractName = srcContractName
  if (taskArgs.targetNetwork == OFT_CONFIG.baseChain) {
    // if its the base chain, we need to grab a different contract
    // Note: its reversed though!
    dstContractName = 'ExampleBasedOFT'
  }
  if (hre.network.name == OFT_CONFIG.baseChain) {
    srcContractName = 'ExampleBasedOFT'
  }

  const dstChainId = CHAIN_ID[taskArgs.targetNetwork]
  // console.log(getDeploymentAddresses(taskArgs.targetNetwork))
  const dstAddr = getDeploymentAddresses(taskArgs.targetNetwork)[dstContractName]
  // get local contract instance
  const address = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../deployments/${taskArgs.targetNetwork}/${srcContractName}.json`), {
    encoding: 'utf8',
    flag: 'r'
  }))
  const contractInstance = await hre.ethers.getContractAt(srcContractName, address.address, deployer)
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
