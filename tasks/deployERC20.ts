import { BingBongToken } from 'typechain-types'

export const deployERC20 = async (taskArgs: any, hre: any) => {
  // deploy BingBong Token
  const BingBongToken = await hre.ethers.getContractFactory('BingBongToken')
  const bingBongToken = await BingBongToken.deploy('New Shiny Token', 'NST', 1000000000000000) as BingBongToken

  await bingBongToken.deployed()
  console.log(`BingBongToken deployed to: ${bingBongToken.address}`)
}
