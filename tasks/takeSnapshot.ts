import Moralis from "moralis";
import { EvmChain } from '@moralisweb3/common-evm-utils';
import { loadAbi, getContractAddrByName } from '../tasks/shared'
import fs from 'fs';


type Owners = {
  [key: string]: any
}
const getHolders = async (network: string, owners: Owners) => {
  const contractAddress = getContractAddrByName(network, 'AdvancedONFT721Enumerable')

  let firstResponse: any = await Moralis.EvmApi.nft.getNFTOwners({
    address: contractAddress,
    chain: EvmChain.ARBITRUM,
    limit: 100
  })
  firstResponse = firstResponse.toJSON()

  let dataCursor = firstResponse.cursor

  do {
    let response: any = await Moralis.EvmApi.nft.getNFTOwners({
      address: contractAddress,
      chain: EvmChain.ARBITRUM,
      disableTotal: false,
      limit: 100,
      cursor: dataCursor
    })
    response = response.toJSON()
    for (const owner of response.result) {
      if (owners[owner.owner_of] !== undefined) {
        owners[owner.owner_of].amount += 1
      } else {
        owners[owner.owner_of] = {
          amount: 1
        }
      } 
    }
    dataCursor = response.cursor
  } while (dataCursor !== null && dataCursor !== '')
}

export const Snapshot = async function (taskargs: any, hre: any) {
  const { ethers, network } = hre
  await Moralis.start({
    apiKey: process.env.MORALIS
    // ...and any other configuration
  })
  const owners: Owners = []


    try {
    (await getHolders(network.namee, owners))
    } catch (e) {
    console.log(e)
    }
  console.log(owners)
  console.log(Object.values(owners).reduce((a: any, b: any) => a + b.amount, 0))

  const snapshotData = []
  for (const owner in owners) {
    snapshotData.push({
      address: owner,
      count: owners[owner].amount
    })
  }
  console.log(snapshotData)
//   fs.writeFile('constants/snapshot.json', JSON.stringify(snapshotData), (err) => {
//     if (err) {
//       console.log(err)
//     } else {
//       console.log('successfully written to constants/snapshot.json')
//     }
//   })
}