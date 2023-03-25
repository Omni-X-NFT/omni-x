import shell from 'shelljs'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import { deployContract } from './shared'
import tinyDinoArgs from '../constants/tinyDinoArgs.json'
import metroversesArgs from '../constants/metroverseArgs.json'
import founderPirateArgs from '../constants/founderPirateArgs.json'



const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom'],
  testnet: ['goerli', 'bsc-testnet', 'fuji', 'mumbai', 'arbitrum-goerli', 'optimism-goerli', 'fantom-testnet', 'moonbeam_testnet']
}


export const deployAdvancedONFT721 = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre

  const [owner] = await ethers.getSigners()
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
  const args = (founderPirateArgs as any)[network.name]

  const advancedONFT721 = await deployContract(hre, 'AdvancedONFT721', owner, [
    args.name,
    args.symbol,
    lzEndpoint,
    args.startMintId,
    args.endMintId,
    args.maxTokensPerMint,
    args.baseTokenURI,
    args.hiddenURI,
    args.tax,
    args.taxRecipient
  ])
}

export const deployAllAdvancedONFT721 = async function (taskArgs: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat deployAdvancedONFT721 --network ${network}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )

}
