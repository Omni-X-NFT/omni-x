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
  Nft1155Mock,
  ERC20Mock,
  OFTMock,
  ONFT721Mock,
  ONFT1155,
  LZEndpointMock,
  FundManager,
  StrategyStargateSale,
  ONFT1155Mock
} from '../typechain-types'
import {
  deployContract, getBlockTime, toWei
} from './TestDependencies'
import {
  setEthers,
  TakerOrder,
  MakerOrder
} from '../utils/order-types'
import { BigNumber } from 'ethers'

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
  let nftMock721: Nft721Mock
  let nftMock1155: Nft1155Mock
  let erc20Mock: ERC20Mock
  let omni: OFTMock
  let onft721: ONFT721Mock
  let onft1155: ONFT1155Mock
  let owner: SignerWithAddress
  let maker: SignerWithAddress
  let taker: SignerWithAddress
  let layerZeroEndpoint: LZEndpointMock
  let royaltyRecipient: SignerWithAddress
  let nonce: number = 1
  let currTakerOmniBal: BigNumber
  let currMakerOmniBal: BigNumber

  const fillMakerOrder = async (
    makeOrder : MakerOrder,
    tokenId: number,
    currency: string,
    nftAddress: string,
    nonce: number,
    signer: string,
    amount: number,
    price: BigNumber
  ) => {
    makeOrder.tokenId = tokenId
    makeOrder.currency = currency
    makeOrder.price = price
    makeOrder.amount = amount
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
    takerAddr: string,
    price: BigNumber
  ) => {
    takerOrder.tokenId = tokenId
    takerOrder.price = price
    takerOrder.minPercentageToAsk = 900
    takerOrder.taker = takerAddr
  }

  const deploy = async () => {
    // layerzero endpoint
    layerZeroEndpoint = await deployContract('LZEndpointMock', owner, [await owner.getChainId()]) as LZEndpointMock

    // normal currency
    erc20Mock = await deployContract('ERC20Mock', owner, []) as ERC20Mock

    // normal nft
    nftMock721 = await deployContract('Nft721Mock', owner, []) as Nft721Mock
    nftMock1155 = await deployContract('Nft1155Mock', owner, []) as Nft1155Mock

    // omni currency
    omni = await deployContract('OFTMock', owner, ['OMNI', 'OMNI', toWei(1000), layerZeroEndpoint.address]) as OFTMock

    // omnichain nft
    onft721 = await deployContract('ONFT721Mock', owner, ['ONFT', 'ONFT', layerZeroEndpoint.address]) as ONFT721Mock
    onft1155 = await deployContract('ONFT1155Mock', owner, ['https://example.uri', layerZeroEndpoint.address]) as ONFT1155Mock

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

    await omniXExchange.updateProtocolDependentContract(ethers.utils.formatBytes32String('FundManager'), fundManager.address)
  }

  const prepare = async () => {
    await executionManager.addStrategy(strategy.address)

    await currencyManager.addCurrency(erc20Mock.address)
    await currencyManager.addCurrency(omni.address)

    await transferSelector.addCollectionTransferManager(onft721.address, transferManager721.address)
    await transferSelector.addCollectionTransferManager(onft1155.address, transferManager1155.address)
    await omniXExchange.updateProtocolDependentContract(ethers.utils.formatBytes32String('TransferSelectorNFT'), transferSelector.address)

    // normal currency and normal nft, mint token#1, #2, #3
    await nftMock721.mint(maker.address)
    await nftMock721.mint(maker.address)
    await nftMock721.mint(maker.address)
    await nftMock1155.mint(maker.address, 1, 5)
    await nftMock1155.mint(maker.address, 2, 5)
    await nftMock1155.mint(maker.address, 3, 5)
    await nftMock1155.mint(maker.address, 4, 5)
    await nftMock1155.mint(maker.address, 5, 5)
    await nftMock1155.mint(maker.address, 6, 5)


    // $omni and onft, mint token#1, #2
    await layerZeroEndpoint.setDestLzEndpoint(omni.address, layerZeroEndpoint.address)
    await layerZeroEndpoint.setDestLzEndpoint(onft721.address, layerZeroEndpoint.address)
    await layerZeroEndpoint.setDestLzEndpoint(onft1155.address, layerZeroEndpoint.address)
    await layerZeroEndpoint.setDestLzEndpoint(omniXExchange.address, layerZeroEndpoint.address)

    await onft721.mint(maker.address, 1)
    await onft721.mint(maker.address, 2)
    await onft1155.mint(maker.address, 1, 5)
    await onft1155.mint(maker.address, 2, 5)
    await onft721.setTrustedRemoteAddress(await owner.getChainId(), onft721.address)
    await onft1155.setTrustedRemoteAddress(await owner.getChainId(), onft1155.address)
    await omni.setTrustedRemoteAddress(await owner.getChainId(), omni.address)
    await omniXExchange.setTrustedRemoteAddress(await owner.getChainId(), omniXExchange.address)
    await omni.transfer(taker.address, toWei(200))
    await omni.transfer(maker.address, toWei(200))
    currMakerOmniBal = toWei(200)
    currTakerOmniBal = toWei(200)
  }
  const approve = async () => {
    await nftMock721.connect(maker).approve(transferManager721.address, 1)
    await nftMock721.connect(maker).approve(transferManager721.address, 2)
    await nftMock721.connect(maker).approve(transferManager721.address, 3)
    await nftMock1155.connect(maker).setApprovalForAll(transferManager1155.address, true)

    await erc20Mock.connect(taker).approve(fundManager.address, toWei(100))
    await omni.connect(taker).approve(fundManager.address, toWei(100))

    await onft721.connect(maker).approve(transferManager721.address, 1)
    await onft721.connect(maker).approve(transferManager721.address, 2)
    await onft1155.connect(maker).setApprovalForAll(transferManager1155.address, true)
  }

  before(async () => {
    [owner, maker, taker, royaltyRecipient] = await ethers.getSigners()

    await deploy()
    await prepare()
    await approve()
  })
  beforeEach(async () => {
    await erc20Mock.burn(taker.address, (await erc20Mock.balanceOf(taker.address)))
    await erc20Mock.burn(maker.address, (await erc20Mock.balanceOf(maker.address)))
    await erc20Mock.mint(taker.address, toWei(100))
    await erc20Mock.mint(maker.address, toWei(100))
  })


  describe('Exchange Process', () => {
    it('MakerAsk /w TakerBid - Normal Currency /w Normal NFT721', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 1, erc20Mock.address, nftMock721.address, nonce, maker.address, 1, toWei(1))

      fillTakerOrder(takerBid, 1, taker.address, toWei(1))

      makerAsk.encodeParams(await maker.getChainId(), royaltyRecipient.address, ROYALTY_FEE_LIMIT)
      takerBid.encodeParams(await taker.getChainId(), erc20Mock.address, nftMock721.address, strategy.address, 0)
      await makerAsk.sign(maker)

      await omniXExchange.connect(taker).matchAskWithTakerBid(0, takerBid, makerAsk)
      nonce++
      expect(await nftMock721.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
      expect(await erc20Mock.balanceOf(taker.address)).to.be.eq(toWei(99))
      const royaltyInfo = ethers.utils.arrayify(ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [royaltyRecipient.address, ROYALTY_FEE_LIMIT]))
      const [, ,finalSellerAmount, ] = await fundManager.getFeesAndFunds(strategy.address, takerBid.price, royaltyInfo)
      expect(await erc20Mock.balanceOf(maker.address)).to.be.eq(ethers.BigNumber.from(finalSellerAmount).add(ethers.BigNumber.from(toWei(100))))

    })
    it('MakerAsk /w TakerBid - Normal Currency /w single NFT1155', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 1, erc20Mock.address, nftMock1155.address, nonce, maker.address, 1, toWei(1))

      fillTakerOrder(takerBid, 1, taker.address, toWei(1))

      makerAsk.encodeParams(await maker.getChainId(), royaltyRecipient.address, ROYALTY_FEE_LIMIT)
      takerBid.encodeParams(await taker.getChainId(), erc20Mock.address, nftMock1155.address, strategy.address, 0)
      await makerAsk.sign(maker)

      await omniXExchange.connect(taker).matchAskWithTakerBid(0, takerBid, makerAsk)
      nonce++
      expect(await nftMock1155.balanceOf(taker.address, takerBid.tokenId)).to.be.eq(makerAsk.amount)
      expect(await erc20Mock.balanceOf(taker.address)).to.be.eq(toWei(99))
      const royaltyInfo = ethers.utils.arrayify(ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [royaltyRecipient.address, ROYALTY_FEE_LIMIT]))
      const [, ,finalSellerAmount, ] = await fundManager.getFeesAndFunds(strategy.address, takerBid.price, royaltyInfo)
      expect(await erc20Mock.balanceOf(maker.address)).to.be.eq(ethers.BigNumber.from(finalSellerAmount).add(ethers.BigNumber.from(toWei(100))))

    })

    it('MakerAsk /w TakerBid - Normal Currency /w multiple NFT1155', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 2, erc20Mock.address, nftMock1155.address, nonce, maker.address, 3, toWei(3))

      fillTakerOrder(takerBid, 2, taker.address, toWei(3))

      makerAsk.encodeParams(await maker.getChainId(), royaltyRecipient.address, ROYALTY_FEE_LIMIT)
      takerBid.encodeParams(await taker.getChainId(), erc20Mock.address, nftMock1155.address, strategy.address, 0)
      await makerAsk.sign(maker)

      await omniXExchange.connect(taker).matchAskWithTakerBid(0, takerBid, makerAsk)
      nonce++
      expect(await nftMock1155.balanceOf(taker.address, takerBid.tokenId)).to.be.eq(makerAsk.amount)
      expect(await erc20Mock.balanceOf(taker.address)).to.be.eq(toWei(97))
      const royaltyInfo = ethers.utils.arrayify(ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [royaltyRecipient.address, ROYALTY_FEE_LIMIT]))
      const [, ,finalSellerAmount, ] = await fundManager.getFeesAndFunds(strategy.address, takerBid.price, royaltyInfo)
      expect(await erc20Mock.balanceOf(maker.address)).to.be.eq(ethers.BigNumber.from(finalSellerAmount).add(ethers.BigNumber.from(toWei(100))))

    })

    it('MakerAsk /w TakerBid - $OMNI /w Normal NFT721', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 2, omni.address, nftMock721.address, nonce, maker.address, 1, toWei(1))
      fillTakerOrder(takerBid, 2, taker.address, toWei(1))

      makerAsk.encodeParams(await maker.getChainId(), royaltyRecipient.address, ROYALTY_FEE_LIMIT)
      takerBid.encodeParams(await taker.getChainId(), omni.address, nftMock721.address, strategy.address, 0)
      await makerAsk.sign(maker)
      await omniXExchange.connect(taker).matchAskWithTakerBid(0, takerBid, makerAsk)
      nonce++

      expect(await nftMock721.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
      expect(await omni.balanceOf(taker.address)).to.be.eq(currTakerOmniBal.sub(toWei(1)))
      const royaltyInfo = ethers.utils.arrayify(ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [royaltyRecipient.address, ROYALTY_FEE_LIMIT]))
      const [, ,finalSellerAmount, ] = await fundManager.getFeesAndFunds(strategy.address, takerBid.price, royaltyInfo)
      expect(await omni.balanceOf(maker.address)).to.be.eq(ethers.BigNumber.from(finalSellerAmount).add(currMakerOmniBal))
      currMakerOmniBal = await omni.balanceOf(maker.address)
      currTakerOmniBal = await omni.balanceOf(taker.address)

    })

    it('MakerAsk /w TakerBid - $OMNI /w single NFT1155', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 3, omni.address, nftMock1155.address, nonce, maker.address, 1, toWei(1))
      fillTakerOrder(takerBid, 3, taker.address, toWei(1))

      makerAsk.encodeParams(await maker.getChainId(), royaltyRecipient.address, ROYALTY_FEE_LIMIT)
      takerBid.encodeParams(await taker.getChainId(), omni.address, nftMock1155.address, strategy.address, 0)
      await makerAsk.sign(maker)
      await omniXExchange.connect(taker).matchAskWithTakerBid(0, takerBid, makerAsk)
      nonce++

      expect(await nftMock1155.balanceOf(taker.address, takerBid.tokenId)).to.be.eq(makerAsk.amount)
      expect(await omni.balanceOf(taker.address)).to.be.eq(currTakerOmniBal.sub(toWei(1)))
      const royaltyInfo = ethers.utils.arrayify(ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [royaltyRecipient.address, ROYALTY_FEE_LIMIT]))
      const [, ,finalSellerAmount, ] = await fundManager.getFeesAndFunds(strategy.address, takerBid.price, royaltyInfo)
      expect(await omni.balanceOf(maker.address)).to.be.eq(ethers.BigNumber.from(finalSellerAmount).add(currMakerOmniBal))
      currMakerOmniBal = await omni.balanceOf(maker.address)
      currTakerOmniBal = await omni.balanceOf(taker.address)
    })
    it('MakerAsk /w TakerBid - $OMNI /w multiple NFT1155', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 4, omni.address, nftMock1155.address, nonce, maker.address, 2, toWei(2))
      fillTakerOrder(takerBid, 4, taker.address, toWei(2))

      makerAsk.encodeParams(await maker.getChainId(), royaltyRecipient.address, ROYALTY_FEE_LIMIT)
      takerBid.encodeParams(await taker.getChainId(), omni.address, nftMock1155.address, strategy.address, 0)
      await makerAsk.sign(maker)
      await omniXExchange.connect(taker).matchAskWithTakerBid(0, takerBid, makerAsk)
      nonce++

      expect(await nftMock1155.balanceOf(taker.address, makerAsk.tokenId)).to.be.eq(makerAsk.amount)
      expect(await omni.balanceOf(taker.address)).to.be.eq(currTakerOmniBal.sub(toWei(2)))
      const royaltyInfo = ethers.utils.arrayify(ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [royaltyRecipient.address, ROYALTY_FEE_LIMIT]))
      const [, ,finalSellerAmount, ] = await fundManager.getFeesAndFunds(strategy.address, takerBid.price, royaltyInfo)
      expect(await omni.balanceOf(maker.address)).to.be.eq(ethers.BigNumber.from(finalSellerAmount).add(currMakerOmniBal))
      currMakerOmniBal = await omni.balanceOf(maker.address)
      currTakerOmniBal = await omni.balanceOf(taker.address)
    })

    it('MakerAsk /w TakerBid - Normal Currency /w ONFT721', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)


      await fillMakerOrder(makerAsk, 1, erc20Mock.address, onft721.address, nonce, maker.address, 1,  toWei(1))
      fillTakerOrder(takerBid, 1, taker.address, toWei(1))

      makerAsk.encodeParams(await maker.getChainId(), royaltyRecipient.address, ROYALTY_FEE_LIMIT)
      takerBid.encodeParams(await taker.getChainId(), erc20Mock.address, onft721.address, strategy.address, 0)
      await makerAsk.sign(maker)
      await omniXExchange.connect(taker).matchAskWithTakerBid(0, takerBid, makerAsk)
      nonce++

      expect(await onft721.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
      const royaltyInfo = ethers.utils.arrayify(ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [royaltyRecipient.address, ROYALTY_FEE_LIMIT]))
      const [, ,finalSellerAmount, ] = await fundManager.getFeesAndFunds(strategy.address, takerBid.price, royaltyInfo)
      expect(await erc20Mock.balanceOf(maker.address)).to.be.eq(ethers.BigNumber.from(finalSellerAmount).add(ethers.BigNumber.from(toWei(100))))
  
    })

    it('MakerAsk /w TakerBid - $OMNI /w ONFT721', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

      await fillMakerOrder(makerAsk, 2, omni.address, onft721.address, nonce, maker.address, 1, toWei(1))
      fillTakerOrder(takerBid, 2, taker.address, toWei(1))

      makerAsk.encodeParams(await maker.getChainId(), royaltyRecipient.address, ROYALTY_FEE_LIMIT)
      takerBid.encodeParams(await taker.getChainId(), omni.address, onft721.address, strategy.address, 0)
      await makerAsk.sign(maker)
      await omniXExchange.connect(taker).matchAskWithTakerBid(0, takerBid, makerAsk)
      nonce++

      expect(await onft721.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
      expect(await omni.balanceOf(taker.address)).to.be.eq(currTakerOmniBal.sub(toWei(1)))
      const royaltyInfo = ethers.utils.arrayify(ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [royaltyRecipient.address, ROYALTY_FEE_LIMIT]))
      const [, ,finalSellerAmount, ] = await fundManager.getFeesAndFunds(strategy.address, takerBid.price, royaltyInfo)
      expect(await omni.balanceOf(maker.address)).to.be.eq(ethers.BigNumber.from(finalSellerAmount).add(currMakerOmniBal))
      currMakerOmniBal = await omni.balanceOf(maker.address)
      currTakerOmniBal = await omni.balanceOf(taker.address)
    })
    it('MakerAsk /w TakerBid - $OMNI /w single ONFT1155', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)
      await fillMakerOrder(makerAsk, 1, omni.address, onft1155.address, nonce, maker.address, 1, toWei(1))
      fillTakerOrder(takerBid, 1, taker.address, toWei(1))

      makerAsk.encodeParams(await maker.getChainId(), royaltyRecipient.address, ROYALTY_FEE_LIMIT)
      takerBid.encodeParams(await taker.getChainId(), omni.address, onft1155.address, strategy.address, 0)
      await makerAsk.sign(maker)
      await omniXExchange.connect(taker).matchAskWithTakerBid(0, takerBid, makerAsk)
      nonce++

      expect(await onft1155.balanceOf(taker.address, takerBid.tokenId)).to.be.eq(makerAsk.amount)
      expect(await omni.balanceOf(taker.address)).to.be.eq(currTakerOmniBal.sub(toWei(1)))
      const royaltyInfo = ethers.utils.arrayify(ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [royaltyRecipient.address, ROYALTY_FEE_LIMIT]))
      const [, ,finalSellerAmount, ] = await fundManager.getFeesAndFunds(strategy.address, takerBid.price, royaltyInfo)
      expect(await omni.balanceOf(maker.address)).to.be.eq(ethers.BigNumber.from(finalSellerAmount).add(currMakerOmniBal))
      currMakerOmniBal = await omni.balanceOf(maker.address)
      currTakerOmniBal = await omni.balanceOf(taker.address)
    })
    it('MakerAsk /w TakerBid - $OMNI /w multiple ONFT1155', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)
      await fillMakerOrder(makerAsk, 2, omni.address, onft1155.address, nonce, maker.address, 3, toWei(3))
      fillTakerOrder(takerBid, 2, taker.address, toWei(3))

      makerAsk.encodeParams(await maker.getChainId(), royaltyRecipient.address, ROYALTY_FEE_LIMIT)
      takerBid.encodeParams(await taker.getChainId(), omni.address, onft1155.address, strategy.address, 0)
      await makerAsk.sign(maker)
      await omniXExchange.connect(taker).matchAskWithTakerBid(0, takerBid, makerAsk)
      nonce++

      expect(await onft1155.balanceOf(taker.address, takerBid.tokenId)).to.be.eq(makerAsk.amount)
      expect(await omni.balanceOf(taker.address)).to.be.eq(currTakerOmniBal.sub(toWei(3)))
      const royaltyInfo = ethers.utils.arrayify(ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [royaltyRecipient.address, ROYALTY_FEE_LIMIT]))
      const [, ,finalSellerAmount, ] = await fundManager.getFeesAndFunds(strategy.address, takerBid.price, royaltyInfo)
      expect(await omni.balanceOf(maker.address)).to.be.eq(ethers.BigNumber.from(finalSellerAmount).add(currMakerOmniBal))
      currMakerOmniBal = await omni.balanceOf(maker.address)
      currTakerOmniBal = await omni.balanceOf(taker.address)
    })

    it('MakerBid /w TakerAsk', async () => {
      const seller = maker
      const bidder = taker
      const makerBid: MakerOrder = new MakerOrder(false)
      const takerAsk: TakerOrder = new TakerOrder(true)

      await fillMakerOrder(makerBid, 3, omni.address, nftMock721.address, nonce, taker.address, 1, toWei(1))
      fillTakerOrder(takerAsk, 3, maker.address, toWei(1))

      makerBid.encodeParams(await bidder.getChainId(), royaltyRecipient.address, ROYALTY_FEE_LIMIT)
      takerAsk.encodeParams(await seller.getChainId(), omni.address, nftMock721.address, strategy.address, 0)
      await makerBid.sign(bidder)
      await omniXExchange.connect(seller).matchBidWithTakerAsk(0, takerAsk, makerBid)
      nonce++

      expect(await nftMock721.ownerOf(takerAsk.tokenId)).to.be.eq(bidder.address)
    })

  })
})