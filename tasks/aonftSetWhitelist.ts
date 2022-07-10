const { MerkleTree } = require('merkletreejs')

module.exports = async function (taskArgs, hre) {
  const advancedONFT = await hre.ethers.getContract('AdvancedONFT721')
  console.log(`[source] AdvancedONFT721.address: ${advancedONFT.address}`)

  const wl = [
    '0x5509feB29Cf44A32D72aec2Fbad8e8A574347D0e', // Kartos
    '0xB49213fE8d39F22FECA3779ee5f15b66bF547375', // Boob
    '0xd520912473998bC62d825AeFcaF75527632C7AED', // Viva
    '0xa0825f3787a4a2625ea43780302Fe07846C2C6A8', // Rielar
    '0x011bD4aeE78704399B566b39796B6CF32c4dA133', // Trent
    '0xed014E419b84c3Eff55173261AEd660A60298b2c', // Jenson
    '0x324BF4ae1c6ca3d28B700a6158aF203e908F0C12' // Steve
  ]
  // Generate Merkle Root and setting up to contract
  const leaves = await Promise.all(
    wl.map(async (account) => {
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
