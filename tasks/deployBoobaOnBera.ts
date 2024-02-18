import { BoobaOnBera } from 'typechain-types'

export const deployBoobaOnBera = async (taskArgs: any, hre: any) => {
  // deploy ERC404
  const BoobaOnBera = await hre.ethers.getContractFactory('BoobaOnBera')
  const boobaOnBera = await BoobaOnBera.deploy() as BoobaOnBera

  await boobaOnBera.deployed()
  console.log(`boobaOnBera deployed to: ${boobaOnBera.address}`)
}
