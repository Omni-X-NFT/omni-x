import shell from 'shelljs'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import { deployContract } from './shared'

import omniElementArgs from '../constants/omniElementMainnetArgs.json'

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom', 'moonbeam', 'metis'],
  testnet: ['goerli', 'bsc-testnet', 'mumbai', 'arbitrum-goerli', 'moonbeam_testnet', 'fantom-testnet', 'optimism-goerli', 'fuji']
}

export const deployAdvancedONFT721Gasless = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre

  const [owner] = await ethers.getSigners()
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
  
  const args = (omniElementArgs as any)[network.name]


  const advancedONFT721Gasless = await deployContract(hre, 'AdvancedONFT721Gasless', owner, [
    args.name,
    args.symbol,
    lzEndpoint,
    args.startMintId,
    args.endMintId,
    args.maxTokensPerMint,
    args.baseTokenURI,
    args.hiddenURI,
    args.stableCoin,
    args.tax,
    args.taxRecipient
  ])
}

export const deployAllAdvancedONFT721Gasless = async function (taskArgs: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat deployAdvancedONFT721Gasless --network ${network}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )

}
