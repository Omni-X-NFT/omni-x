import hre from 'hardhat'
import OmniNFTABI from '../artifacts/contracts/token/onft/extension/PersistentURIONFT.sol/PersistentURIONFT.json'

async function main () {
  const [signer] = await hre.ethers.getSigners()

  const omniNFT = new hre.ethers.Contract(
    '0x08a8Cf2c9aE7599811308F92EB9c1c58BB622C34',
    OmniNFTABI.abi,
    signer
  )

  // console.log(await omniNFT.getApproved(3))
  const tx = await (await omniNFT.approve('0x51c117182Ce29E779bD06e2d8013CcdA79917d2B', 0)).wait()
  console.log(tx)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
