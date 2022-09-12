import { Contract } from 'ethers'
import { BigNumber } from '@ethersproject/bignumber'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import {
  TakerOrder,
  MakerOrder
} from '../utils/order-types'
import CHAIN_IDS from '../constants/chainIds.json'
import STARGATE from '../constants/stargate.json'

export const STRATEGY_PROTOCAL_FEE = 200 // 2%
export const ROYALTY_FEE_LIMIT = 500 // 5%
export const CONTRACTS = {
  rinkeby: {
    gregs: '0xC8759D18D5c96cce77074249330b9b41A618e51A',
    ghosts: '0x71d5F3d2C3D0139312AB0eF4a462140204D05A64'
  },
  'bsc-testnet': {
    gregs: '0xCB3041291724B893E8BB3E876aC8f250D475685D',
    ghosts: '0x92a6d889d9E481d149e4C96074db05Fa025e7efe'
  },
  fuji: {
    gregs: '',
    ghosts: '0x6828C4F8564Bf71d82e901E346450eECc997D397'
  }
}

export const deployContract = async (hre: any, name: string, owner: any, initParams: Array<any>): Promise<Contract> => {
  const { ethers, network } = hre
  const factory = await ethers.getContractFactory(name, owner)
  const contract = await factory.deploy(...initParams)
  const deployed = await contract.deployed()
  console.log(`deployed ${name} to `, deployed.address)

  const folderName = network.name
  const folderPath = path.resolve(__dirname, `../deployments/${folderName}`)
  if (!existsSync(folderPath)) {
    mkdirSync(folderPath)
  }
  writeFileSync(`${folderPath}/${name}.json`, JSON.stringify({
    address: deployed.address
  }), {
    encoding: 'utf8',
    flag: 'w'
  })

  return deployed
}

export const createContract = (ethers: any, addr: string, abi: any, owner: any): Contract => {
  const contract = new ethers.Contract(addr, abi, owner)
  return contract
}

export const createContractByName = (hre: any, name: string, abi: any, owner: any): Contract => {
  const { ethers, network } = hre

  const addr = getContractAddrByName(network.name, name)
  const contract = new ethers.Contract(addr, abi, owner)
  return contract
}

export const getContractAddrByName = (network: string, name: string): string => {
  const folderName = network
  const filePath = path.resolve(__dirname, `../deployments/${folderName}/${name}.json`)
  if (existsSync(filePath)) {
    const contractInfo = JSON.parse(readFileSync(filePath).toString())
    return contractInfo.address
  }

  if (name === 'USDC' || name === 'USDT') {
    const stargate = STARGATE as any
    return stargate[network]?.usdc || stargate[network]?.usdt
  }
  return (CONTRACTS as any)[folderName][name]
}

export const getChainId = (network: string): number => {
  const chainIds = CHAIN_IDS as any
  return chainIds[network]
}

export const getPoolId = (network: string): number => {
  const stargate = STARGATE as any
  return stargate[network]?.poolId
}

export const toWei = (ethers: any, amount: number | string): BigNumber => {
  return ethers.utils.parseEther(amount.toString())
}

export const getBlockTime = async (ethers: any) : Promise<number> => {
  const blockNumBefore = await ethers.provider.getBlockNumber()
  const blockBefore = await ethers.provider.getBlock(blockNumBefore)
  const timestampBefore = blockBefore.timestamp
  return timestampBefore as number
}

export const fillMakerOrder = async (
  makeOrder : MakerOrder,
  tokenId: number,
  currency: string,
  collection: string,
  strategy: string,
  maker: string,
  startTime: number,
  price: BigNumber,
  nonce: number
) => {
  makeOrder.tokenId = tokenId
  makeOrder.currency = currency
  makeOrder.price = price
  makeOrder.amount = 1
  makeOrder.collection = collection
  makeOrder.strategy = strategy
  makeOrder.nonce = nonce
  makeOrder.startTime = startTime
  makeOrder.endTime = makeOrder.startTime + 3600 * 30
  makeOrder.minPercentageToAsk = 900
  makeOrder.signer = maker
}
export const fillTakerOrder = (
  takerOrder : TakerOrder,
  taker: string,
  tokenId: number,
  price: BigNumber
) => {
  takerOrder.tokenId = tokenId
  takerOrder.price = price
  takerOrder.minPercentageToAsk = 900
  takerOrder.taker = taker
}

export const loadAbi = (file: string) => {
  return () => {
    const filePath = path.resolve(__dirname, `${file}`)
    if (existsSync(filePath)) {
      const abi = JSON.parse(readFileSync(filePath).toString())
      return abi
    }
  
    throw new Error(`file not exists ${file}`)
  }
}

export const waitFor = (ms: number) => {
  return new Promise(resolve => {
    setTimeout(() => resolve(0), ms)
  })
}
