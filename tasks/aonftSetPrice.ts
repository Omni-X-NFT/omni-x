module.exports = async function (taskArgs, hre) {
  const advancedONFT = await hre.ethers.getContract('AdvancedONFT721')
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
