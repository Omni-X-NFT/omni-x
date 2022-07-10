import hre from 'hardhat'
import { getDeploymentAddresses } from '../utils/readStatic'
import LZ_ENDPOINTS from '../constants/layerzeroEndpoints.json'

type ENDPOINT_TYPE = {
    [key: string]: string
  }

const ENDPOINTS: ENDPOINT_TYPE = LZ_ENDPOINTS

async function main () {
  const address = getDeploymentAddresses(hre.network.name).OmniBridge

  const endpointAddr = ENDPOINTS[hre.network.name]
  await hre.run('verify:verify', {
    address,
    constructorArguments: [
      endpointAddr
    ],
    contract: 'contracts/OmniBridge1155.sol:OmniBridge1155'
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
