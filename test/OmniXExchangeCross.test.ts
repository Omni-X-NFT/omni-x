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
import { BigNumber, BigNumberish } from 'ethers'

chai.use(solidity)
const { expect } = chai

setEthers(ethers)

const SRC_CHAIN_ID = 10001
const DST_CHAIN_ID = 10002
let nonce = 0
let tokenId = 1

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

    await prepareMaker(makerChain, takerChain, maker)
    await prepareTaker(takerChain, makerChain, taker)
  })

  describe('Exchange Process Cross chain', () => {
    it('MakerAsk /w TakerBid - Normal Currency /w Normal NFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)

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

    

      makerAsk.encodeParams(makerChain.lzChainId, ethers.constants.AddressZero, 0)
      takerBid.encodeParams(takerChain.lzChainId, takerChain.omni.address, takerChain.nftMock.address, takerChain.strategy.address, 0)
      await makerAsk.sign(maker)

      await makerChain.nftMock.connect(maker).approve(makerChain.transferManager721.address, tokenId)
      await takerChain.omni.connect(taker).approve(takerChain.fundManager.address, price)

      const destAirdrop = 0
      const [omnixFee, currencyFee, nftFee] = await takerChain.omniXExchange.connect(taker).getLzFeesForTrading(takerBid, makerAsk, destAirdrop)

      const tx = await takerChain.omniXExchange.connect(taker).matchAskWithTakerBid(destAirdrop, takerBid, makerAsk, { value: omnixFee.add(currencyFee).add(nftFee) })
      await tx.wait()
      expect(await makerChain.nftMock.ownerOf(takerBid.tokenId)).to.eq(taker.address)
      tokenId++
    })
    // it(' Multiple MakerAsks /w TakerBids - Normal Currency /w Normal NFT (Same Order Types)', async () => {
    //   const makerAsks: MakerOrder[] = []
    //   const takerBids: TakerOrder[] = []
    //   const destAirdrops: number[] = []
    //   const price = toWei(1)
    //   const blockTime = await getBlockTime()
    //   const numOfNFTS = 4
    //   let value: string = '0'
    //   for (let i = 0; i < numOfNFTS; i++) {
    //     nonce++
    //     tokenId++
    //     const makerAsk: MakerOrder = new MakerOrder(true)
    //     const takerBid: TakerOrder = new TakerOrder(false)
    //     fillMakerOrder(
    //       makerAsk,
    //       tokenId,
    //       makerChain.omni.address,
    //       makerChain.nftMock.address,
    //       makerChain.strategy.address,
    //       maker.address,
    //       blockTime,
    //       price,
    //       nonce
    //     )
    //     fillTakerOrder(takerBid, taker.address, tokenId, price)
  
    //     makerAsk.encodeParams(makerChain.lzChainId, ethers.constants.AddressZero, 0)
    //     takerBid.encodeParams(takerChain.lzChainId, takerChain.omni.address, takerChain.nftMock.address, takerChain.strategy.address, 0)
    //     await makerAsk.sign(maker)
  
    //     await makerChain.nftMock.connect(maker).approve(makerChain.transferManager721.address, tokenId)
    //     await takerChain.omni.connect(taker).approve(takerChain.fundManager.address, price)
  
    //     const destAirdrop = 0
    //     const [omnixFee, currencyFee, nftFee] = await takerChain.omniXExchange.connect(taker).getLzFeesForTrading(takerBid, makerAsk, destAirdrop)
      
    //     value = (ethers.BigNumber.from(value).add(omnixFee.add(currencyFee).add(nftFee))).toString()
    //     makerAsks.push(makerAsk)
    //     takerBids.push(takerBid)
    //     destAirdrops.push(destAirdrop)
    
    //   }
      

    //   const tx = await takerChain.omniXExchange.connect(taker).executeMultipleTakerBids(destAirdrops, takerBids, makerAsks, { value: ethers.BigNumber.from(value) })

     
    //   for (let i = 0; i < numOfNFTS; i++) {
    //     expect(await makerChain.nftMock.ownerOf(takerBids[i].tokenId)).to.eq(taker.address)
    //   }

    //   nonce++
    //   tokenId++
    // })

    it('MakerAsk /w TakerBid - $OMNI /w Normal NFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)
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

      makerAsk.encodeParams(makerChain.lzChainId, ethers.constants.AddressZero, 0)
      takerBid.encodeParams(takerChain.lzChainId, takerChain.omni.address, takerChain.nftMock.address, takerChain.strategy.address, 0)
      await makerAsk.sign(maker)

      await makerChain.nftMock.connect(maker).approve(makerChain.transferManager721.address, tokenId)
      await takerChain.omni.connect(taker).approve(takerChain.fundManager.address, price)

      const oldBalance = await makerChain.omni.balanceOf(maker.address)

      const destAirdrop = 0
      const [omnixFee, currencyFee, nftFee] = await takerChain.omniXExchange.getLzFeesForTrading(takerBid, makerAsk, destAirdrop)
      await (await takerChain.omniXExchange.connect(taker).matchAskWithTakerBid(destAirdrop, takerBid, makerAsk, { value: omnixFee.add(currencyFee).add(nftFee), gasLimit: 30000000 })).wait()

      expect(await makerChain.nftMock.ownerOf(takerBid.tokenId)).to.eq(taker.address)
      expect(await makerChain.omni.balanceOf(maker.address)).to.eq(oldBalance.add(toWei(0.98)))
      tokenId++
    })

    it('MakerBid /w TakerAsk - Normal Currency /w Normal NFT', async () => {
      const makerBid: MakerOrder = new MakerOrder(false)
      const takerAsk: TakerOrder = new TakerOrder(true)
      const tokenid = 1
      const price = toWei(1)
      const blockTime = await getBlockTime()

      nonce++

      fillMakerOrder(
        makerBid,
        tokenid,
        makerChain.omni.address,
        makerChain.nftMock.address,
        makerChain.strategy.address,
        maker.address,
        blockTime,
        price,
        nonce
      )
      fillTakerOrder(takerAsk, taker.address, tokenid, price)

      makerBid.encodeParams(makerChain.lzChainId, ethers.constants.AddressZero, 0)
      takerAsk.encodeParams(takerChain.lzChainId, takerChain.omni.address, takerChain.nftMock.address, takerChain.strategy.address, 0)
      await makerBid.sign(maker)

      await takerChain.nftMock.connect(taker).approve(takerChain.transferManager721.address, tokenid)
      await makerChain.omni.connect(maker).approve(makerChain.fundManager.address, price)

      const destAirdrop = await makerChain.fundManager.lzFeeTransferCurrency(
        makerChain.omni.address,
        makerBid.signer,
        takerAsk.price,
        makerChain.lzChainId,
        takerChain.lzChainId,
        '0x'
      )
      const [omnixFee, currencyFee, nftFee] = await takerChain.omniXExchange.getLzFeesForTrading(takerAsk, makerBid, destAirdrop)
      await takerChain.omniXExchange.connect(taker).matchBidWithTakerAsk(destAirdrop, takerAsk, makerBid, { value: omnixFee.add(currencyFee).add(nftFee) })

      expect(await takerChain.nftMock.ownerOf(takerAsk.tokenId)).to.eq(maker.address)
    })

    // it('MakerAsk /w TakerBid - Native ETH /w Normal NFT', async () => {
    //   const makerAsk: MakerOrder = new MakerOrder(true)
    //   const takerBid: TakerOrder = new TakerOrder(false)
    //   const price = toWei(1)
    //   const blockTime = await getBlockTime()
    //   nonce++

    //   fillMakerOrder(
    //     makerAsk,
    //     tokenId,
    //     makerChain.weth.address,
    //     makerChain.nftMock.address,
    //     makerChain.strategy.address,
    //     maker.address,
    //     blockTime,
    //     price,
    //     nonce
    //   )
    //   fillTakerOrder(takerBid, taker.address, tokenId, price)

    //   makerAsk.encodeParams(makerChain.lzChainId, ethers.constants.AddressZero, 0)
    //   takerBid.encodeParams(takerChain.lzChainId, takerChain.weth.address, takerChain.nftMock.address, takerChain.strategy.address, 0)
    //   await makerAsk.sign(maker)

    //   await makerChain.nftMock.connect(maker).approve(makerChain.transferManager721.address, tokenId)

    //   const destAirdrop = 0
    //   const [omnixFee, currencyFee, nftFee] = await takerChain.omniXExchange.connect(taker).getLzFeesForTrading(takerBid, makerAsk, destAirdrop)

    //   await takerChain.omniXExchange.connect(taker).matchAskWithTakerBidUsingETHAndWETH(destAirdrop, takerBid, makerAsk, { value: omnixFee.add(currencyFee).add(nftFee).add(price) })

    //   expect(await makerChain.nftMock.ownerOf(takerBid.tokenId)).to.eq(taker.address)
    // })

  //   it('MakerAsk /w TakerBid - Royalty - Normal Currency /w Normal NFT', async () => {
  //     const makerAsk: MakerOrder = new MakerOrder(true)
  //     const takerBid: TakerOrder = new TakerOrder(false)
  //     const tokenid = 4
  //     const price = toWei(1)
  //     const blockTime = await getBlockTime()
  //     nonce++

  //     fillMakerOrder(
  //       makerAsk,
  //       tokenid,
  //       makerChain.omni.address,
  //       makerChain.nftMock.address,
  //       makerChain.strategy.address,
  //       maker.address,
  //       blockTime,
  //       price,
  //       nonce
  //     )
  //     fillTakerOrder(takerBid, taker.address, tokenid, price)

  //     makerAsk.encodeParams(makerChain.lzChainId, royaltyRecipient.address, 500)
  //     takerBid.encodeParams(takerChain.lzChainId, takerChain.omni.address, takerChain.nftMock.address, takerChain.strategy.address, 0)
  //     await makerAsk.sign(maker)

  //     await makerChain.nftMock.connect(maker).approve(makerChain.transferManager721.address, tokenid)
  //     await takerChain.omni.connect(taker).approve(takerChain.fundManager.address, price)

  //     const destAirdrop = 0
  //     const [omnixFee, currencyFee, nftFee] = await takerChain.omniXExchange.connect(taker).getLzFeesForTrading(takerBid, makerAsk, destAirdrop)

  //     const tx = await takerChain.omniXExchange.connect(taker).matchAskWithTakerBid(destAirdrop, takerBid, makerAsk, { value: omnixFee.add(currencyFee).add(nftFee) })
  //     await tx.wait()
  //     expect(await makerChain.nftMock.ownerOf(takerBid.tokenId)).to.eq(taker.address)
  //     expect(await takerChain.omni.balanceOf(royaltyRecipient.address)).to.eq(price.mul(500).div(10000))
  //   })
   })
})
