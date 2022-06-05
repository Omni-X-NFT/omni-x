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
  StrategyStandardSale,
  Nft721Mock,
  LRTokenMock,
  OFTMock,
  ONFT721Mock,
  ONFT1155,
  LZEndpointMock
} from '../typechain-types'
import {
  deployContract, getBlockTime, toWei
} from '../utils/test-utils'
import {
  setEthers,
  TakerOrder,
  MakerOrder
} from '../utils/order-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

chai.use(solidity)
const { expect } = chai

setEthers(ethers)

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
  let strategy: StrategyStandardSale
  let nftMock: Nft721Mock
  let erc20Mock: LRTokenMock
  let omni: OFTMock
  let onft721: ONFT721Mock
  let onft1155: ONFT1155
  let owner: SignerWithAddress
  let maker: SignerWithAddress
  let taker: SignerWithAddress
  let layerZeroEndpoint: LZEndpointMock

  const fillMakerOrder = async (
    makeOrder : MakerOrder,
    tokenId: number,
    currency: string,
    nftAddress: string,
    nonce: number
  ) => {
    makeOrder.tokenId = tokenId
    makeOrder.currency = currency
    makeOrder.price = toWei(1)
    makeOrder.amount = 1
    makeOrder.collection = nftAddress
    makeOrder.strategy = strategy.address
    makeOrder.nonce = nonce
    makeOrder.startTime = await getBlockTime()
    makeOrder.endTime = makeOrder.startTime + 3600 * 30
    makeOrder.minPercentageToAsk = 900
    makeOrder.signer = maker.address
  }
  const fillTakerOrder = (
    takerOrder : TakerOrder,
    tokenId: number
  ) => {
    takerOrder.tokenId = tokenId
    takerOrder.price = toWei(1)
    takerOrder.minPercentageToAsk = 900
    takerOrder.taker = taker.address
  }

  const deploy = async () => {
    // layerzero endpoint
    layerZeroEndpoint = await deployContract('LZEndpointMock', owner, [await owner.getChainId()]) as LZEndpointMock

    // normal currency
    erc20Mock = await deployContract('LRTokenMock', owner, []) as LRTokenMock

    // normal nft
    nftMock = await deployContract('Nft721Mock', owner, []) as Nft721Mock

    // omni currency
    omni = await deployContract('OFTMock', owner, ['OMNI', 'OMNI', toWei(1000), layerZeroEndpoint.address]) as OFTMock

    // omnichain nft
    onft721 = await deployContract('ONFT721Mock', owner, ['ONFT', 'ONFT', layerZeroEndpoint.address]) as ONFT721Mock
    onft1155 = await deployContract('ONFT1155', owner, ['https://localhost/', layerZeroEndpoint.address]) as ONFT1155

    // currency manager
    currencyManager = await deployContract('CurrencyManager', owner, []) as CurrencyManager

    // execution manager with strategy. protocal fee 200 = 2%
    strategy = await deployContract('StrategyStandardSale', owner, [STRATEGY_PROTOCAL_FEE]) as StrategyStandardSale
    executionManager = await deployContract('ExecutionManager', owner, []) as ExecutionManager

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
  }

  const prepare = async () => {
    await executionManager.addStrategy(strategy.address)

    await currencyManager.addCurrency(erc20Mock.address)
    await currencyManager.addCurrency(omni.address)

    await transferSelector.addCollectionTransferManager(onft721.address, transferManagerONFT721.address)
    await transferSelector.addCollectionTransferManager(onft1155.address, transferManagerONFT1155.address)
    await omniXExchange.updateTransferSelectorNFT(transferSelector.address)

    // normal currency and normal nft, mint token#1, #2, #3
    await nftMock.mint(maker.address)
    await nftMock.mint(maker.address)
    await nftMock.mint(taker.address)
    await erc20Mock.mint(taker.address, toWei(100))
    await erc20Mock.mint(maker.address, toWei(100))

    // $omni and onft, mint token#1, #2
    await layerZeroEndpoint.setDestLzEndpoint(omni.address, layerZeroEndpoint.address)
    await layerZeroEndpoint.setDestLzEndpoint(onft721.address, layerZeroEndpoint.address)
    await layerZeroEndpoint.setDestLzEndpoint(onft1155.address, layerZeroEndpoint.address)

    await onft721.mint(maker.address, 1)
    await onft721.mint(maker.address, 2)
    await onft721.setTrustedRemote(await owner.getChainId(), onft721.address);
    await omni.setTrustedRemote(await owner.getChainId(), omni.address)
    await omni.transfer(taker.address, toWei(200))
  }
  const approve = async () => {
    await nftMock.connect(maker).approve(transferManager721.address, 1)
    await nftMock.connect(maker).approve(transferManager721.address, 2)
    await nftMock.connect(taker).approve(transferManager721.address, 3)
    await erc20Mock.connect(taker).approve(omniXExchange.address, toWei(100))
    await erc20Mock.connect(maker).approve(omniXExchange.address, toWei(100))

    await omni.connect(taker).approve(omniXExchange.address, toWei(100))
    await onft721.connect(maker).approve(transferManagerONFT721.address, 1)
    await onft721.connect(maker).approve(transferManagerONFT721.address, 2)
  }

  before(async () => {
    [owner, maker, taker] = await ethers.getSigners()
    
    await deploy()
    await prepare()
    await approve()
  })

  describe('Exchange Process', () => {
    it('MakerAsk /w TakerBid - Normal Currency /w Normal NFT', async () => {

      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 1, erc20Mock.address, nftMock.address, 1)
      fillTakerOrder(takerBid, 1)

      makerAsk.encodeParams(await maker.getChainId(), taker.address)
      takerBid.encodeParams(await taker.getChainId())
      await makerAsk.sign(maker, omniXExchange.address)

      await omniXExchange.connect(taker).matchAskWithTakerBid(takerBid, makerAsk);
      expect(await nftMock.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
    })

    it('MakerAsk /w TakerBid - $OMNI /w Normal NFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 2, omni.address, nftMock.address, 2)
      fillTakerOrder(takerBid, 2)
 
      makerAsk.encodeParams(await maker.getChainId(), taker.address)
      takerBid.encodeParams(await taker.getChainId())
      await makerAsk.sign(maker, omniXExchange.address)
      await omniXExchange.connect(taker).matchAskWithTakerBid(takerBid, makerAsk);

      expect(await nftMock.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
    })

    it('MakerAsk /w TakerBid - Normal Currency /w ONFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 1, erc20Mock.address, onft721.address, 3)
      fillTakerOrder(takerBid, 1)

      makerAsk.encodeParams(await maker.getChainId(), taker.address)
      takerBid.encodeParams(await taker.getChainId())
      await makerAsk.sign(maker, omniXExchange.address)
      await omniXExchange.connect(taker).matchAskWithTakerBid(takerBid, makerAsk);

      expect(await onft721.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
    })

    it('MakerAsk /w TakerBid - $OMNI /w ONFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 2, omni.address, onft721.address, 4)
      fillTakerOrder(takerBid, 2)

      makerAsk.encodeParams(await maker.getChainId(), taker.address)
      takerBid.encodeParams(await taker.getChainId())
      await makerAsk.sign(maker, omniXExchange.address)
      await omniXExchange.connect(taker).matchAskWithTakerBid(takerBid, makerAsk);

      expect(await onft721.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
    })

    it('MakerBid /w TakerAsk', async () => {
      const makerBid: MakerOrder = new MakerOrder(false)
      const takerAsk: TakerOrder = new TakerOrder(true)

      await fillMakerOrder(makerBid, 3, erc20Mock.address, nftMock.address, 5)
      fillTakerOrder(takerAsk, 3)

      makerBid.encodeParams(await maker.getChainId(), taker.address)
      takerAsk.encodeParams(await taker.getChainId())
      await makerBid.sign(maker, omniXExchange.address)
      await omniXExchange.connect(taker).matchBidWithTakerAsk(takerAsk, makerBid);

      expect(await nftMock.ownerOf(takerAsk.tokenId)).to.be.eq(maker.address)
    })
  })
})
