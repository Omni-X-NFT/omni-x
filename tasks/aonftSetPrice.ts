import { getDeploymentAddresses } from '../utils/readStatic'

export const aonftSetPrice = async function (taskArgs: any, hre: any) {
  const [deployer] = await hre.ethers.getSigners()

  const addresses = getDeploymentAddresses(hre.network.name).AdvancedONFT721

  const advancedONFT = await hre.ethers.getContractAt('AdvancedONFT721', addresses, deployer)
  console.log(`[source] AdvancedONFT721.address: ${advancedONFT.address}`)

  // set new price for the mint
  try {
    const tx = await (await advancedONFT.setPrice(hre.ethers.utils.parseEther(taskArgs.price))).wait()
    console.log(`✅ [${hre.network.name}] setPrice(${taskArgs.price})`)
    console.log(` tx: ${tx.transactionHash}`)
  } catch (e) {
    console.log(e)
  }
}
