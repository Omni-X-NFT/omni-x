import hre from 'hardhat'
import LZ_ENDPOINTS from '../constants/layerzeroEndpoints.json'
import {
  getContractAddrByName
} from '../tasks/shared'

type CHAINTYPE = {
  [key: string]: string
}

const ENDPOINTS: CHAINTYPE = LZ_ENDPOINTS

// @ts-ignore
module.exports = async function ({ deployments, getNamedAccounts }) {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  // const [deployer] = await hre.ethers.getSigners()

  // get the Endpoint address
  const endpointAddr = ENDPOINTS[hre.network.name]

  console.log(`>>> your address: ${deployer}`, endpointAddr)

  await deploy('ExchangeRouter', {
    from: deployer,
    args: [endpointAddr],
    log: true,
    waitConfirmations: 1
  })

  // await router.setStargatePoolManager(getContractAddrByName(hre.network.name, "StargatePoolManager"));
}

module.exports.tags = ['ExchangeRouter']
