// import { YieldNFT } from 'typechain-types'

// export const deployERC721A = async (taskArgs: any, hre: any) => {
//   // deploy YieldNFT
//   const YieldNFT = await hre.ethers.getContractFactory('YieldNFT')
//   const yieldNFT = await YieldNFT.deploy('0x4300000000000000000000000000000000000002') as YieldNFT

//   await yieldNFT.deployed()
//   console.log(`yieldNFT deployed to: ${yieldNFT.address}`)
// }

import { YieldAndGasNFT } from 'typechain-types'

export const deployERC721A = async (taskArgs: any, hre: any) => {
  // deploy YieldNFT
  const YieldAndGasNFT = await hre.ethers.getContractFactory('YieldAndGasNFT')
  // vitalik.eth as creator address
  const yieldNFT = await YieldAndGasNFT.deploy('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045') as YieldAndGasNFT

  await yieldNFT.deployed()
  console.log(`yieldNFT deployed to: ${yieldNFT.address}`)
}
