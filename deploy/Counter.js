const LZ_ENDPOINTS = require('../constants/layerzeroEndpoints.json')
const fs = require('fs')
const path = require('path')

async function main () {
  const [deployer] = await ethers.getSigners()

  console.log(`>>> your address: ${deployer.address}`)

  // get the Endpoint address
  const endpointAddr = LZ_ENDPOINTS[hre.network.name]
  console.log(`[${hre.network.name}] LayerZero Endpoint address: ${endpointAddr}`)

  const omniCounter = await hre.ethers.getContractFactory('OmniCounter')
  const OmniCounterInstance = await omniCounter.deploy(
    endpointAddr
  )
  await OmniCounterInstance.deployed()

  console.log(OmniCounterInstance.address)

  const folderName = hre.network.name === 'hardhat' ? 'localhost' : hre.network.name
  if (!fs.existsSync(path.resolve(__dirname, `../deployments/${folderName}`))) {
    fs.mkdirSync(path.resolve(__dirname, `../deployments/${folderName}`))
  }
  fs.writeFileSync(path.resolve(__dirname, `../deployments/${folderName}/OmniCounter.json`), JSON.stringify({
    address: OmniCounterInstance.address
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
