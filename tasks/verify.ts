import shell from 'shelljs'
import { getContractAddrByName, toWei } from './shared'
import { getDeploymentAddresses } from '../utils/readStatic'
import LZ_ENDPOINTS from '../constants/layerzeroEndpoints.json'
import STARGATE from '../constants/stargate.json'

type ENDPOINT_TYPE = {
  [key: string]: string
}

const ENDPOINTS: ENDPOINT_TYPE = LZ_ENDPOINTS

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'fantom'],
  // testnet: ['fuji', 'mumbai', 'bsc-testnet', 'goerli', 'arbitrum-goerli', 'optimism-goerli']
  testnet: ['goerli', 'arbitrum-goerli', 'mumbai']
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
  const { ethers, run, network } = hre
  const [owner] = await ethers.getSigners()
  
  const lzEndpoint = ENDPOINTS[network.name]

  // await run('verify:verify', {
  //   address: getContractAddrByName(network.name, 'OmniXExchange'),
  //   constructorArguments: [
  //       getContractAddrByName(network.name, 'CurrencyManager'),
  //       getContractAddrByName(network.name, 'ExecutionManager'),
  //       getContractAddrByName(network.name, 'RoyaltyFeeManager'),
  //       getContractAddrByName(network.name, 'SGETH') || ethers.constants.AddressZero,
  //       owner.address,
  //       lzEndpoint
  //   ],
  //   contract: "contracts/core/OmniXExchange.sol:OmniXExchange"
  // })

  // await run('verify:verify', {
  //   address: getContractAddrByName(network.name, 'FundManager'),
  //   constructorArguments: [
  //       getContractAddrByName(network.name, 'OmniXExchange')
  //   ],
  //   contract: "contracts/core/FundManager.sol:FundManager"
  // })

  // const stargateEndpoint = (STARGATE as any)[network.name]
  // await run('verify:verify', {
  //   address: getContractAddrByName(network.name, 'StargatePoolManager'),
  //   constructorArguments: [stargateEndpoint.router],
  //   contract: "contracts/core/StargatePoolManager.sol:StargatePoolManager"
  // })

  await run('verify:verify', {
    address: getContractAddrByName(network.name, 'StrategyStargateSale'),
    constructorArguments: []
  })

  await run('verify:verify', {
    address: getContractAddrByName(network.name, 'StrategyStargateSaleForCollection'),
    constructorArguments: []
  })
}
