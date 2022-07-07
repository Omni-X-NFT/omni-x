import shell from 'shelljs'
import { getContractAddrByName } from './shared'
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

export const verifyOmni = async () => {
  // @ts-ignore
  // eslint-disable-next-line
  const { run, network } = hre
  const lzEndpoint = ENDPOINTS[network.name]
  // const [owner] = await ethers.getSigners()

  await run('verify:verify', {
    address: getContractAddrByName(network.name, 'TransferManagerGhosts'),
    constructorArguments: [
      getContractAddrByName(network.name, 'OmniXExchange'), lzEndpoint
    ]
  })

  // await run('verify:verify', {
  //     address: getContractAddrByName(network.name, 'OmniXExchange'),
  //     constructorArguments: [
  //         getContractAddrByName(network.name, 'CurrencyManager'),
  //         getContractAddrByName(network.name, 'ExecutionManager'),
  //         getContractAddrByName(network.name, 'RoyaltyFeeManager'),
  //         ethers.constants.AddressZero,
  //         owner.address
  //     ],
  //     contract: "contracts/core/OmniXExchange.sol:OmniXExchange"
  // })

  // await run('verify:verify', {
  //   address: getContractAddrByName(network.name, 'Router'),
  //   constructorArguments: []
  // })
}
