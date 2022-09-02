import { ethers } from 'hardhat'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import {
  getBlockTime,
  toWei,
  deploy,
  linkChains,
  approveMaker,
  approveTaker,
  prepareMaker,
  prepareTaker,
  Chain
} from './shared'
import {
  setEthers,
  TakerOrder,
  MakerOrder
} from '../utils/order-types'
import { fillMakerOrder, fillTakerOrder, waitFor } from '../tasks/shared'

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

  before(async () => {
    [owner, maker, taker] = await ethers.getSigners()

    makerChain = await deploy(owner, SRC_CHAIN_ID)
    takerChain = await deploy(owner, DST_CHAIN_ID)

    await linkChains(makerChain, takerChain)
    await linkChains(takerChain, makerChain)

    await prepareMaker(makerChain, maker)
    await prepareTaker(takerChain, taker)

    await approveMaker(makerChain, maker)
    await approveTaker(takerChain, taker)
  })

  describe('Exchange Process Cross chain', () => {
    it('MakerAsk /w TakerBid - Normal Currency /w Normal NFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)
      const tokenId = 1
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
        toWei(1),
        nonce
      )
      fillTakerOrder(takerBid, taker.address, tokenId, toWei(1))

      makerAsk.encodeParams(makerChain.chainId, taker.address)
      takerBid.encodeParams(takerChain.chainId)
      await makerAsk.sign(maker)

      const lzFee = await takerChain.omniXExchange.connect(taker).getLzFeesForAskWithTakerBid(takerBid, makerAsk)

      await takerChain.omniXExchange.connect(taker).matchAskWithTakerBid(takerBid, makerAsk, {value: lzFee})

      expect(await makerChain.nftMock.ownerOf(takerBid.tokenId)).to.eq(taker.address)
    })

    it('MakerAsk /w TakerBid - $OMNI /w Ghosts', async () => {
      // we can't test Ghosts transfer
      // because TransferManagerGhosts should be deployed as same address to different chains.
      // but in test environment, we can't do this.
    })

    it('MakerAsk /w TakerBid - $OMNI /w Normal NFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)
      const tokenId = 2
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
        toWei(1),
        nonce
      )
      fillTakerOrder(takerBid, taker.address, tokenId, toWei(1))
  
      makerAsk.encodeParams(makerChain.chainId, taker.address)
      takerBid.encodeParams(takerChain.chainId)
      await makerAsk.sign(maker)
  
      const lzFee = await takerChain.omniXExchange.getLzFeesForAskWithTakerBid(takerBid, makerAsk)
      await takerChain.omniXExchange.connect(taker).matchAskWithTakerBid(takerBid, makerAsk, {value: lzFee})
  
      expect(await makerChain.nftMock.ownerOf(takerBid.tokenId)).to.eq(taker.address)
      expect(await makerChain.omni.balanceOf(maker.address)).to.eq(toWei(0.98))
    })

    it('MakerAsk /w TakerBid - $OMNI /w ONFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)
      const tokenId = 1
      const blockTime = await getBlockTime()
  
      nonce++

      fillMakerOrder(
        makerAsk,
        tokenId,
        makerChain.omni.address,
        makerChain.onft721.address,
        makerChain.strategy.address,
        maker.address,
        blockTime,
        toWei(1),
        nonce
      )
      fillTakerOrder(takerBid, taker.address, tokenId, toWei(1))
  
      makerAsk.encodeParams(makerChain.chainId, taker.address)
      takerBid.encodeParams(takerChain.chainId)
      await makerAsk.sign(maker)
  
      const oldBalance = await makerChain.omni.balanceOf(maker.address)

      const lzFee = await takerChain.omniXExchange.getLzFeesForAskWithTakerBid(takerBid, makerAsk)
      await takerChain.omniXExchange.connect(taker).matchAskWithTakerBid(takerBid, makerAsk, {value: lzFee})
  
      expect(await takerChain.onft721.ownerOf(takerBid.tokenId)).to.eq(taker.address)
      expect(await makerChain.omni.balanceOf(maker.address)).to.eq(oldBalance.add(toWei(0.98)))
    })

    it('MakerBid /w TakerAsk - Normal Currency /w Normal NFT', async () => {
      const makerBid: MakerOrder = new MakerOrder(false)
      const takerAsk: TakerOrder = new TakerOrder(true)
      const tokenId = 3
      const blockTime = await getBlockTime()

      nonce++

      fillMakerOrder(
        makerBid,
        tokenId,
        makerChain.erc20Mock.address,
        makerChain.nftMock.address,
        makerChain.strategy.address,
        taker.address,
        blockTime,
        toWei(1),
        nonce
      )
      fillTakerOrder(takerAsk, maker.address, tokenId, toWei(1))

      makerBid.encodeParams(takerChain.chainId, maker.address)
      takerAsk.encodeParams(makerChain.chainId)
      await makerBid.sign(taker)

      const oldBalance = await takerChain.erc20Mock.balanceOf(maker.address)
      const lzFee = await makerChain.omniXExchange.getLzFeesForBidWithTakerAsk(takerAsk, makerBid)
      await makerChain.omniXExchange.connect(maker).matchBidWithTakerAsk(takerAsk, makerBid, { value: lzFee })

      expect(await makerChain.nftMock.ownerOf(takerAsk.tokenId)).to.eq(taker.address)
      expect(await takerChain.erc20Mock.balanceOf(maker.address)).to.eq(oldBalance.add(toWei(0.98)))
    })

    it('MakerBid /w TakerAsk - $OMNI /w ONFT', async () => {
      const makerBid: MakerOrder = new MakerOrder(false)
      const takerAsk: TakerOrder = new TakerOrder(true)
      const tokenId = 3
      const blockTime = await getBlockTime()
  
      nonce++

      fillMakerOrder(
        makerBid,
        tokenId,
        makerChain.omni.address,
        makerChain.onft721.address,
        makerChain.strategy.address,
        taker.address,
        blockTime,
        toWei(1),
        nonce
      )
      fillTakerOrder(takerAsk, maker.address, tokenId, toWei(1))
  
      makerBid.encodeParams(takerChain.chainId, maker.address)
      takerAsk.encodeParams(makerChain.chainId)
      await makerBid.sign(taker)
  
      const oldBalance = await makerChain.omni.balanceOf(maker.address)
      const lzFee = await makerChain.omniXExchange.getLzFeesForBidWithTakerAsk(takerAsk, makerBid)
      await owner.sendTransaction({to: takerChain.omniXExchange.address, value: toWei(1)})
      await makerChain.omniXExchange.connect(maker).matchBidWithTakerAsk(takerAsk, makerBid, { value: lzFee })
  
      expect(await takerChain.onft721.ownerOf(takerAsk.tokenId)).to.eq(taker.address)
      expect(await makerChain.omni.balanceOf(maker.address)).to.eq(oldBalance.add(toWei(0.98)))
    })

  })
})
