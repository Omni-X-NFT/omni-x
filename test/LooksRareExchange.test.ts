import { ethers } from 'hardhat'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import {
  LooksRareExchange,
  CurrencyManager,
  ExecutionManager,
  RoyaltyFeeManager,
  TransferSelectorNFT,
  StrategyPrivateSale,
  Nft721Mock,
  LRTokenMock
} from '../typechain-types'
import {
  deployContract, now, toWei
} from '../utils/test-utils'
import {
  TakerOrder,
  MakerOrder
} from '../utils/order-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

chai.use(solidity)
const { expect } = chai

const STRATEGY_PROTOCAL_FEE = 200 // 2%
const ROYALTY_FEE_LIMIT = 500 // 5%

describe('LooksRareExchange', () => {
  let looksRareExchange: LooksRareExchange
  let currencyManager: CurrencyManager
  let executionManager: ExecutionManager
  let transferSelector: TransferSelectorNFT
  let royaltyFeeManager: RoyaltyFeeManager
  let strategy: StrategyPrivateSale
  let nftMock: Nft721Mock
  let erc20Mock: LRTokenMock
  let owner: SignerWithAddress
  let maker: SignerWithAddress
  let taker: SignerWithAddress

  const fillMakerOrder = (makeOrder : MakerOrder, nonce: number) => {
    makeOrder.tokenId = 1
    makeOrder.price = toWei(1)
    makeOrder.amount = 1
    makeOrder.collection = nftMock.address
    makeOrder.strategy = strategy.address
    makeOrder.nonce = nonce
    makeOrder.startTime = now()
    makeOrder.endTime = now() + 3600 * 30
    makeOrder.minPercentageToAsk = 900
    makeOrder.signer = maker.address
  }
  const fillTakerOrder = (takerOrder : TakerOrder) => {
    takerOrder.tokenId = 1
    takerOrder.price = toWei(1)
    takerOrder.minPercentageToAsk = 900
    takerOrder.taker = taker.address
  }

  before(async () => {
    [owner, maker, taker] = await ethers.getSigners()
    
    // erc20
    erc20Mock = await deployContract('LRTokenMock', owner, []) as LRTokenMock

    // nft
    nftMock = await deployContract('Nft721Mock', owner, []) as Nft721Mock

    // currency manager
    currencyManager = await deployContract('CurrencyManager', owner, []) as CurrencyManager

    // execution manager with strategy. protocal fee 200 = 2%
    strategy = await deployContract('StrategyPrivateSale', owner, [STRATEGY_PROTOCAL_FEE]) as StrategyPrivateSale
    executionManager = await deployContract('ExecutionManager', owner, []) as ExecutionManager
    await executionManager.addStrategy(strategy.address)

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

    // mint nfts to maker
    nftMock.mint(maker.address);
  })

  describe('Exchange Process', () => {
    it('MakerAsk /w TakerBid', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      fillMakerOrder(makerAsk, 1)
      fillTakerOrder(takerBid)

      await makerAsk.sign(maker, looksRareExchange.address)
      await looksRareExchange.connect(taker).matchAskWithTakerBid(takerBid, makerAsk);
    })

    it('MakerBid /w TakerAsk', async () => {
      const makerBid: MakerOrder = new MakerOrder(false)
      const takerAsk: TakerOrder = new TakerOrder(true)

      // await makerBid.sign(maker, looksRareExchange.address);
      // await looksRareExchange.connect(taker).matchAskWithTakerBid(takerAsk, makerBid);
    })
  })
})
