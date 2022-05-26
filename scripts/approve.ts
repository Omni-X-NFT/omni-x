import hre from 'hardhat'
import OmniNFTABI from '../artifacts/contracts/OmniNFT.sol/OmniNFT.json'

async function main () {
  const [signer] = await hre.ethers.getSigners()

  const omniNFT = new hre.ethers.Contract(
    '0x2616CA088c1910A56739aC0914F44c7612b1b049',
    OmniNFTABI.abi,
    signer
  )

    // console.log(await omniNFT.getApproved(3))
  const tx = await (await omniNFT.approve('0xBa8b379aB127Fe03142198b0AdEBDc60535F24a8', 4)).wait()
  console.log(tx)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
