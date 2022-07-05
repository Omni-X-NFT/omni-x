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
import { fillMakerOrder, fillTakerOrder } from '../tasks/shared'

chai.use(solidity)
const { expect } = chai

setEthers(ethers)

const SRC_CHAIN_ID = 1
const DST_CHAIN_ID = 2

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
      const nonce = 1
      const blockTime = await getBlockTime()

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

      makerAsk.encodeParams(await makerChain.chainId, taker.address)
      takerBid.encodeParams(await takerChain.chainId)
      await makerAsk.sign(maker)

      await takerChain.omniXExchange.connect(taker).matchAskWithTakerBid(takerBid, makerAsk)

      expect(await makerChain.nftMock.ownerOf(takerBid.tokenId)).to.eq(taker.address)
    })

    it('MakerAsk /w TakerBid - $OMNI /w Ghosts', async () => {
      // we can't test Ghosts transfer
      // because TransferManagerGhosts should be deployed as same address to different chains.
      // but in test environment, we can't do this.
    })
  })

  it('MakerAsk /w TakerBid - $OMNI /w ONFT', async () => {
    const makerAsk: MakerOrder = new MakerOrder(true)
    const takerBid: TakerOrder = new TakerOrder(false)
    const tokenId = 1
    const nonce = 3
    const blockTime = await getBlockTime()

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

    makerAsk.encodeParams(await makerChain.chainId, taker.address)
    takerBid.encodeParams(await takerChain.chainId)
    await makerAsk.sign(maker)

    await takerChain.omniXExchange.connect(taker).matchAskWithTakerBid(takerBid, makerAsk)

    expect(await takerChain.onft721.ownerOf(takerBid.tokenId)).to.eq(taker.address)
    expect(await makerChain.omni.balanceOf(maker.address)).to.eq(toWei(0.98))
  })
})
