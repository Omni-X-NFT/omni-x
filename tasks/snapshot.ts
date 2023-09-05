import Moralis from 'moralis'
import { EvmChain } from '@moralisweb3/common-evm-utils'
import { loadAbi, getContractAddrByName, environments } from './shared'
import snapshotArgs from '../constants/snapshotArgs.json'
import { Network, Alchemy } from 'alchemy-sdk'
import fs from 'fs'
import shell from 'shelljs'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

  try {
    const owners = await getAlchemyResponse(network.name, contractAddress)
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

async function getAlchemyResponse(network: string, contractAddress: string) {
  let settings: any
  if (network === 'polygon') {
    settings = {
      apiKey: process.env.ALCHEMY_MATIC, // Replace with your Alchemy API Key.
      network: Network.MATIC_MAINNET // Replace with your network.
    }
  } else if (network === 'ethereum') {
    settings = {
      apiKey: process.env.ALCHEMY_ETH, // Replace with your Alchemy API Key.
      network: Network.ETH_MAINNET // Replace with your network.
    }
  } else if (network === 'arbitrum') {
    settings = {
      apiKey: process.env.ALCHEMY_ARBITRUM, // Replace with your Alchemy API Key.
      network: Network.ARB_MAINNET // Replace with your network.
    }
  } else if (network === 'optimism') {
    settings = {
      apiKey: process.env.ALCHEMY_OPTIMISM, // Replace with your Alchemy API Key.
      network: Network.OPT_MAINNET // Replace with your network.
    }
  } else {
    throw new Error('Unsupported network')
  }
  const alchemy = new Alchemy(settings)
  console.log(contractAddress)
  const ownersArray: any = await alchemy.nft.getOwnersForContract(contractAddress)
  return ownersArray.owners
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
