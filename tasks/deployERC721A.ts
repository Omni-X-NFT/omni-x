import { YieldNFT } from 'typechain-types'

export const deployERC721A = async (taskArgs: any, hre: any) => {
  // deploy YieldNFT
  const YieldNFT = await hre.ethers.getContractFactory('YieldNFT')
  const yieldNFT = await YieldNFT.deploy('0x4300000000000000000000000000000000000002') as YieldNFT

  await yieldNFT.deployed()
  console.log(`yieldNFT deployed to: ${yieldNFT.address}`)
}
