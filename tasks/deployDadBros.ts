import shell from 'shelljs'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import { deployContract } from './shared'

import DadBroArgs from '../constants/DadBroArgs.json'

const environments: any = {
  mainnet: ['ethereum'],
  testnet: ['goerli']
}

export const deployDadBro = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre

  const [owner] = await ethers.getSigners()
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
  
  const args = (DadBroArgs as any)[network.name]


  const DadBro = await deployContract(hre, 'DadBros', owner, [
    args.name,
    args.symbol,
    lzEndpoint,
    args.baseTokenURI,
    args.hiddenURI,
    args.tax,
    args.taxRecipient
  ])
}

export const deployAllDadBros = async function (taskArgs: any) {
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
