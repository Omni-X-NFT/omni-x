
import { loadAbi, getContractAddrByName } from '../tasks/shared'
import Moralis from "moralis";

import { EvmChain } from "@moralisweb3/common-evm-utils";

import { MerkleTree } from 'merkletreejs'
import crypto from 'crypto'
import keccak256 from 'keccak256'
import snapshotData from '../constants/greg_holders_snapshot_final.json'



const fs = require('fs')

const environments: any = {
  mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom'],
  testnet: ['goerli', 'bsc-testnet', 'mumbai', 'arbitrum-goerli', 'moonbeam_testnet', 'fantom-testnet', 'optimism-goerli', 'fuji']
}


const ContractAbi = loadAbi('../artifacts/contracts/token/onft/extension/AdvancedONFT721Enumerable.sol/AdvancedONFT721.json')


// type IKeys = {
//   [key: string]: any
// }

// type Owners = {
//   [key: string]: any
// }

// const alchemyKeys: IKeys = {
//   ethereum: process.env.ALCHEMY_ETH,
//  // optimism: process.env.ALCHEMY_OP,
//   arbitrum: process.env.ALCHEMY_ARB
//   //polygon: process.env.ALCHEMY_MATIC
// }
// const networks:IKeys = {
//   ethereum: EvmChain.ETHEREUM,
//   arbitrum: EvmChain.ARBITRUM,
//   polygon: EvmChain.POLYGON,
//   bsc: EvmChain.BSC,
//   avalanche: EvmChain.AVALANCHE,
//   fantom: EvmChain.FANTOM
// }


// const getHolders = async (network: string, owners: Owners) => {
//   const contractAddress = getContractAddrByName(network, 'AdvancedONFT721Enumerable')


  


//   let firstResponse: any = await Moralis.EvmApi.nft.getNFTOwners({
//     address: contractAddress,
//     chain: networks[network],
//     limit: 100
//   })
//   firstResponse = firstResponse.toJSON()

//   let dataCursor = firstResponse.cursor

//   do {

//     let response: any = await Moralis.EvmApi.nft.getNFTOwners({
//       address: contractAddress,
//       chain: networks[network],
//       disableTotal: false,
//       limit: 100,
//       cursor: dataCursor
//     })
//     response = response.toJSON()
//     for (const owner of response.result) {
//       if (owners[owner.owner_of] !== undefined) {
//         owners[owner.owner_of].amount += 1
//       } else {
//       owners[owner.owner_of] = {
//         amount: 1
//       }
//     }
      
//     }
//     dataCursor = response.cursor
//   } while (dataCursor !== null && dataCursor !== '') 

 
// }

// export const Snapshot = async function (taskargs: any, hre: any) {
//   const { ethers, network } = hre
//   const networks = environments['mainnet']
//   await Moralis.start({
//     apiKey: process.env.MORALIS
//     // ...and any other configuration
//   })
//   const owners: Owners = {}

//   await Promise.all(
//     networks.map(async (networkName: string) => {
//       try {
//         await getHolders(networkName, owners)
//       } catch (e) {
//         console.log(e)
//       }
//     })
//   )
//   console.log(owners)
//   console.log(Object.values(owners).reduce((a: any, b: any) => a + b.amount, 0))
//   // Define a list of user addresses and corresponding amounts
//   const userList = []
//   for (const [ownerAddress, value] of Object.entries(owners)) {
//     userList.push({ address: ownerAddress, amount: value.amount })
//   }

//   const leaves = userList.map((x) =>
//     ethers.utils.solidityKeccak256(
//       ["address", "uint256"],
//       [x.address, x.amount]
//     )
//   )
//   console.log(leaves)
//   const tree = new MerkleTree(leaves, keccak256, { sort: true })

  
//   console.log('Merkle tree:', tree.toString())

// }


export const MerkleGen = async function (taskargs: any, hre: any) {
  const { ethers } = hre
  const leaves = snapshotData.map((x) => keccak256(ethers.utils.solidityPack(["address", "uint256"], [x.address, x.count])))
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
  const root = tree.getHexRoot()
  console.log('Merkle Root:', root.toString())
}

