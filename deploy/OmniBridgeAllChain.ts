import hre from 'hardhat'
import { deployContract } from '../tasks/shared'
import shell from 'shelljs'

interface IEndpoints {
    [key: number]: string
}

const lzEndpoints: IEndpoints = {
  0: '0xbfD2135BFfbb0B5378b56643c2Df8a87552Bfa23', // goerli
  1: '0x6Fcb97553D41516Cb228ac03FdC8B9a0a9df04A1', // bsc
  2: '0x93f54D755A063cE7bB9e6Ac47Eccc8e33411d706', // fuji
  3: '0xf69186dfBa60DdB133E91E9A4B5673624293d8F8', // mumbai
  4: '0x6aB5Ae6822647046626e83ee6dB8187151E1d5ab', // arbitrum goerli
  5: '0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1', // optimism
  6: '0x7dcAD72640F835B0FA36EFD3D6d3ec902C7E5acf', // fantom
  7: '0xb23b28012ee92E8dE39DEb57Af31722223034747' // moonbeam
}
const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom'],
  testnet: ['goerli', 'bsc-testnet', 'fuji', 'mumbai', 'arbitrum-goerli', 'optimism-goerli', 'fantom-testnet', 'moonbeam_testnet']
}

// Developers -  just need to run: $ npx hardhat run deploy/OmniBridgeAllChain.ts --network <network>

async function main () {
  const owner = (await hre.ethers.getSigners())[0]
  console.log('Deployer is:', owner.address)
  const network = hre.network.name
  console.log('network is:', network)
  const contract = await deployContract(hre, 'OmniBridge', owner, [lzEndpoints[environments.testnet.indexOf(network)]])
  console.log('OmniBridge deployed to:', contract.address, 'on', network)

  shell.exec('npx hardhat verify --network ' + network + ' --contract ' + 'contracts/OmniBridge.sol:OmniBridge ' + contract.address + ' ' + `${lzEndpoints[environments.testnet.indexOf(network)]}`).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
