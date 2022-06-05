import { Contract } from 'ethers'
import { BigNumber } from '@ethersproject/bignumber'

export const STRATEGY_PROTOCAL_FEE = 200 // 2%
export const ROYALTY_FEE_LIMIT = 500 // 5%
export const CONTRACTS = {
  omnixExchange: {
    rinkeby: '0x4880Bdb2D46a9159b0860d97848ed1B0cDfAf5E6',
    bsct: '0x884D90721f80F57de5FeAd59c9f50E8749ff478C'
  },
  transferSelector: {
    rinkeby: '0x578cF9AA6AEe142BABE78e8c1f2024411Ce5d325',
    bsct: '0x3C533373b3Ae78e3B0b500819f43851aBDa98949'
  },
  gregTransfer: {
    rinkeby: '0x578cF9AA6AEe142BABE78e8c1f2024411Ce5d325',
    bsct: '0x3C533373b3Ae78e3B0b500819f43851aBDa98949'
  },
  ghostTransfer: {
    rinkeby: '0xED970A27b0220458C68434F0E91894103FF00B63',
    bsct: '0x4FEE2C943Cd8747aba49C35A5320a19613817E1e'
  },
  gregs: {
    rinkeby: '0xC8759D18D5c96cce77074249330b9b41A618e51A',
    bsct: '0xCB3041291724B893E8BB3E876aC8f250D475685D'
  },
  ghosts: {
    rinkeby: '0x71d5F3d2C3D0139312AB0eF4a462140204D05A64',
    bsct: '0x4642808070a46fBA0096c37dc52a2D44BfAC4841'
  },
  erc20: {
    rinkeby: '0x4987c682F0b9aD7C15207193eBf0802E88B781D9',
    bsct: '0x1e05a5980508A244B582dE5991565a84a4Fa406b'
  },
  strategy: {
    rinkeby: '0x6ee39B7ef7F4a9A923dAA3010FC9A0B961229243',
    bsct: '0xF702373cf4a3f911965cF42b1019FAA831724261'
  },
}

export const deployContract = async (ethers: any, name: string, owner: any, initParams: Array<any>): Promise<Contract> => {
  const factory = await ethers.getContractFactory(name, owner)
  const contract = await factory.deploy(...initParams)
  const deployed = await contract.deployed()
  console.log(`deployed ${name} to `, deployed.address)
  return deployed
}

export const createContract = (ethers: any, addr: string, abi: any, owner: any): Contract => {
  const contract = new ethers.Contract(addr, abi, owner)
  return contract
}

export const toWei = (ethers: any, amount: number | string): BigNumber => {
  return ethers.utils.parseEther(amount.toString())
}

export const getBlockTime = async (ethers: any) : Promise<number> => {
  const blockNumBefore = await ethers.provider.getBlockNumber();
  const blockBefore = await ethers.provider.getBlock(blockNumBefore);
  const timestampBefore = blockBefore.timestamp;
  return timestampBefore as number
}
