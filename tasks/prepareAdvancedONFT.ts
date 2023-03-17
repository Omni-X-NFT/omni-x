
import { loadAbi, createContractByName, toWei } from './shared'
import shell from 'shelljs'
const AdvancedONFT721Abi = loadAbi('../artifacts/contracts/token/onft/extension/AdvancedONFT721.sol/AdvancedONFT721.json')

const tx = async (tx1: any) => {
  await tx1.wait()
}

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom'],
  testnet: ['goerli', 'bsc-testnet', 'fuji', 'mumbai', 'arbitrum-goerli', 'optimism-goerli', 'fantom-testnet', 'moonbeam_testnet']
}

export const prepareAdvancedONFT = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()

  const advancedONFT721 = createContractByName(hre, 'AdvancedONFT721', AdvancedONFT721Abi().abi, owner)
  await tx(await advancedONFT721.flipPublicSaleStarted())
  await tx(await advancedONFT721.setPrice(toWei(ethers, 0.1)))
  await tx(await advancedONFT721.setMintRange(taskArgs.start, taskArgs.end, 5))
  await tx(await advancedONFT721.flipSaleStarted())
}

type StartEndMints = {
    [key: string]: [number, number]
}

const startAndEnd: StartEndMints = {
  'goerli': [0,1000],
  'bsc-testnet': [1000,2000],
  'fuji': [2000,3000],
  'mumbai': [3000,4000],
  'arbitrum-goerli': [5000,6000],
  'optimism-goerli': [4000,5000],
  'fantom-testnet': [6000,7000],
  'moonbeam_testnet': [7000,8000]

}

export const prepareAllAdvancedONFT = async function (taskArgs: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat prepareAdvancedONFT --network ${network} --start ${startAndEnd[network][0]} --end ${startAndEnd[network][1]}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}
