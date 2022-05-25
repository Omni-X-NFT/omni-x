import hre from 'hardhat'
import fs from 'fs'
import path from 'path'
import LZ_ENDPOINTS from '../constants/layerzeroEndpoints.json'

type CHAINTYPE = {
  [key: string]: string
}

const ENDPOINTS: CHAINTYPE = LZ_ENDPOINTS

async function main () {
  const [deployer] = await hre.ethers.getSigners()

  console.log(`>>> your address: ${deployer.address}`)

  // get the Endpoint address
  const endpointAddr = ENDPOINTS[hre.network.name]
  console.log(`[${hre.network.name}] LayerZero Endpoint address: ${endpointAddr}`)

  const omniNFT = await hre.ethers.getContractFactory('OmniNFT')
  const omniNFTInstance = await omniNFT.deploy(
    'OmniNFT',
    'OFT',
    endpointAddr,
    'https://baseuri.com/'
  )
  await omniNFTInstance.deployed()

  console.log(omniNFTInstance.address)

  const folderName = hre.network.name === 'hardhat' ? 'localhost' : hre.network.name
  if (!fs.existsSync(path.resolve(__dirname, `../deployments/${folderName}`))) {
    fs.mkdirSync(path.resolve(__dirname, `../deployments/${folderName}`))
  }
  fs.writeFileSync(path.resolve(__dirname, `../deployments/${folderName}/OmniNFT.json`), JSON.stringify({
    address: omniNFTInstance.address
  }), {
    encoding: 'utf8',
    flag: 'w'
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
