import hre from 'hardhat'
import LZ_ENDPOINTS from '../constants/layerzeroEndpoints.json'

type CHAINTYPE = {
  [key: string]: string
}

const ENDPOINTS: CHAINTYPE = LZ_ENDPOINTS

// @ts-ignore
module.exports = async function ({ deployments, getNamedAccounts }) {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  // get the Endpoint address
  const endpointAddr = ENDPOINTS[hre.network.name]

  await deploy("OmniNFT", {
    from: deployer,
    args: [
      'OmniNFT',
      'OFT',
      endpointAddr,
      'https://baseuri.com/'
    ],
    log: true,
    waitConfirmations: 1,
  })

  console.log(`✅ [${hre.network.name}]`)
}

module.exports.tags = ["OmniNFT"]
