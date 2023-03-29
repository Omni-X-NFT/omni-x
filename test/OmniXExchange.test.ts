import { ethers } from 'hardhat'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import {
  OmniXExchange,
  CurrencyManager,
  ExecutionManager,
  RoyaltyFeeManager,
  TransferSelectorNFT,
  TransferManagerERC721,
  TransferManagerERC1155,
  StrategyStandardSale,
  Nft721Mock,
  ERC20Mock,
  OFTMock,
  ONFT721Mock,
  ONFT1155,
  LZEndpointMock,
  FundManager,
  StrategyStargateSale
} from '../typechain-types'
import {
  deployContract, getBlockTime, toWei
} from './TestDependencies'
import {
  setEthers,
  TakerOrder,
  MakerOrder
} from '../utils/order-types'

chai.use(solidity)
const { expect } = chai

setEthers(ethers)

const ROYALTY_FEE_LIMIT = 500 // 5%

describe('OmniXExchange', () => {
  let omniXExchange: OmniXExchange
  let currencyManager: CurrencyManager
  let executionManager: ExecutionManager
  let transferSelector: TransferSelectorNFT
  let transferManager721: TransferManagerERC721
  let transferManager1155: TransferManagerERC1155
  let royaltyFeeManager: RoyaltyFeeManager
  let fundManager: FundManager
  let strategy: StrategyStandardSale
  let nftMock: Nft721Mock
  let erc20Mock: ERC20Mock
  let omni: OFTMock
  let onft721: ONFT721Mock
  let onft1155: ONFT1155
  let owner: SignerWithAddress
  let maker: SignerWithAddress
  let taker: SignerWithAddress
  let layerZeroEndpoint: LZEndpointMock
  let royaltyRecipient: SignerWithAddress

  const fillMakerOrder = async (
    makeOrder : MakerOrder,
    tokenId: number,
    currency: string,
    nftAddress: string,
    nonce: number,
    signer: string
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
    makeOrder.signer = signer
  }
  const fillTakerOrder = (
    takerOrder : TakerOrder,
    tokenId: number,
    takerAddr: string
  ) => {
    takerOrder.tokenId = tokenId
    takerOrder.price = toWei(1)
    takerOrder.minPercentageToAsk = 900
    takerOrder.taker = takerAddr
  }

  const deploy = async () => {
    // layerzero endpoint
    layerZeroEndpoint = await deployContract('LZEndpointMock', owner, [await owner.getChainId()]) as LZEndpointMock

    // normal currency
    erc20Mock = await deployContract('ERC20Mock', owner, []) as ERC20Mock

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
    strategy = await deployContract('StrategyStargateSale', owner, []) as StrategyStargateSale
    executionManager = await deployContract('ExecutionManager', owner, []) as ExecutionManager

    // royalty fee manager
    await deployContract('RoyaltyFeeRegistry', owner, [ROYALTY_FEE_LIMIT])
    royaltyFeeManager = await deployContract('RoyaltyFeeManager', owner, []) as RoyaltyFeeManager

    // looks rare exchange
    omniXExchange = await deployContract('OmniXExchange', owner, [
      currencyManager.address,
      executionManager.address,
      royaltyFeeManager.address,
      ethers.constants.AddressZero,
      owner.address,
      layerZeroEndpoint.address
    ]) as OmniXExchange

    // transfer selector
    transferManager721 = await deployContract('TransferManagerERC721', owner, []) as TransferManagerERC721
    transferManager1155 = await deployContract('TransferManagerERC1155', owner, []) as TransferManagerERC1155

    transferSelector = await deployContract('TransferSelectorNFT', owner, [transferManager721.address, transferManager1155.address]) as TransferSelectorNFT
    fundManager = await deployContract('FundManager', owner, [omniXExchange.address]) as FundManager

    await omniXExchange.setFundManager(fundManager.address)
  }

  const prepare = async () => {
    await executionManager.addStrategy(strategy.address)

    await currencyManager.addCurrency(erc20Mock.address)
    await currencyManager.addCurrency(omni.address)

    await omniXExchange.updateTransferSelectorNFT(transferSelector.address)

    // normal currency and normal nft, mint token#1, #2, #3
    await nftMock.mint(maker.address)
    await nftMock.mint(maker.address)
    await nftMock.mint(maker.address)
    await erc20Mock.mint(taker.address, toWei(100))
    await erc20Mock.mint(maker.address, toWei(100))

    // $omni and onft, mint token#1, #2
    await layerZeroEndpoint.setDestLzEndpoint(omni.address, layerZeroEndpoint.address)
    await layerZeroEndpoint.setDestLzEndpoint(onft721.address, layerZeroEndpoint.address)
    await layerZeroEndpoint.setDestLzEndpoint(onft1155.address, layerZeroEndpoint.address)
    await layerZeroEndpoint.setDestLzEndpoint(omniXExchange.address, layerZeroEndpoint.address)

    await onft721.mint(maker.address, 1)
    await onft721.mint(maker.address, 2)
    await onft721.setTrustedRemoteAddress(await owner.getChainId(), onft721.address)
    await omni.setTrustedRemoteAddress(await owner.getChainId(), omni.address)
    await omniXExchange.setTrustedRemoteAddress(await owner.getChainId(), omniXExchange.address)
    await omni.transfer(taker.address, toWei(200))
  }
  const approve = async () => {
    await nftMock.connect(maker).approve(transferManager721.address, 1)
    await nftMock.connect(maker).approve(transferManager721.address, 2)
    await nftMock.connect(maker).approve(transferManager721.address, 3)

    await erc20Mock.connect(taker).approve(fundManager.address, toWei(100))
    await omni.connect(taker).approve(fundManager.address, toWei(100))

    onft721.connect(maker).approve(transferManager721.address, 1)
    onft721.connect(maker).approve(transferManager721.address, 2)


  }

  before(async () => {
    [owner, maker, taker, royaltyRecipient] = await ethers.getSigners()

    await deploy()
    await prepare()
    await approve()
  })

  describe('Exchange Process', () => {
    it('MakerAsk /w TakerBid - Normal Currency /w Normal NFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 1, erc20Mock.address, nftMock.address, 1, maker.address)
      fillTakerOrder(takerBid, 1, taker.address)

      makerAsk.encodeParams(await maker.getChainId(), royaltyRecipient.address, ROYALTY_FEE_LIMIT)
      takerBid.encodeParams(await taker.getChainId(), erc20Mock.address, nftMock.address, strategy.address, 0)
      await makerAsk.sign(maker)

      await omniXExchange.connect(taker).matchAskWithTakerBid(0, takerBid, makerAsk)
      expect(await nftMock.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
      expect(await erc20Mock.balanceOf(taker.address)).to.be.eq(toWei(99))
    })

    it('MakerAsk /w TakerBid - $OMNI /w Normal NFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 2, omni.address, nftMock.address, 2, maker.address)
      fillTakerOrder(takerBid, 2, taker.address)

      makerAsk.encodeParams(await maker.getChainId(), royaltyRecipient.address, ROYALTY_FEE_LIMIT)
      takerBid.encodeParams(await taker.getChainId(), omni.address, nftMock.address, strategy.address, 0)
      await makerAsk.sign(maker)
      await omniXExchange.connect(taker).matchAskWithTakerBid(0, takerBid, makerAsk)

      expect(await nftMock.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
    })

    it('MakerAsk /w TakerBid - Normal Currency /w ONFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 1, erc20Mock.address, onft721.address, 3, maker.address)
      fillTakerOrder(takerBid, 1, taker.address)

      makerAsk.encodeParams(await maker.getChainId(), royaltyRecipient.address, ROYALTY_FEE_LIMIT)
      takerBid.encodeParams(await taker.getChainId(), erc20Mock.address, onft721.address, strategy.address, 0)
      await makerAsk.sign(maker)
      await omniXExchange.connect(taker).matchAskWithTakerBid(0, takerBid, makerAsk)

      expect(await onft721.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
    })

    it('MakerAsk /w TakerBid - $OMNI /w ONFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 2, omni.address, onft721.address, 4, maker.address)
      fillTakerOrder(takerBid, 2, taker.address)

      makerAsk.encodeParams(await maker.getChainId(), royaltyRecipient.address, ROYALTY_FEE_LIMIT)
      takerBid.encodeParams(await taker.getChainId(), omni.address, onft721.address, strategy.address, 0)
      await makerAsk.sign(maker)
      await omniXExchange.connect(taker).matchAskWithTakerBid(0, takerBid, makerAsk)

      expect(await onft721.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
    })

    it('MakerBid /w TakerAsk', async () => {
      const seller = maker
      const bidder = taker
      const makerBid: MakerOrder = new MakerOrder(false)
      const takerAsk: TakerOrder = new TakerOrder(true)

      await fillMakerOrder(makerBid, 3, omni.address, nftMock.address, 5, taker.address)
      fillTakerOrder(takerAsk, 3, maker.address)

      makerBid.encodeParams(await bidder.getChainId(), royaltyRecipient.address, ROYALTY_FEE_LIMIT)
      takerAsk.encodeParams(await seller.getChainId(), omni.address, nftMock.address, strategy.address, 0)
      await makerBid.sign(bidder)
      await omniXExchange.connect(seller).matchBidWithTakerAsk(0, takerAsk, makerBid)

      expect(await nftMock.ownerOf(takerAsk.tokenId)).to.be.eq(bidder.address)
    })
  })
})
