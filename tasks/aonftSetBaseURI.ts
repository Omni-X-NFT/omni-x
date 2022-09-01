import { getDeploymentAddresses } from '../utils/readStatic'

export const aonftSetBaseURI = async function (taskArgs: any, hre: any) {
  const [deployer] = await hre.ethers.getSigners()

  const addresses = getDeploymentAddresses(hre.network.name).AdvancedONFT721

  const advancedONFT = await hre.ethers.getContractAt('AdvancedONFT721', addresses, deployer)
  console.log(`[source] AdvancedONFT721.address: ${advancedONFT.address}`)

  // set new baseURI
  try {
    const tx = await (await advancedONFT.setBaseURI(taskArgs.baseuri)).wait()
    console.log(`✅ [${hre.network.name}] setBaseURI(${taskArgs.baseuri})`)
    console.log(` tx: ${tx.transactionHash}`)
  } catch (e) {
    console.log(e)
  }
}
