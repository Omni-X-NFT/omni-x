module.exports = async function (taskArgs, hre) {
  const advancedONFT = await hre.Sethers.getContract('AdvancedONFT721')
  console.log(`[source] AdvancedONFT721.address: ${advancedONFT.address}`)

  // withdraw ETH from the contract to the beneficiary
  try {
    const tx = await (await advancedONFT.withdraw()).wait()
    console.log(`✅ [${hre.network.name}] withdraw`)
    console.log(` tx: ${tx.transactionHash}`)
  } catch (e) {
    console.log(e)
  }
}
