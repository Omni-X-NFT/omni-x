import shell from 'shelljs'
import { getContractAddrByName } from './shared'
import { getDeploymentAddresses } from '../utils/readStatic'
import LZ_ENDPOINTS from '../constants/layerzeroEndpoints.json'
import STARGATE from '../constants/stargate.json'
import GREG_ARGS from '../constants/omniElementArgs.json'

type ENDPOINT_TYPE = {
  [key: string]: string
}

const ENDPOINTS: ENDPOINT_TYPE = LZ_ENDPOINTS

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom', 'moonbeam', 'metis', 'zksync', 'klaytn'],
  testnet: ['arbitrum-goerli', 'optimism-goerli', 'fantom-testnet', 'moonbeam_testnet', 'bsc-testnet', 'mumbai', 'goerli', 'fuji']
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
      // @ts-ignore
      const aonftArgs = GREG_ARGS[network]
      const address = getDeploymentAddresses(network)[taskArgs.tags]
      console.log(address)
      const endpointAddr = ENDPOINTS[network]
      if (address) {
        // const checkWireUpCommand = `npx hardhat verify --network ${network} ${address} ${endpointAddr}`
        const checkWireUpCommand = `npx hardhat verify --network ${network} ${address} "${aonftArgs.name}" "${aonftArgs.symbol}" ${endpointAddr} ${aonftArgs.startMintId} ${aonftArgs.endMintId} ${aonftArgs.maxTokensPerMint} "${aonftArgs.baseTokenURI}" "${aonftArgs.hiddenURI}" ${aonftArgs.stableCoin} ${aonftArgs.tax} ${aonftArgs.taxRecipient}`
        // const checkWireUpCommand = `npx hardhat verify --network ${network} ${address} "${aonftArgs.name}" ${aonftArgs.symbol} ${endpointAddr} ${aonftArgs.startMintId} ${aonftArgs.endMintId} ${aonftArgs.maxTokensPerMint} "${aonftArgs.baseTokenURI}"`
        console.log(checkWireUpCommand)
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

  await run('verify:verify', {
    address: getContractAddrByName(network.name, 'OmniXExchange'),
    constructorArguments: [
      getContractAddrByName(network.name, 'CurrencyManager'),
      getContractAddrByName(network.name, 'ExecutionManager'),
      getContractAddrByName(network.name, 'RoyaltyFeeManager'),
      getContractAddrByName(network.name, 'SGETH') || ethers.constants.AddressZero,
      owner.address,
      lzEndpoint
    ],
    contract: 'contracts/core/OmniXExchange.sol:OmniXExchange'
  })

  await run('verify:verify', {
    address: getContractAddrByName(network.name, 'FundManager'),
    constructorArguments: [
      getContractAddrByName(network.name, 'OmniXExchange')
    ],
    contract: 'contracts/core/FundManager.sol:FundManager'
  })

  const stargateEndpoint = (STARGATE as any)[network.name]
  await run('verify:verify', {
    address: getContractAddrByName(network.name, 'StargatePoolManager'),
    constructorArguments: [stargateEndpoint.router, getContractAddrByName(network.name, 'SGETH') || ethers.constants.AddressZero],
    contract: 'contracts/core/StargatePoolManager.sol:StargatePoolManager'
  })
}
