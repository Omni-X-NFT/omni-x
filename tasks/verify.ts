import shell from 'shelljs'
import { getDeploymentAddresses } from '../utils/readStatic'
import LZ_ENDPOINTS from '../constants/layerzeroEndpoints.json'
import GREG_ARGS from '../constants/gregArgs.json'
import KANPA_ARGS from '../constants/kanpaiPandas.json'
import MILADY_ARGS from '../constants/milady.json'
import STABLE_COINS from '../constants/usd.json'
import { ethers } from 'ethers'

type ENDPOINT_TYPE = {
  [key: string]: string
}

const ENDPOINTS: ENDPOINT_TYPE = LZ_ENDPOINTS
const stableCoins: ENDPOINT_TYPE = STABLE_COINS
const ARGS: any = {
  'KanpaiPandas': KANPA_ARGS,
  'AdvancedONFT721': GREG_ARGS,
  'Milady': MILADY_ARGS,
}
const CONTRACTS: any = {
  'KanpaiPandas': 'contracts/token/onft/extension/KanpaiPandas.sol:KanpaiPandas',
  'AdvancedONFT721': 'contracts/token/onft/extension/AdvancedONFT721.sol:AdvancedONFT721',
  'Milady': 'contracts/token/onft/extension/Milady.sol:Milady',
}

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom'],
  // testnet: ['goerli', 'bsc-testnet', 'fuji', 'mumbai', 'arbitrum-goerli', 'optimism-goerli', 'fantom-testnet']
  testnet: ['bsc-testnet', 'fuji', 'mumbai', 'arbitrum-goerli', 'optimism-goerli', 'fantom-testnet']
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
      const aonftArgs = ARGS[taskArgs.tags][network]
      const address = getDeploymentAddresses(network)[taskArgs.tags]
      const endpointAddr = ENDPOINTS[network]
      const stableAddr = stableCoins[network] || ethers.constants.AddressZero
      const contractPath = CONTRACTS[taskArgs.tags]

      if (address) {
        // const checkWireUpCommand = `npx hardhat verify --network ${network} ${address} ${endpointAddr}`
        let checkWireUpCommand = `npx hardhat verify --contract "${contractPath}" --network ${network} ${address} "${aonftArgs.name}" ${aonftArgs.symbol} ${endpointAddr} ${aonftArgs.startMintId} ${aonftArgs.endMintId} ${aonftArgs.maxTokensPerMint} "${aonftArgs.baseTokenURI}" "${aonftArgs.hiddenURI}" ${stableAddr}`

        if (taskArgs.tags === 'KanpaiPandas') {
          checkWireUpCommand = `npx hardhat verify --contract "${contractPath}" --network ${network} ${address} "${aonftArgs.name}" ${aonftArgs.symbol} ${endpointAddr} ${aonftArgs.startMintId} ${aonftArgs.endMintId} ${aonftArgs.maxTokensPerMint} "${aonftArgs.baseTokenURI}"`
        }

        console.log(checkWireUpCommand)
        shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
      }
    })
  )
}
