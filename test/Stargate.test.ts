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
  Chain,
  prepareStargate,
  setupBridge,
  setupChainPath,
  setupPool
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

const SRC_CHAIN_ID = 1
const DST_CHAIN_ID = 2
const SRC_POOL_ID = 1
const DST_POOL_ID = 2

describe('Stargate', () => {
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

    await prepareStargate(makerChain, SRC_POOL_ID, owner)
    await prepareStargate(takerChain, DST_POOL_ID, owner)

    await setupBridge(makerChain, takerChain)
    await setupBridge(takerChain, makerChain)

    await setupChainPath(makerChain, DST_CHAIN_ID, SRC_POOL_ID, DST_POOL_ID, owner)
    await setupChainPath(takerChain, SRC_CHAIN_ID, DST_POOL_ID, SRC_POOL_ID, owner)

    await setupPool(makerChain, DST_CHAIN_ID, SRC_POOL_ID, DST_POOL_ID, maker)
    await setupPool(takerChain, SRC_CHAIN_ID, DST_POOL_ID, SRC_POOL_ID, taker)
  })

  describe('Swap ERC20 using Stargate', () => {
    it('MakerAsk /w TakerBid - Stable Coins /w Normal NFT', async () => {
      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)
      const tokenId = 1
      const nonce = 1
      const price = toWei(1)
      const blockTime = await getBlockTime()

      fillMakerOrder(
        makerAsk,
        tokenId,
        makerChain.erc20Mock.address,
        makerChain.nftMock.address,
        makerChain.strategy.address,
        maker.address,
        blockTime,
        ethers.BigNumber.from('1000000'),
        nonce
      )
      fillTakerOrder(takerBid, taker.address, tokenId, price)

      makerAsk.encodeParams(makerChain.chainId, ethers.constants.AddressZero, 0)
      takerBid.encodeParams(takerChain.chainId, takerChain.erc20Mock.address, takerChain.nftMock.address, takerChain.strategy.address, 112)
      await makerAsk.sign(maker)

      const makerBalance = await makerChain.erc20Mock.balanceOf(maker.address)

      await makerChain.nftMock.connect(maker).approve(makerChain.transferManager721.address, tokenId)
      await takerChain.erc20Mock.connect(taker).approve(takerChain.fundManager.address, price)
      await takerChain.erc20Mock.connect(taker).approve(takerChain.stargatePoolManager.address, price)

      const destAirdrop = 0

      const [omnixFee, currencyFee, nftFee] = await takerChain.omniXExchange.connect(taker).getLzFeesForTrading(takerBid, makerAsk, destAirdrop)

      await takerChain.omniXExchange.connect(taker).matchAskWithTakerBid(destAirdrop, takerBid, makerAsk, { value: omnixFee.add(currencyFee).add(nftFee) })

      expect(await makerChain.nftMock.ownerOf(takerBid.tokenId)).to.eq(taker.address)
      // expect(await makerChain.erc20Mock.balanceOf(maker.address)).to.eq(makerBalance.add(ethers.utils.parseUnits('0.98', 6)))
      expect(await makerChain.erc20Mock.balanceOf(maker.address)).to.eq(makerBalance.add(toWei(0.98)))
    })
  })
})
