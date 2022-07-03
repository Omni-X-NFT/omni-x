import shell from 'shelljs'
import { getDeploymentAddresses } from '../utils/readStatic'
import LZ_ENDPOINTS from '../constants/layerzeroEndpoints.json'

type ENDPOINT_TYPE = {
  [key: string]: string
}

const ENDPOINTS: ENDPOINT_TYPE = LZ_ENDPOINTS

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom'],
  testnet: ['rinkeby', 'bsc-testnet', 'fuji', 'mumbai', 'arbitrum-rinkeby', 'optimism-kovan', 'fantom-testnet']
}

export const verifyAll = async function (taskArgs: any, hre: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }

  if (!taskArgs.tags) {
    console.log(`Invalid tags name: ${taskArgs.tags}`)
  }

  await Promise.all(
    networks.map(async (network: string) => {
      const address = getDeploymentAddresses(network)[taskArgs.tags]
      const endpointAddr = ENDPOINTS[network]
      if (address) {
        const checkWireUpCommand = `npx hardhat verify --network ${network} ${address} ${endpointAddr}`
        shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
      }
    })
  )
}
