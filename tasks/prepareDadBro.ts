
import { loadAbi, createContractByName } from './shared'
import shell from 'shelljs'
import DadBroArgs from '../constants/DadBroArgs.json'

const DadBrosAbi = loadAbi('../artifacts/contracts/token/onft/extension/DadBros.sol/DadBros.json')

const tx = async (tx1: any) => {
  await tx1.wait()
}

const environments: any = {
  mainnet: ['ethereum'],
  testnet: ['goerli']
}

export const prepareDadBro = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const args = (DadBroArgs as any)[network.name]

  const DadBros = createContractByName(hre, 'DadBros', DadBrosAbi().abi, owner)
  // await tx(await DadBros.setMerkleRoot(hre.ethers.utils.formatBytes32String("free"), args.merkleRootFree))
  await tx(await DadBros.setMerkleRoot(hre.ethers.utils.formatBytes32String("friends"), args.merkleRootFriends))
  // await tx(await DadBros.flipSaleStarted())
  // await tx(await DadBros.setBeneficiary(args.beneficiary))
  console.log(`✅ DadBros prepared on ${network.name}`)
}
