
import { loadAbi, createContractByName } from './shared'
import shell from 'shelljs'
import omniElementArgs from '../constants/omniElementMainnetArgs.json'

const AdvancedONFT721GaslessAbi = loadAbi('../artifacts/contracts/token/onft/extension/AdvancedONFT721Gasless.sol/AdvancedONFT721Gasless.json')

const tx = async (tx1: any) => {
  await tx1.wait()
}

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'polygon', 'moonbeam', 'arbitrum'],
  testnet: ['optimism-goerli']
  // testnet: ['arbitrum-goerli', 'optimism-goerli', 'fantom-testnet']
}

export const prepareAdvancedONFTGasless = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const args = (omniElementArgs as any)[network.name]

  const advancedONFT721Gasless = createContractByName(hre, 'AdvancedONFT721Gasless', AdvancedONFT721GaslessAbi().abi, owner)
  // await tx(await advancedONFT721Gasless.flipRevealed())
  await tx(await advancedONFT721Gasless.setBaseURI('https://scarlet-manual-bird-387.mypinata.cloud/ipfs/QmQ25h32jXdWw7zXnje9hArhQySP146Nemhvbqxge4m4oj/'), {gasPrice: 30000 })
  // await tx(await advancedONFT721Gasless.setPrice(args.price))
  // await tx(await advancedONFT721Gasless.flipPublicSaleStarted())
  // if (network.name === 'ethereum' || network.name === 'bsc' || network.name === 'polygon' || network.name === 'moonbeam') {
  //   await tx(await advancedONFT721Gasless.setMerkleRoot(args.merkleRoot))
  // }
  // await tx(await advancedONFT721Gasless.setHiddenMetadataUri(args.hiddenURI))
  // await tx(await advancedONFT721Gasless.setBaseURI(args.baseTokenURI))

  // await tx(await advancedONFT721Gasless.flipPublicSaleStarted())
  // await tx(await advancedONFT721Gasless.setPrice(args.price))
  // await tx(await advancedONFT721Gasless.flipSaleStarted())
  // if (network.name === 'arbitrum') {
  //   await tx(await advancedONFT721Gasless.setMerkleRoot(args.merkleRoot))
  // }
  // if (network.name === 'ethereum') {
  //   await tx(await advancedONFT721Gasless.flipLinearPriceIncreaseActive())
  // }
}

export const prepareAllAdvancedONFTGasless = async function (taskArgs: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat prepareAdvancedONFTGasless --network ${network}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}
