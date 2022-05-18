import { ethers, waffle } from 'hardhat'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import {
  OmniXExchange,
  CurrencyManager,
  ExecutionManager,
  RoyaltyFeeManager,
  TransferSelectorNFT,
  TransferManagerERC721,
  TransferManagerERC1155,
  TransferManagerONFT721,
  TransferManagerONFT1155,
  StrategyPrivateSale,
  Nft721Mock,
  LRTokenMock,
  OFT,
  ONFT721,
  ONFT1155,
  LayerZeroEndpointMock
} from '../typechain-types'
import {
  deployContract, getBlockTime, toWei
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

describe('OmniXExchange', () => {
  let omniXExchange: OmniXExchange
  let currencyManager: CurrencyManager
  let executionManager: ExecutionManager
  let transferSelector: TransferSelectorNFT
  let transferManagerONFT721: TransferManagerONFT721
  let transferManagerONFT1155: TransferManagerONFT1155
  let transferManager721: TransferManagerERC721
  let transferManager1155: TransferManagerERC1155
  let royaltyFeeManager: RoyaltyFeeManager
  let strategy: StrategyPrivateSale
  let nftMock: Nft721Mock
  let erc20Mock: LRTokenMock
  let omni: OFT
  let onft721: ONFT721
  let onft1155: ONFT1155
  let owner: SignerWithAddress
  let maker: SignerWithAddress
  let taker: SignerWithAddress

  const fillMakerOrder = async (makeOrder : MakerOrder, nonce: number) => {
    makeOrder.tokenId = 1
    makeOrder.currency = erc20Mock.address
    makeOrder.price = toWei(1)
    makeOrder.amount = 1
    makeOrder.collection = nftMock.address
    makeOrder.strategy = strategy.address
    makeOrder.nonce = nonce
    makeOrder.startTime = await getBlockTime()
    makeOrder.endTime = makeOrder.startTime + 3600 * 30
    makeOrder.minPercentageToAsk = 900
    makeOrder.signer = maker.address
  }
  const fillTakerOrder = (takerOrder : TakerOrder) => {
    takerOrder.tokenId = 1
    takerOrder.price = toWei(1)
    takerOrder.minPercentageToAsk = 900
    takerOrder.taker = taker.address
  }

  const prepare = async () => {
    // normal currency and normal nft
    await nftMock.mint(maker.address)
    await erc20Mock.mint(taker.address, toWei(100))

    // $omni and onft
    await onft721.safeMint(maker.address, 1)
    await onft721.safeMint(maker.address, 2)
    await omni.send(
      await taker.getChainId(),
      taker.address,
      toWei(200),
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      "");
  }
  const approve = async () => {
    await nftMock.connect(maker).approve(transferManager721.address, 1)
    await erc20Mock.connect(taker).approve(omniXExchange.address, toWei(100))
  }

  beforeEach(async () => {
    [owner, maker, taker] = await ethers.getSigners()
    
    // layerzero endpoint
    const layerZeroEndpoint = await deployContract('LayerZeroEndpointMock', owner, []) as LayerZeroEndpointMock

    // normal currency
    erc20Mock = await deployContract('LRTokenMock', owner, []) as LRTokenMock

    // normal nft
    nftMock = await deployContract('Nft721Mock', owner, []) as Nft721Mock

    // omni currency
    omni = await deployContract('OFT', owner, ['OMNI', 'OMNI', layerZeroEndpoint.address, toWei(1000)]) as OFT

    // omnichain nft
    onft721 = await deployContract('ONFT721', owner, ['ONFT', 'ONFT', layerZeroEndpoint.address]) as ONFT721
    onft1155 = await deployContract('ONFT1155', owner, ['https://localhost/', layerZeroEndpoint.address]) as ONFT1155

    // currency manager
    currencyManager = await deployContract('CurrencyManager', owner, []) as CurrencyManager
    currencyManager.addCurrency(erc20Mock.address);

    // execution manager with strategy. protocal fee 200 = 2%
    strategy = await deployContract('StrategyPrivateSale', owner, [STRATEGY_PROTOCAL_FEE]) as StrategyPrivateSale
    executionManager = await deployContract('ExecutionManager', owner, []) as ExecutionManager
    await executionManager.addStrategy(strategy.address)

    // royalty fee manager
    const royaltyFeeRegistry = await deployContract('RoyaltyFeeRegistry', owner, [ROYALTY_FEE_LIMIT])
    royaltyFeeManager = await deployContract('RoyaltyFeeManager', owner, [royaltyFeeRegistry.address]) as RoyaltyFeeManager
       
    // looks rare exchange
    omniXExchange = await deployContract('OmniXExchange', owner, [
      currencyManager.address,
      executionManager.address,
      royaltyFeeManager.address,
      ethers.constants.AddressZero,
      owner.address
    ]) as OmniXExchange

    // transfer selector
    transferManager721 = await deployContract('TransferManagerERC721', owner, [omniXExchange.address]) as TransferManagerERC721
    transferManager1155 = await deployContract('TransferManagerERC1155', owner, [omniXExchange.address]) as TransferManagerERC1155
    transferManagerONFT721 = await deployContract('TransferManagerONFT721', owner, [omniXExchange.address]) as TransferManagerONFT721
    transferManagerONFT1155 = await deployContract('TransferManagerONFT1155', owner, [omniXExchange.address]) as TransferManagerONFT1155
    transferSelector = await deployContract('TransferSelectorNFT', owner, [transferManager721.address, transferManager1155.address]) as TransferSelectorNFT
    transferSelector.addCollectionTransferManager(onft721.address, transferManagerONFT721.address)
    transferSelector.addCollectionTransferManager(onft1155.address, transferManagerONFT1155.address)

    omniXExchange.updateTransferSelectorNFT(transferSelector.address)

    // mint nfts to maker
    await prepare()
    await approve()
  })

  describe('Exchange Process', () => {
    it('MakerAsk /w TakerBid - Normal Currency /w Normal NFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 1)
      fillTakerOrder(takerBid)

      makerAsk.encodeParams(await maker.getChainId(), taker.address)
      takerBid.encodeParams(await taker.getChainId())
      await makerAsk.sign(maker, omniXExchange.address)
      await omniXExchange.connect(taker).matchAskWithTakerBid(takerBid, makerAsk);

      expect(await nftMock.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
    })

    it('MakerAsk /w TakerBid - $OMNI /w Normal NFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 1)
      fillTakerOrder(takerBid)

      makerAsk.encodeParams(await maker.getChainId(), taker.address)
      takerBid.encodeParams(await taker.getChainId())
      await makerAsk.sign(maker, omniXExchange.address)
      await omniXExchange.connect(taker).matchAskWithTakerBid(takerBid, makerAsk);

      expect(await nftMock.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
    })

    it('MakerAsk /w TakerBid - Normal Currency /w ONFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 1)
      fillTakerOrder(takerBid)

      makerAsk.encodeParams(await maker.getChainId(), taker.address)
      takerBid.encodeParams(await taker.getChainId())
      await makerAsk.sign(maker, omniXExchange.address)
      await omniXExchange.connect(taker).matchAskWithTakerBid(takerBid, makerAsk);

      expect(await nftMock.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
    })

    it('MakerAsk /w TakerBid - $OMNI /w ONFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 1)
      fillTakerOrder(takerBid)

      makerAsk.encodeParams(await maker.getChainId(), taker.address)
      takerBid.encodeParams(await taker.getChainId())
      await makerAsk.sign(maker, omniXExchange.address)
      await omniXExchange.connect(taker).matchAskWithTakerBid(takerBid, makerAsk);

      expect(await nftMock.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
    })

    it('MakerBid /w TakerAsk', async () => {
      // StrategyPrivateSale does not provide Bid /w Ask option.
      // So we can ignore this case easily.

      // const makerBid: MakerOrder = new MakerOrder(false)
      // const takerAsk: TakerOrder = new TakerOrder(true)

      // await fillMakerOrder(makerBid, 2)
      // fillTakerOrder(takerAsk)

      // makerBid.setParam(taker.address)
      // await makerBid.sign(maker, looksRareExchange.address);
      // await looksRareExchange.connect(taker).matchBidWithTakerAsk(takerAsk, makerBid);
    })
  })
})