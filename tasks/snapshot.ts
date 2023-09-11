import Moralis from 'moralis'
import { EvmChain } from '@moralisweb3/common-evm-utils'
import { loadAbi, getContractAddrByName, environments } from './shared'
import snapshotArgs from '../constants/snapshotArgs.json'
import { Network, Alchemy } from 'alchemy-sdk'
import fs from 'fs'
import shell from 'shelljs'
import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256'
import path from 'path'
import util from 'util'
import snapshotData from '../constants/cyberConnectWL_list.json'
import { loadAbi, createContractByName, deployContract, environments, submitTx, submitReturnTx } from './shared'

const AdvancedONFT721AAbi = loadAbi(
  '../artifacts/contracts/token/onft721A/extension/collections/OmniFlowers.sol/OmniFlowers.json'
)
// const LZEndpointAbi = loadAbi('../artifacts/contracts/layerzero/LZEndpoint.sol/LZEndpoint.json')

function getContract(collection: string, owner: any, hre: any, network: string): any {
  let onft721A
  if (network === 'zksync' || network === 'zksync-testnet') {
    const path = `../artifacts-zk/contracts/token/onft721A/extension/collections/${collection}.sol/${collection}.json`
    if (!fs.existsSync(path)) {
      console.log('zk aritfact not found please run npx hardhat compile --network zksync')
      return
    }
    const ContractArtifact = require(path)
    onft721A = createContractByName(hre, collection, ContractArtifact.abi, owner)
  } else {
    // onft721A = createContractByName(hre, 'OmnichainAdventures', ContractArtifact.abi, owner)
    onft721A = createContractByName(hre, collection, AdvancedONFT721AAbi().abi, owner)
  }

  return onft721A
}

export const moralisSnap = async (taskArgs: any, hre: any) => {
  const { network } = hre
  const owners: any = {}
  const contractAddress = (snapshotArgs as any)[taskArgs.target][network.name]

  await Moralis.start({
    apiKey: process.env.MORALIS
    // ...and any other configuration
  })

  try {
    let dataCursor: string | undefined
    do {
      const response = await getMoralisResponse(network.name, contractAddress, dataCursor)
      for (const owner of response.result) {
        const addr = owner.owner_of.toLowerCase()
        if (owners[addr] !== undefined) {
          owners[addr] += 1
        } else {
          owners[addr] = 1
        }
      }
      dataCursor = response.cursor
      console.log('page complete')
      await sleep(1000)
    } while (dataCursor !== null && dataCursor !== '')

    const data = await fs.promises.readFile(`constants/${taskArgs.file}.json`, 'utf8')
    const jsonData = JSON.parse(data)
    for (const item in owners) {
      const addr = item.toLowerCase()
      if (jsonData[addr] !== undefined) {
        jsonData[addr] += owners[addr]
      } else {
        jsonData[addr] = owners[addr]
      }
    }

    if (Object.keys(jsonData).length > 0) {
      // Convert the array back to JSON format
      await fs.promises.writeFile(`constants/${taskArgs.file}.json`, JSON.stringify(jsonData, null, 2))
    }

    console.log('✅ Snapshot saved')
    console.log(Object.values(jsonData).reduce((a: any, b: any) => a + b, 0))
  } catch (e) {
    console.log(e)
  }
}

export const alchemySnap = async (taskArgs: any, hre: any) => {
  const { network } = hre
  const contractAddress = (snapshotArgs as any)[taskArgs.target][network.name]

  const settings = {
    apiKey: process.env.ALCHEMY_OP, // Replace with your Alchemy API Key.
    network: Network.OPT_MAINNET // Replace with your network.
  }

  const alchemy = new Alchemy(settings)

  try {
    const ownersArray: any = await alchemy.nft.getOwnersForContract(contractAddress)
    const owners = ownersArray.owners
    const data = await fs.promises.readFile(`constants/${taskArgs.file}.json`, 'utf8')
    const jsonData = JSON.parse(data)

    for (const item of owners) {
      const addr = item.toLowerCase()
      if (jsonData[addr] !== undefined) {
        jsonData[addr] += 1
      } else {
        jsonData[addr] = 1
      }
    }
    if (Object.keys(jsonData).length > 0) {
      // Convert the array back to JSON format
      await fs.promises.writeFile(`constants/${taskArgs.file}.json`, JSON.stringify(jsonData, null, 2))
    }
    console.log('✅ Snapshot saved')
    console.log(Object.values(jsonData).reduce((a: any, b: any) => a + b, 0))
  } catch (e) {
    console.log(e)
  }
}
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getMoralisResponse(network: string, contractAddress: string, cursor: string | undefined) {
  let response: any
  if (network === 'polygon') {
    response = await Moralis.EvmApi.nft.getNFTOwners({
      address: contractAddress,
      chain: EvmChain.POLYGON,
      disableTotal: false,
      limit: 100,
      cursor
    })
  } else if (network === 'bsc') {
    response = await Moralis.EvmApi.nft.getNFTOwners({
      address: contractAddress,
      chain: EvmChain.BSC,
      disableTotal: false,
      limit: 100,
      cursor
    })
  } else if (network === 'ethereum') {
    response = await Moralis.EvmApi.nft.getNFTOwners({
      address: contractAddress,
      chain: EvmChain.ETHEREUM,
      disableTotal: false,
      limit: 100,
      cursor
    })
  } else if (network === 'fantom') {
    response = await Moralis.EvmApi.nft.getNFTOwners({
      address: contractAddress,
      chain: EvmChain.FANTOM,
      disableTotal: false,
      limit: 100,
      cursor
    })
  } else if (network === 'arbitrum') {
    response = await Moralis.EvmApi.nft.getNFTOwners({
      address: contractAddress,
      chain: EvmChain.ARBITRUM,
      disableTotal: false,
      limit: 100,
      cursor
    })
  } else if (network === 'avalanche') {
    response = await Moralis.EvmApi.nft.getNFTOwners({
      address: contractAddress,
      chain: EvmChain.AVALANCHE,
      disableTotal: false,
      limit: 100,
      cursor
    })
  } else {
    throw new Error('Unsupported network')
  }
  response = response.toJSON()
  return response
}

