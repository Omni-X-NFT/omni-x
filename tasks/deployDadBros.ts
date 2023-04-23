import shell from 'shelljs'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import { deployContract } from './shared'

import DadBroArgs from '../constants/DadBroV2Args.json'

const environments: any = {
  mainnet: ['ethereum'],
  testnet: ['goerli']
}

export const deployDadBro = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre

  const [owner] = await ethers.getSigners()
  // const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
  
  const args = (DadBroArgs as any)[network.name]


  const DadBro = await deployContract(hre, 'DadBrosV2', owner, [
    args.name,
    args.symbol,
    args.baseTokenURI,
    args.tax,
    args.taxRecipient
  ])
}
