import hre from 'hardhat'
import OmniNFTABI from '../artifacts/contracts/token/onft/extension/PersistentURIONFT.sol/PersistentURIONFT.json'

async function main () {
  const [signer] = await hre.ethers.getSigners()

  // https://hardhat.org/plugins/nomiclabs-hardhat-ethers.html#helpers
  const omniNFT = new hre.ethers.Contract(
    '0x2477e0B42da7D427bCC1acf693af21DB35a5309E',
    OmniNFTABI.abi,
    signer
  )

  // console.log(await omniNFT.getApproved(3))
  const tx = await (await omniNFT.approve('0x74E0ad792dd5cA33C8b7084f2142E52B8d9b8F27', 0)).wait()
  console.log(tx)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