export const completeSnapshot = async (taskArgs: any, hre: any) => {
  let networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  if (taskArgs.exclude !== 'none') {
    const exclude = taskArgs.exclude.split(',')
    networks = networks.filter((n: string) => !exclude.includes(n))
  }
  await Promise.all(
    networks.map(async (network: string) => {
      if (network === 'optimism') {
        const checkWireUpCommand = `npx hardhat alchemySnap --network ${network} --file ${taskArgs.file} --target ${taskArgs.target}`
        console.log(checkWireUpCommand)
        shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
      } else {
        const checkWireUpCommand = `npx hardhat moralisSnap --network ${network} --file ${taskArgs.file} --target ${taskArgs.target}`
        console.log(checkWireUpCommand)
        shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
      }
    })
  )
}

export const convertToList = async (taskArgs: any, hre: any) => {
  // Read the JSON file
  const data = await fs.promises.readFile(`constants/${taskArgs.file}.json`, 'utf8')
  const jsonData = JSON.parse(data)

  // Get an array of all keys (addresses)
  const addressList = Object.keys(jsonData)

  // Write the array to a new file
  await fs.promises.writeFile(`constants/${taskArgs.file}_list.json`, JSON.stringify(addressList, null, 2))

  console.log('✅ List created')
}

export const removeDups = async (taskArgs: any, hre: any) => {
  const data = await fs.promises.readFile(`constants/${taskArgs.file}_list.json`, 'utf8')
  const jsonData = JSON.parse(data)

  const finalList: any[] = []
  for (const item in jsonData) {
    if (!finalList.includes(item)) {
      finalList.push(item)
    }
  }

  await fs.promises.writeFile(`constants/${taskArgs.file}_list.json`, JSON.stringify(finalList, null, 2))
  console.log('✅ List created')
}

export const MerkleGen = async function (taskArgs: any, hre: any) {
  const { ethers } = hre
  const leaves = (snapshotData as any).map((x: any) => keccak256(ethers.utils.solidityPack(['address'], [x])))
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
  const root = tree.getHexRoot()
  console.log('Merkle Root:', root.toString())
  const leaf = keccak256(ethers.utils.solidityPack(['address'], [taskArgs.adr]))
  const proof = tree.getHexProof(leaf)
  console.log('Proof:', proof)
}

const flowersList = [
  'Allium',
  'Bell flower',
  'Bloom corpse',
  'Hydrangea',
  'Jade vine',
  'Middlemist red',
  'Parrot flower',
  'Tulip',
  'Cherry blossoms',
  'Dahlia',
  'Dicentra splendens',
  'Lotos',
  'Venus Flytrap',
  'Koi Flower',
  'Moon Flower'
]

export const getFlowers = async (taskArgs: any, hre: any) => {
  const matchingFiles: number[] = []
  const { ethers, network } = hre

  const [owner] = await ethers.getSigners()
  const onft721A = getContract('OmniFlowers', owner, hre, network.name)

  for (let i = 1; i <= 5000; i++) {
    const filePath = path.join('constants/flowersMetadata', `${i}.json`)
    try {
      const data = await fs.promises.readFile(filePath, 'utf8')
      const json = JSON.parse(data)

      if (json.attributes) {
        for (const attribute of json.attributes) {
          if (attribute.trait_type === 'Flower' && flowersList.includes(attribute.value)) {
            matchingFiles.push(i)
            break
          }
        }
      }
    } catch (err) {
      console.error(`Error reading file ${filePath}: ${err}`)
    }
  }
  console.log(matchingFiles.slice(-50))
  console.log(matchingFiles.length)
  const jsonOwners = await fs.promises.readFile('constants/BouqetMapping.json', 'utf8')
  const owners: any = JSON.parse(jsonOwners)
  for (const file of matchingFiles) {
    try {
      const data = await onft721A.ownerOf(file)
      if (
        data &&
        data !== ethers.constants.AddressZero &&
        data !== '0x7E505Da275223B1bcFCCd3808DB70aE4FeFA274e' &&
        data !== '0x10aB7ef6e83B28e3b85eca453701C89eb21DE7F8'
      ) {
        if (owners[data] !== undefined) {
          owners[data] += 1
        } else {
          owners[data] = 1
        }
      }
    } catch (err) {
      console.error(`Error reading file ${file}: ${err}`)
    }
  }

  await fs.promises.writeFile('constants/BouqetMapping.json', JSON.stringify(owners, null, 2))

  console.log(owners)
}
