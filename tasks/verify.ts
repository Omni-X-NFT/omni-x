import shell from 'shelljs'
import { getDeploymentAddresses } from '../utils/readStatic'
import LZ_ENDPOINTS from '../constants/layerzeroEndpoints.json'
import GREG_ARGS from '../constants/gregArgs.json'
import KANPA_ARGS from '../constants/kanpaiPandas.json'
import STABLE_COINS from '../constants/usd.json'
import { ethers } from 'ethers'

type ENDPOINT_TYPE = {
  [key: string]: string
}

const MILADY_ARGS = require('../constants/miladyXargs.js')
const ENDPOINTS: ENDPOINT_TYPE = LZ_ENDPOINTS
const stableCoins: ENDPOINT_TYPE = STABLE_COINS
const ARGS: any = {
  'KanpaiPandas': KANPA_ARGS,
  'AdvancedONFT721': GREG_ARGS,
  'Milady': MILADY_ARGS,
}
const CONTRACTS: any = {
  'AdvancedONFT721': 'contracts/token/onft/extension/AdvancedONFT721.sol:AdvancedONFT721',
  'Milady': 'contracts/token/onft/extension/Milady.sol:Milady',
}

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom'],
  // testnet: ['goerli', 'bsc-testnet', 'fuji', 'mumbai', 'arbitrum-goerli', 'optimism-goerli', 'fantom-testnet']
  testnet: ['goerli', 'bsc-testnet', 'mumbai', 'arbitrum-goerli', 'optimism-goerli', 'fantom-testnet', 'fuji']
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
      const aonftArgs = Array.isArray(ARGS[taskArgs.tags]) ? ARGS[taskArgs.tags] : ARGS[taskArgs.tags][network]
      const address = taskArgs.addr || getDeploymentAddresses(network)[taskArgs.tags]
      const endpointAddr = ENDPOINTS[network]
      const stableAddr = stableCoins[network] || ethers.constants.AddressZero
      const contractPath = CONTRACTS[taskArgs.tags]

      if (address) {
        let checkWireUpCommand = ''
        if (Array.isArray(aonftArgs)) {
          checkWireUpCommand = `npx hardhat verify --contract "${contractPath}" --network ${network} ${address} ${aonftArgs.map(a => `\"${a}\"`).join(' ')}`
        }
        else {
          checkWireUpCommand = `npx hardhat verify --contract "${contractPath}" --network ${network} ${address} "${aonftArgs.name}" ${aonftArgs.symbol} ${endpointAddr} ${aonftArgs.startMintId} ${aonftArgs.endMintId} ${aonftArgs.maxTokensPerMint} "${aonftArgs.baseTokenURI}" "${aonftArgs.hiddenURI}" ${stableAddr}`
        }

        console.log(checkWireUpCommand)
        shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
      }
    })
  )
}
