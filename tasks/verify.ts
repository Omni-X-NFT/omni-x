import shell from 'shelljs'
import { getContractAddrByName, toWei } from './shared'
import { getDeploymentAddresses } from '../utils/readStatic'
import LZ_ENDPOINTS from '../constants/layerzeroEndpoints.json'

type ENDPOINT_TYPE = {
  [key: string]: string
}

const ENDPOINTS: ENDPOINT_TYPE = LZ_ENDPOINTS

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom'],
  testnet: ['rinkeby', 'bsc-testnet', 'fuji', 'mumbai', 'arbitrum-rinkeby', 'optimism-kovan', 'fantom-testnet']
}

export const verifyAll = async function (taskArgs: any, hre: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }

  if (!taskArgs.tags) {
    console.log(`Invalid tags name: ${taskArgs.tags}`)
  }

  await Promise.all(
    networks.map(async (network: string) => {
      const address = getDeploymentAddresses(network)[taskArgs.tags]
      const endpointAddr = ENDPOINTS[network]
      if (address) {
        const checkWireUpCommand = `npx hardhat verify --network ${network} ${address} ${endpointAddr}`
        shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
      }
    })
  )
}

export const verifyOmni = async () => {
  // @ts-ignore
  // eslint-disable-next-line
  const { ethers, run, network } = hre
  const [owner] = await ethers.getSigners()
  
  const lzEndpoint = ENDPOINTS[network.name]

  // await run('verify:verify', {
  //   address: getContractAddrByName(network.name, 'TransferManagerGhosts'),
  //   constructorArguments: [
  //     getContractAddrByName(network.name, 'OmniXExchange'), lzEndpoint
  //   ]
  // })

  // await run('verify:verify', {
  //   address: getContractAddrByName(network.name, 'OmniXExchange'),
  //   constructorArguments: [
  //       getContractAddrByName(network.name, 'CurrencyManager'),
  //       getContractAddrByName(network.name, 'ExecutionManager'),
  //       getContractAddrByName(network.name, 'RoyaltyFeeManager'),
  //       ethers.constants.AddressZero,
  //       owner.address,
  //       lzEndpoint
  //   ],
  //   contract: "contracts/core/OmniXExchange.sol:OmniXExchange"
  // })

  // await run('verify:verify', {
  //   address: getContractAddrByName(network.name, 'OFTMock'),
  //   constructorArguments: [
  //     'OMNI', 'OMNI', toWei(ethers, 1000), lzEndpoint
  //   ],
  //   contract: "contracts/mocks/OFTMock.sol:OFTMock"
  // })

  // await run('verify:verify', {
  //   address: getContractAddrByName(network.name, 'FundManager'),
  //   constructorArguments: [
  //       getContractAddrByName(network.name, 'OmniXExchange')
  //   ],
  //   contract: "contracts/core/FundManager.sol:FundManager"
  // })

  // await run('verify:verify', {
  //   address: getContractAddrByName(network.name, 'CurrencyManager'),
  //   constructorArguments: []
  // })

  // await run('verify:verify', {
  //   address: getContractAddrByName(network.name, 'TransferSelectorNFT'),
  //   constructorArguments: [
  //       getContractAddrByName(network.name, 'TransferManagerERC721'),
  //       getContractAddrByName(network.name, 'TransferManagerERC1155')
  //   ],
  //   contract: "contracts/core/TransferSelectorNFT.sol:TransferSelectorNFT"
  // })

  // await run('verify:verify', {
  //   address: getContractAddrByName(network.name, 'TransferManagerERC721'),
  //   constructorArguments: [
  //       getContractAddrByName(network.name, 'OmniXExchange'),
  //       lzEndpoint
  //   ],
  //   contract: "contracts/transfer/TransferManagerERC721.sol:TransferManagerERC721"
  // })

  await run('verify:verify', {
    address: getContractAddrByName(network.name, 'RoyaltyFeeManager'),
    constructorArguments: [
      getContractAddrByName(network.name, 'RoyaltyFeeRegistry')
    ]
  })

  // await run('verify:verify', {
  //   address: getContractAddrByName(network.name, 'Router'),
  //   constructorArguments: []
  // })
}
