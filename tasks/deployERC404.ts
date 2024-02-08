import { BeraArtio404 } from 'typechain-types'

export const deployERC404 = async (taskArgs: any, hre: any) => {
  // deploy ERC404
  const BeraArtio404 = await hre.ethers.getContractFactory('BeraArtio404')
  // vitalik.eth as creator address
  const beraArtio404 = await BeraArtio404.deploy('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045') as BeraArtio404

  await beraArtio404.deployed()
  console.log(`beraArtio404 deployed to: ${beraArtio404.address}`)
}
