import hre from 'hardhat'
import OmniNFTABI from '../artifacts/contracts/token/ERC721Persistent.sol/ERC721Persistent.json'

async function main () {
  const [signer] = await hre.ethers.getSigners()

  // https://hardhat.org/plugins/nomiclabs-hardhat-ethers.html#helpers
  const omniNFT = new hre.ethers.Contract(
    '0x6d831c7eaC49DA1D3D3D7cd1DD18C2700CEf0308',
    OmniNFTABI.abi,
    signer
  )

  // console.log(await omniNFT.getApproved(3))
  const tx = await (await omniNFT.approve('0x5EeB73f7A1F08aA74F0336A47c62B6C0EcE28710', 0)).wait()
  console.log(tx)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
