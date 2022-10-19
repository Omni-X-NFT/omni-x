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
  Chain,
  deployContract
} from './shared'
import {
  setEthers,
  TakerOrder,
  MakerOrder
} from '../utils/order-types'
import { fillMakerOrder, fillTakerOrder } from '../tasks/shared'
import { Bridge, Factory, Router, StargatePoolManager } from '../typechain-types'

chai.use(solidity)
const { expect } = chai

setEthers(ethers)

const SRC_CHAIN_ID = 1
const DST_CHAIN_ID = 2
const SRC_POOL_ID = 1
const DST_POOL_ID = 2

export const prepareStargate = async (chain: Chain, poolId: number, owner: SignerWithAddress) => {
  // prepare stargate
  const stargateRouter = await deployContract('Router', owner, []) as Router
  const stargateBridge = await deployContract('Bridge', owner, [chain.layerZeroEndpoint.address, stargateRouter.address]) as Bridge
  const stargateFactory = await deployContract('Factory', owner, [stargateRouter.address]) as Factory
  const stargateFeeLibrary = await deployContract('StargateFeeLibraryMock', owner, [])
  await stargateFactory.setDefaultFeeLibrary(stargateFeeLibrary.address)
  await stargateRouter.setBridgeAndFactory(stargateBridge.address, stargateFactory.address)

  // add pool
  await stargateRouter.connect(owner).createPool(
    poolId, chain.erc20Mock.address,
    18,
    18,
    'pool',
    'SSS')

  // set stargate pool manager to omniXExchange
  chain.stargatePoolManager = await deployContract('StargatePoolManager', owner, [stargateRouter.address]) as StargatePoolManager
  await chain.omniXExchange.setStargatePoolManager(chain.stargatePoolManager.address)

  // save stargate router address
  chain.stargateRouter = stargateRouter
  chain.stargateBridge = stargateBridge
}

export const setupChainPath = async (chain: Chain, dstChainId: number, srcPoolId: number, dstPoolId: number, owner: SignerWithAddress) => {
  // create chain path
  const stargateRouter = chain.stargateRouter as Router
  await stargateRouter.createChainPath(srcPoolId, dstChainId, dstPoolId, 1)
  await stargateRouter.activateChainPath(srcPoolId, dstChainId, dstPoolId)

  // set pool to stargate pool manager
  await chain.stargatePoolManager.connect(owner).setPoolId(chain.erc20Mock.address, dstChainId, srcPoolId, dstPoolId)
}

export const setupBridge = async (src: Chain, dst: Chain) => {
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.stargateBridge.address, dst.layerZeroEndpoint.address)
  await src.stargateBridge.setBridge(dst.chainId, dst.stargateBridge.address)
}

export const setupPool = async (chain: Chain, dstChainId: number, srcPoolId: number, dstPoolId: number, owner: SignerWithAddress) => {
  const stargateRouter = chain.stargateRouter as Router

  await chain.erc20Mock.connect(owner).approve(stargateRouter.address, toWei(100))
  await stargateRouter.connect(owner).addLiquidity(srcPoolId, toWei(100), owner.address)

  await stargateRouter.sendCredits(dstChainId, srcPoolId, dstPoolId, owner.address, { value: toWei(1) })
}

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

    await approveMaker(makerChain, maker)
    await approveTaker(takerChain, taker)

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

      const makerBalance = await makerChain.erc20Mock.balanceOf(maker.address)

      await takerChain.erc20Mock.connect(taker).approve(takerChain.stargatePoolManager.address, toWei(1))

      const fee = await takerChain.omniXExchange.connect(taker).getLzFeesForAskWithTakerBid(takerBid, makerAsk)
      await takerChain.omniXExchange.connect(taker).matchAskWithTakerBid(takerBid, makerAsk, { value: fee })

      expect(await makerChain.nftMock.ownerOf(takerBid.tokenId)).to.eq(taker.address)
      expect(await makerChain.erc20Mock.balanceOf(maker.address)).to.eq(makerBalance.add(toWei(0.98)))
    })
  })
})