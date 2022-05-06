import { ethers } from "hardhat"
import chai from "chai"
import { solidity } from "ethereum-waffle"
import { 
  LooksRareExchange,
  CurrencyManager,
  ExecutionManager,
  RoyaltyFeeManager,
  TransferSelectorNFT
} from "../typechain-types"
import {
  deployContract, now
} from "../utils/test-utils";
import {
  TakerOrder,
  MakerOrder
} from "../utils/order-types";

chai.use(solidity)
const { expect } = chai

const STRATEGY_PROTOCAL_FEE = 200;  // 2%
const ROYALTY_FEE_LIMIT = 500;      // 5%

describe('LooksRareExchange', () => {
  let looksRareExchange: LooksRareExchange
  let currencyManager: CurrencyManager
  let executionManager: ExecutionManager
  let transferSelector: TransferSelectorNFT
  let royaltyFeeManager: RoyaltyFeeManager
  let owner: any
  let maker: any;
  let taker: any;

  before(async () => {
    [owner, maker, taker] = await ethers.getSigners()
    
    // currency manager
    currencyManager = await deployContract('CurrencyManager', owner, []) as CurrencyManager

    // execution manager with strategy. protocal fee 200 = 2%
    const strategy = await deployContract('StrategyPrivateSale', owner, [STRATEGY_PROTOCAL_FEE])
    executionManager = await deployContract('ExecutionManager', owner, []) as ExecutionManager
    await executionManager.addStrategy(strategy.address);

    // royalty fee manager
    const royaltyFeeRegistry = await deployContract('RoyaltyFeeRegistry', owner, [ROYALTY_FEE_LIMIT])
    royaltyFeeManager = await deployContract('RoyaltyFeeManager', owner, [royaltyFeeRegistry.address]) as RoyaltyFeeManager
    
    // looks rare exchange
    looksRareExchange = await deployContract('LooksRareExchange', owner, [
      currencyManager.address,
      executionManager.address,
      royaltyFeeManager.address,
      ethers.constants.AddressZero,
      owner.address
    ]) as LooksRareExchange

    // transfer selector
    const transferManager721 = await deployContract('TransferManagerERC721', owner, [looksRareExchange.address])
    const transferManager1155 = await deployContract('TransferManagerERC1155', owner, [looksRareExchange.address])
    transferSelector = await deployContract('TransferSelectorNFT', owner, [transferManager721.address, transferManager1155.address]) as TransferSelectorNFT
  })

  describe('Exchange Process', () => {
    it('MakerAsk /w TakerBid', async () => {
      const makerAsk : MakerOrder = new MakerOrder();
      const takerBid : TakerOrder = new TakerOrder();

      await makerAsk.sign(maker, looksRareExchange.address);
      await looksRareExchange.connect(taker).matchAskWithTakerBid(takerBid, makerAsk);
    })

    it('MakerBid /w TakerAsk', async () => {
      const makerBid : MakerOrder = new MakerOrder();
      const takerAsk : TakerOrder = new TakerOrder();

      await makerBid.sign(maker, looksRareExchange.address);
      await looksRareExchange.connect(taker).matchAskWithTakerBid(takerAsk, makerBid);
    })
  })
})
