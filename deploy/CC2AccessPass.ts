import { Wallet } from 'zksync-web3'
import * as ethers from 'ethers'
import { Deployer } from '@matterlabs/hardhat-zksync-deploy'
import CC2Args from '../constants/ONFT721Args.json'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'

// load env file
import dotenv from 'dotenv'
dotenv.config()

const PRIVATE_KEY = process.env.PRIVATE_KEY || ''

export default async function (hre: any) {
  const wallet = new Wallet(PRIVATE_KEY)
  const deployer = new Deployer(hre, wallet)
  const lzEndpoint = (LZ_ENDPOINT as any).zksync

  const artifact = await deployer.loadArtifact('CC2AccessPass')
  const args = CC2Args.CC2AccessPass.zksync

  const constructorArgs = [
    args.name,
    args.symbol,
    lzEndpoint,
    args.startId,
    args.endId,
    args.baseTokenURI,
    args.beneficiary,
    args.taxRecipient,
    args.premint
  ]
  console.log(constructorArgs)
  if (args) {
    const deploymentFee = await deployer.estimateDeployFee(artifact, constructorArgs)
    const parsedFee = ethers.utils.formatEther(deploymentFee.toString())
    console.log(`The deployment is estimated to cost ${parsedFee} ETH`)
    const onft = await deployer.deploy(artifact, constructorArgs)
    const contractAddress = onft.address
    console.log(`${artifact.contractName} was deployed to ${contractAddress}`)
  }
}
