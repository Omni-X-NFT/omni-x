const LZ_ENDPOINTS = require('../constants/layerzeroEndpoints.json')
// const OFT_CONFIG = require('../constants/oftConfig.json')
const hre = require('hardhat')
const { ethers } = require('hardhat')

async function main () {
  const [deployer] = await ethers.getSigners()

  console.log(`>>> your address: ${deployer}`)

  // get the Endpoint address
  const endpointAddr = LZ_ENDPOINTS[hre.network.name]
  console.log(`[${hre.network.name}] LayerZero Endpoint address: ${endpointAddr}`)

  const omniNFT = await ethers.getContractFactory('OmniNFT')
  const omniNFTInstance = await omniNFT.deploy(
    'OmniNFT',
    'OFT',
    endpointAddr,
    'https://baseuri.com/'
  )
  await omniNFTInstance.deployed()

  console.log(omniNFTInstance.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
