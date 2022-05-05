import { ethers } from 'hardhat'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { BigNumber } from '@ethersproject/bignumber'
import { 
  LooksRareExchange,
  CurrencyManager,
  ExecutionManager,
  RoyaltyFeeRegistry,
  RoyaltyFeeManager,
  TransferSelectorNFT
} from '../typechain-types'
import { Contract } from 'ethers'

const hre = require('hardhat')
chai.use(solidity)
const { expect } = chai

const toWei = (amount: number | string): BigNumber => {
  return ethers.utils.parseEther(amount.toString())
}

const deployedContract = async (name: string, owner: any, initParams: Array<any>): Promise<Contract> => {
  const factory = await ethers.getContractFactory(name, owner)
  const contract = await factory.deploy(...initParams)
  return contract.deployed();
}

const STRATEGY_PROTOCAL_FEE = 200;  // 2%
const ROYALTY_FEE_LIMIT = 500;      // 5%

describe('LooksRareExchange', () => {
  let looksRareExchange: LooksRareExchange
  let currencyManager: CurrencyManager
  let executionManager: ExecutionManager
  let transferSelector: TransferSelectorNFT
  let royaltyFeeManager: RoyaltyFeeManager
  let owner: any

  before(async () => {
    const [owner_,] = await ethers.getSigners()
    owner = owner_;
    
    // currency manager
    currencyManager = await deployedContract('CurrencyManager', owner, []) as CurrencyManager

    // execution manager with strategy. protocal fee 200 = 2%
    const strategy = await deployedContract('StrategyPrivateSale', owner, [STRATEGY_PROTOCAL_FEE])
    executionManager = await deployedContract('ExecutionManager', owner, []) as ExecutionManager
    await executionManager.addStrategy(strategy.address);

    // royalty fee manager
    const royaltyFeeRegistry = await deployedContract('RoyaltyFeeRegistry', owner, [ROYALTY_FEE_LIMIT])
    royaltyFeeManager = await deployedContract('RoyaltyFeeManager', owner, [royaltyFeeRegistry.address]) as RoyaltyFeeManager
    
    // looks rare exchange
    looksRareExchange = await deployedContract('LooksRareExchange', owner, [
      currencyManager.address,
      executionManager.address,
      royaltyFeeManager.address,
      ethers.constants.AddressZero,
      owner.address
    ]) as LooksRareExchange

    // transfer selector
    const transferManager721 = await deployedContract('TransferManagerERC721', owner, [looksRareExchange.address])
    const transferManager1155 = await deployedContract('TransferManagerERC1155', owner, [looksRareExchange.address])
    transferSelector = await deployedContract('TransferSelectorNFT', owner, [transferManager721.address, transferManager1155.address]) as TransferSelectorNFT
    
  })

  describe('Exchange Process', () => {
    it('MakerAsk /w TakerBid', async () => {
      
    })

    it('MakerBid /w TakerAsk', async () => {
      
    })
  })
})
