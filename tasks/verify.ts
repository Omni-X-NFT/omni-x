import shell from 'shelljs'
import { getDeploymentAddresses } from '../utils/readStatic'
import LZ_ENDPOINTS from '../constants/layerzeroEndpoints.json'
import GREG_ARGS from '../constants/kanpaiPandas.json'
import STABLE_COINS from '../constants/usd.json'
import { ethers } from 'ethers'

type ENDPOINT_TYPE = {
  [key: string]: string
}

const ENDPOINTS: ENDPOINT_TYPE = LZ_ENDPOINTS
const stableCoins: ENDPOINT_TYPE = STABLE_COINS

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom'],
  // testnet: ['goerli', 'bsc-testnet', 'fuji', 'mumbai', 'arbitrum-goerli', 'optimism-goerli', 'fantom-testnet']
  testnet: ['goerli']
}

export const verifyAll = async function (taskArgs: any, hre: any) {
  // const networks = environments[taskArgs.e]
  // if (!taskArgs.e || networks.length === 0) {
  //   console.log(`Invalid environment argument: ${taskArgs.e}`)
  // }

  // if (!taskArgs.tags) {
  //   console.log(`Invalid tags name: ${taskArgs.tags}`)
  // }

  // await Promise.all(
  //   networks.map(async (network: string) => {
  //     // @ts-ignore
  //     const aonftArgs = GREG_ARGS[network]
  //     const address = getDeploymentAddresses(network)[taskArgs.tags]
  //     const endpointAddr = ENDPOINTS[network]
  //     if (address) {
  //       // const checkWireUpCommand = `npx hardhat verify --network ${network} ${address} ${endpointAddr}`
  //       let checkWireUpCommand = `npx hardhat verify --network ${network} ${address} "${aonftArgs.name}" ${aonftArgs.symbol} ${endpointAddr} ${aonftArgs.startMintId} ${aonftArgs.endMintId} ${aonftArgs.maxTokensPerMint} "${aonftArgs.baseTokenURI}" "${aonftArgs.hiddenURI}"`

  //       // const checkWireUpCommand = `npx hardhat verify --network ${network} ${address} "${aonftArgs.name}" ${aonftArgs.symbol} ${endpointAddr} ${aonftArgs.startMintId} ${aonftArgs.endMintId} ${aonftArgs.maxTokensPerMint} "${aonftArgs.baseTokenURI}"`
  //       console.log(checkWireUpCommand)
  //       shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  //     }
  //   })
  // )

  return verifyKP(taskArgs, hre)
}

export const verifyKP = async (taskArgs: any, hre: any) => {
  const { ethers, run, network } = hre

  // @ts-ignore
  const aonftArgs = GREG_ARGS[network.name]
  const lzEndpoint = ENDPOINTS[network.name]
  const stableAddr = stableCoins[network.name] || ethers.constants.AddressZero

  console.log([
    aonftArgs.name,
    aonftArgs.symbol,
    lzEndpoint,
    aonftArgs.startMintId,
    aonftArgs.endMintId,
    aonftArgs.maxTokensPerMint,
    aonftArgs.baseTokenURI,
    stableAddr
])
  await run('verify:verify', {
    address: getDeploymentAddresses(network.name)['KanpaiPandas'],
    constructorArguments: [
        aonftArgs.name,
        aonftArgs.symbol,
        lzEndpoint,
        aonftArgs.startMintId,
        aonftArgs.endMintId,
        aonftArgs.maxTokensPerMint,
        aonftArgs.baseTokenURI,
        stableAddr
    ],
    contract: "contracts/token/onft/extension/KanpaiPandas.sol:KanpaiPandas"
  })
}