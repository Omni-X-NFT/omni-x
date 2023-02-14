import { ethers } from 'hardhat'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import {
  getBlockTime,
  toWei,
  deploy,
  linkChains,
  prepareMaker,
  prepareTaker,
  Chain
} from './TestDependencies'
import {
  setEthers,
  TakerOrder,
  MakerOrder
} from '../utils/order-types'
import { fillMakerOrder, fillTakerOrder } from '../tasks/shared'

chai.use(solidity)
const { expect } = chai

setEthers(ethers)

const SRC_CHAIN_ID = 10001
const DST_CHAIN_ID = 10002
let nonce = 0

describe('OmniXExchangeCross', () => {
  let makerChain: Chain
  let takerChain: Chain
  let owner: SignerWithAddress
  let maker: SignerWithAddress
  let taker: SignerWithAddress
  let royaltyRecipient: SignerWithAddress

  before(async () => {
    [owner, maker, taker, royaltyRecipient] = await ethers.getSigners()

    makerChain = await deploy(owner, SRC_CHAIN_ID)
    takerChain = await deploy(owner, DST_CHAIN_ID)

    await linkChains(makerChain, takerChain)
    await linkChains(takerChain, makerChain)

    await prepareMaker(makerChain, maker)
    await prepareTaker(takerChain, taker)
  })

  describe('Exchange Process Cross chain', () => {
    it('MakerAsk /w TakerBid - Normal Currency /w Normal NFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)
      const tokenId = 1
      const price = toWei(1)
      const blockTime = await getBlockTime()
      nonce++

      fillMakerOrder(
        makerAsk,
        tokenId,
        makerChain.erc20Mock.address,
        makerChain.nftMock.address,
        makerChain.strategy.address,
        maker.address,
        blockTime,
        price,
        nonce
      )
      fillTakerOrder(takerBid, taker.address, tokenId, price)

      makerAsk.encodeParams(makerChain.chainId, ethers.constants.AddressZero, 0)
      takerBid.encodeParams(takerChain.chainId, takerChain.erc20Mock.address, takerChain.nftMock.address, takerChain.strategy.address, 0)
      await makerAsk.sign(maker)

      await makerChain.nftMock.connect(maker).approve(makerChain.transferManager721.address, tokenId)
      await takerChain.erc20Mock.connect(taker).approve(takerChain.fundManager.address, price)

      const destAirdrop = toWei(0.3)
      const [omnixFee, currencyFee, nftFee] = await takerChain.omniXExchange.connect(taker).getLzFeesForTrading(takerBid, makerAsk, destAirdrop)

      const tx = await takerChain.omniXExchange.connect(taker).matchAskWithTakerBid(destAirdrop, takerBid, makerAsk, {value: omnixFee.add(currencyFee).add(nftFee)})
      await tx.wait()
      expect(await makerChain.nftMock.ownerOf(takerBid.tokenId)).to.eq(taker.address)
    })

    it('MakerAsk /w TakerBid - $OMNI /w Normal NFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)
      const tokenId = 2
      const price = toWei(1)
      const blockTime = await getBlockTime()
  
      nonce++

      fillMakerOrder(
        makerAsk,
        tokenId,
        makerChain.omni.address,
        makerChain.nftMock.address,
        makerChain.strategy.address,
        maker.address,
        blockTime,
        price,
        nonce
      )
      fillTakerOrder(takerBid, taker.address, tokenId, price)
  
      makerAsk.encodeParams(makerChain.chainId, ethers.constants.AddressZero, 0)
      takerBid.encodeParams(takerChain.chainId, takerChain.omni.address, takerChain.nftMock.address, takerChain.strategy.address, 0)
      await makerAsk.sign(maker)
  
      await makerChain.nftMock.connect(maker).approve(makerChain.transferManager721.address, tokenId)
      await takerChain.omni.connect(taker).approve(takerChain.fundManager.address, price)

      const oldBalance = await makerChain.omni.balanceOf(maker.address)

      const destAirdrop = toWei(0.3)
      const [omnixFee, currencyFee, nftFee] = await takerChain.omniXExchange.getLzFeesForTrading(takerBid, makerAsk, destAirdrop)
      await (await takerChain.omniXExchange.connect(taker).matchAskWithTakerBid(destAirdrop, takerBid, makerAsk, {value: omnixFee.add(currencyFee).add(nftFee), gasLimit: 30000000 })).wait()
  
      expect(await makerChain.nftMock.ownerOf(takerBid.tokenId)).to.eq(taker.address)
      expect(await makerChain.omni.balanceOf(maker.address)).to.eq(oldBalance.add(toWei(0.98)))
    })

    // it('MakerAsk /w TakerBid - $OMNI /w ONFT', async () => {
    //   const makerAsk: MakerOrder = new MakerOrder(true)
    //   const takerBid: TakerOrder = new TakerOrder(false)
    //   const tokenId = 1
    //   const price = toWei(1)
    //   const blockTime = await getBlockTime()
  
    //   nonce++

    //   fillMakerOrder(
    //     makerAsk,
    //     tokenId,
    //     makerChain.omni.address,
    //     makerChain.onft721.address,
    //     makerChain.strategy.address,
    //     maker.address,
    //     blockTime,
    //     price,
    //     nonce
    //   )
    //   fillTakerOrder(takerBid, taker.address, tokenId, price)
  
    //   makerAsk.encodeParams(makerChain.chainId)
    //   takerBid.encodeParams(takerChain.chainId, takerChain.omni.address, takerChain.onft721.address, takerChain.strategy.address, 0)
    //   await makerAsk.sign(maker)
  
    //   await makerChain.onft721.connect(maker).approve(makerChain.transferManager721.address, tokenId)
    //   await takerChain.omni.connect(taker).approve(takerChain.fundManager.address, price)

    //   const oldBalance = await makerChain.omni.balanceOf(maker.address)

    //   const destAirdrop = toWei(0.3)
    //   const [omnixFee, currencyFee, nftFee] = await takerChain.omniXExchange.getLzFeesForTrading(takerBid, makerAsk, destAirdrop)
    //   await takerChain.omniXExchange.connect(taker).matchAskWithTakerBid(destAirdrop, takerBid, makerAsk, {value: omnixFee.add(currencyFee).add(nftFee)})
  
    //   expect(await makerChain.onft721.ownerOf(takerBid.tokenId)).to.eq(taker.address)
    //   // expect(await makerChain.omni.balanceOf(maker.address)).to.eq(oldBalance.add(toWei(0.98)))
    // })

    it('MakerBid /w TakerAsk - Normal Currency /w Normal NFT', async () => {
      const makerBid: MakerOrder = new MakerOrder(false)
      const takerAsk: TakerOrder = new TakerOrder(true)
      const tokenId = 1
      const price = toWei(1)
      const blockTime = await getBlockTime()

      nonce++

      fillMakerOrder(
        makerBid,
        tokenId,
        makerChain.erc20Mock.address,
        makerChain.nftMock.address,
        makerChain.strategy.address,
        maker.address,
        blockTime,
        price,
        nonce
      )
      fillTakerOrder(takerAsk, taker.address, tokenId, price)

      makerBid.encodeParams(makerChain.chainId, ethers.constants.AddressZero, 0)
      takerAsk.encodeParams(takerChain.chainId, takerChain.erc20Mock.address, takerChain.nftMock.address, takerChain.strategy.address, 0)
      await makerBid.sign(maker)

      await takerChain.nftMock.connect(taker).approve(takerChain.transferManager721.address, tokenId)
      await makerChain.erc20Mock.connect(maker).approve(makerChain.fundManager.address, price)

      const oldBalance = await makerChain.erc20Mock.balanceOf(taker.address)
      const destAirdrop = toWei(0.3);
      const [omnixFee, currencyFee, nftFee] = await takerChain.omniXExchange.getLzFeesForTrading(takerAsk, makerBid, destAirdrop)
      await takerChain.omniXExchange.connect(taker).matchBidWithTakerAsk(destAirdrop, takerAsk, makerBid, { value: omnixFee.add(currencyFee).add(nftFee) })

      expect(await takerChain.nftMock.ownerOf(takerAsk.tokenId)).to.eq(maker.address)
      expect(await makerChain.erc20Mock.balanceOf(taker.address)).to.eq(oldBalance.add(toWei(0.98)))
    })

    // it('MakerBid /w TakerAsk - $OMNI /w ONFT', async () => {
    //   const makerBid: MakerOrder = new MakerOrder(false)
    //   const takerAsk: TakerOrder = new TakerOrder(true)
    //   const tokenId = 10001
    //   const price = toWei(1)
    //   const blockTime = await getBlockTime()
  
    //   nonce++

    //   fillMakerOrder(
    //     makerBid,
    //     tokenId,
    //     makerChain.omni.address,
    //     makerChain.onft721.address,
    //     makerChain.strategy.address,
    //     maker.address,
    //     blockTime,
    //     price,
    //     nonce
    //   )
    //   fillTakerOrder(takerAsk, taker.address, tokenId, price)
  
    //   makerBid.encodeParams(makerChain.chainId)
    //   takerAsk.encodeParams(takerChain.chainId, takerChain.omni.address, takerChain.onft721.address, takerChain.strategy.address, 0)
    //   await makerBid.sign(maker)

    //   await takerChain.onft721.connect(taker).approve(takerChain.transferManager721.address, tokenId)
    //   await makerChain.omni.connect(maker).approve(makerChain.fundManager.address, price)

    //   const oldBalance = await takerChain.omni.balanceOf(taker.address)

    //   let destAirdrop = await makerChain.fundManager.lzFeeTransferCurrency(makerChain.omni.address, taker.address, price, makerChain.chainId, takerChain.chainId)
    //   destAirdrop = destAirdrop.add(toWei(0.3))
    //   const [omnixFee, currencyFee, nftFee] = await takerChain.omniXExchange.getLzFeesForTrading(takerAsk, makerBid, destAirdrop)
    //   await takerChain.omniXExchange.connect(taker).matchBidWithTakerAsk(destAirdrop, takerAsk, makerBid, { value: omnixFee.add(currencyFee).add(nftFee) })

    //   expect(await takerChain.onft721.ownerOf(takerAsk.tokenId)).to.eq(maker.address)
    //   expect(await takerChain.omni.balanceOf(taker.address)).to.eq(oldBalance.add(toWei(0.98)))
    // })

    it('MakerAsk /w TakerBid - Native ETH /w Normal NFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)
      const tokenId = 3
      const price = toWei(1)
      const blockTime = await getBlockTime()
      nonce++

      fillMakerOrder(
        makerAsk,
        tokenId,
        makerChain.weth.address,
        makerChain.nftMock.address,
        makerChain.strategy.address,
        maker.address,
        blockTime,
        price,
        nonce
      )
      fillTakerOrder(takerBid, taker.address, tokenId, price)

      makerAsk.encodeParams(makerChain.chainId, ethers.constants.AddressZero, 0)
      takerBid.encodeParams(takerChain.chainId, takerChain.weth.address, takerChain.nftMock.address, takerChain.strategy.address, 0)
      await makerAsk.sign(maker)

      await makerChain.nftMock.connect(maker).approve(makerChain.transferManager721.address, tokenId)

      const destAirdrop = toWei(0.3)
      const [omnixFee, currencyFee, nftFee] = await takerChain.omniXExchange.connect(taker).getLzFeesForTrading(takerBid, makerAsk, destAirdrop)

      await takerChain.omniXExchange.connect(taker).matchAskWithTakerBidUsingETHAndWETH(destAirdrop, takerBid, makerAsk, {value: omnixFee.add(currencyFee).add(nftFee).add(price)})

      expect(await makerChain.nftMock.ownerOf(takerBid.tokenId)).to.eq(taker.address)
    })

    it('MakerAsk /w TakerBid - Royalty - Normal Currency /w Normal NFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)
      const tokenId = 4
      const price = toWei(1)
      const blockTime = await getBlockTime()
      nonce++

      fillMakerOrder(
        makerAsk,
        tokenId,
        makerChain.erc20Mock.address,
        makerChain.nftMock.address,
        makerChain.strategy.address,
        maker.address,
        blockTime,
        price,
        nonce
      )
      fillTakerOrder(takerBid, taker.address, tokenId, price)

      makerAsk.encodeParams(makerChain.chainId, royaltyRecipient.address, 500)
      takerBid.encodeParams(takerChain.chainId, takerChain.erc20Mock.address, takerChain.nftMock.address, takerChain.strategy.address, 0)
      await makerAsk.sign(maker)

      await makerChain.nftMock.connect(maker).approve(makerChain.transferManager721.address, tokenId)
      await takerChain.erc20Mock.connect(taker).approve(takerChain.fundManager.address, price)

      const [destAirdrop,] = await makerChain.layerZeroEndpoint.estimateFees(
        takerChain.chainId,
        makerChain.omniXExchange.address,
        ethers.utils.defaultAbiCoder.encode(['uint8', 'uint256', 'uint8'], [0, 0, 0]),
        false,
        ethers.utils.solidityPack(["uint16", "uint256", "uint256", "address"], [2, 250000, 0, takerChain.omniXExchange.address])
      )
      const [omnixFee, currencyFee, nftFee] = await takerChain.omniXExchange.connect(taker).getLzFeesForTrading(takerBid, makerAsk, destAirdrop)

      const tx = await takerChain.omniXExchange.connect(taker).matchAskWithTakerBid(destAirdrop, takerBid, makerAsk, {value: omnixFee.add(currencyFee).add(nftFee)})
      await tx.wait()
      expect(await makerChain.nftMock.ownerOf(takerBid.tokenId)).to.eq(taker.address)
      expect(await takerChain.erc20Mock.balanceOf(royaltyRecipient.address)).to.eq(price.mul(500).div(10000))
    })
  })
})