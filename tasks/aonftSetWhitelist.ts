import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getDeploymentAddresses } from '../utils/readStatic'
// import arbitrumWL from '../constants/og/arbitrum.json'
// import avalancheWL from '../constants/og/avalanche.json'
// import bscWL from '../constants/og/bsc.json'
// import ethereumWL from '../constants/og/ethereum.json'
// import fantomWL from '../constants/og/fantom.json'
// import optimismWL from '../constants/og/optimism.json'
// import polygonWL from '../constants/og/polygon.json'
import earlySupporterWL from '../constants/og/earlysupporter.json'
const { MerkleTree } = require('merkletreejs')

export const aonftSetWhitelist = async function (taskArgs: any, hre: HardhatRuntimeEnvironment) {
  const [deployer] = await hre.ethers.getSigners()

  const addresses = getDeploymentAddresses(hre.network.name).AdvancedONFT721
  const advancedONFT = await hre.ethers.getContractAt('AdvancedONFT721', addresses, deployer)
  console.log(`[source] AdvancedONFT721.address: ${advancedONFT.address}`)

  // Generate Merkle Root and setting up to contract
  const leaves = await Promise.all(
    // change the WL here
    earlySupporterWL.map(async (account) => {
      return hre.ethers.utils.keccak256(account)
    })
  )
  const tree = new MerkleTree(leaves, hre.ethers.utils.keccak256, {
    sortPairs: true
  })
  const merkleRoot = tree.getHexRoot()

  // added a list of addresses to Wl
  try {
    const tx1 = await (await advancedONFT.setMerkleRoot(merkleRoot)).wait()
    console.log(`✅ [${hre.network.name}] setAllowList(wl)`)
    console.log(` tx1: ${tx1.transactionHash}`)
  } catch (e) {
    console.log(e)
  }
}
