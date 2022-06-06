import { Contract } from 'ethers'
import { BigNumber } from '@ethersproject/bignumber'

export const STRATEGY_PROTOCAL_FEE = 200 // 2%
export const ROYALTY_FEE_LIMIT = 500 // 5%
export const CONTRACTS = {
  omnixExchange: {
    rinkeby: '0xAb7cF13223C0205E6D1f70A52322d072D10A798d',
    bsct: '0xf42445db4b0653c8a06EfaD2ca99bb5A2180CF95'
  },
  transferSelector: {
    rinkeby: '0xF99D77660e22032c2621A7170d99EFB69098Bca6',
    bsct: '0x383aF3dD766C173b9dCE3e2FE893CEA141e9BDE8'
  },
  gregTransfer: {
    rinkeby: '0x578cF9AA6AEe142BABE78e8c1f2024411Ce5d325',
    bsct: '0x3C533373b3Ae78e3B0b500819f43851aBDa98949'
  },
  ghostTransfer: {
    rinkeby: '0x211DBFd713886d2BdBEF0E100795B1A004f4aD53',
    bsct: '0x9D1f92d66C515112818053f16Ce4C81Ecd724F3F'
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
  oft: {
    rinkeby: '0xEaDe6619E16db9ab0a10B505Dc15606fA28A7A94',
    bsct: '0xAF3B1D8594666469288991016Ba7B5c4e44E2e99'
  },
  onft721: {
    rinkeby: '0x2F7257e95B2f3A2969C85880Ce3AE0870fDa306F',
    bsct: '0x577267C3Ff0c303151122e6a31b7d8089E7222f8'
  },
  onft1155: {
    rinkeby: '0x3Cff1472a9C33C23447997414c61b8E715e5564C',
    bsct: '0x3C4CF086436C68d3c3863fa3751aa38d54241406'
  },
  strategy: {
    rinkeby: '0x6ee39B7ef7F4a9A923dAA3010FC9A0B961229243',
    bsct: '0xF702373cf4a3f911965cF42b1019FAA831724261'
  },
  currencyManager: {
    rinkeby: '0xec73CFFbD83c878fc4f50c0Cd74A5c119289ae07',
    bsct: '0x7dEdC2f494F2e224b0EA355D2961564B955819dF'
  },
  executionManager: {
    rinkeby: '0xaDf603eABbfEF66Efb6cb8D00fc72679B21c66f5',
    bsct: '0x5599a1D261CA90b9969E443346EF2B9a664b770f'
  },
  royaltyFeeManager: {
    rinkeby: '0xED810C259D12ebE54EBAde1EbDa93850489EfcC7',
    bsct: '0x621aA79DE6B4611Dc21e5364452B23C2AdDf85ab'
  }
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
