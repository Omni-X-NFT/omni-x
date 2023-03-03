// import shell from 'shelljs'
// import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
// import { deployContract } from './shared'
// // import omniElementArgs from '../constants/omniElementArgs.json'
// import STABLE_COINS from '../constants/usd.json'

// type CHAINTYPE = {
//     [key: string]: string
//   }

// const stableCoins: CHAINTYPE = STABLE_COINS

// const environments: any = {
//   mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom'],
//   testnet: ['goerli', 'bsc-testnet', 'fuji', 'mumbai', 'arbitrum-goerli', 'optimism-goerli', 'fantom-testnet', 'moonbeam_testnet']
// }

// export const deployAdvancedONFT721GaslessClaim = async function (taskArgs: any, hre: any) {
// //   const { ethers, network } = hre

// //   const [owner] = await ethers.getSigners()
// //   const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
// //   const stableAddr = stableCoins[hre.network.name] || ethers.constants.AddressZero

// //   const args = (omniElementArgs as any)[network.name]

// //  const advancedONFT721GaslessClaim = await deployContract(hre, 'AdvancedONFT721GaslessClaim', owner, [
// //     args.name,
// //     args.symbol,
// //     lzEndpoint,
// //     args.startMintId,
// //     args.endMintId,
// //     args.maxTokensPerMint,
// //     args.baseTokenURI,
// //     args.hiddenURI,
// //     stableAddr,
// //     args.tax,
// //     args.taxRecipeint
// //   ])
// }

// export const deployAllAdvancedONFT721GaslessClaim = async function (taskArgs: any) {
//   const networks = environments[taskArgs.e]
//   if (!taskArgs.e || networks.length === 0) {
//     console.log(`Invalid environment argument: ${taskArgs.e}`)
//   }
//   await Promise.all(
//     networks.map(async (network: string) => {
//       const checkWireUpCommand = `npx hardhat deployAdvancedONFT721GaslessClaim --network ${network}`
//       console.log(checkWireUpCommand)
//       shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
//     })
//   )

// }
