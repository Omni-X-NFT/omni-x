import { ethers } from 'hardhat'
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
  LZEndpointMock,
  RemoteAddrManager
} from '../typechain-types'
import {
  deployContract, getBlockTime, toWei
} from '../utils/test-utils'
import {
  setEthers,
  TakerOrder,
  MakerOrder
} from '../utils/order-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { fillMakerOrder, fillTakerOrder } from '../tasks/shared'

chai.use(solidity)
const { expect } = chai

setEthers(ethers)

const STRATEGY_PROTOCAL_FEE = 200 // 2%
const ROYALTY_FEE_LIMIT = 500 // 5%

const SRC_CHAIN_ID = 1
const DST_CHAIN_ID = 2

type Chain = {
  omniXExchange: OmniXExchange
  currencyManager: CurrencyManager
  executionManager: ExecutionManager
  transferSelector: TransferSelectorNFT
  transferManagerONFT721: TransferManagerONFT721
  transferManagerONFT1155: TransferManagerONFT1155
  transferManager721: TransferManagerERC721
  transferManager1155: TransferManagerERC1155
  royaltyFeeManager: RoyaltyFeeManager
  strategy: StrategyStandardSale
  nftMock: Nft721Mock
  erc20Mock: LRTokenMock
  omni: OFTMock
  onft721: ONFT721Mock
  onft1155: ONFT1155
  layerZeroEndpoint: LZEndpointMock
  remoteAddrManager: RemoteAddrManager
  chainId: number
}

const deploy = async (owner: SignerWithAddress, chainId: number) => {
  const chain: any = {}
  // layerzero endpoint
  chain.layerZeroEndpoint = await deployContract('LZEndpointMock', owner, [chainId]) as LZEndpointMock
  // normal currency
  chain.erc20Mock = await deployContract('LRTokenMock', owner, []) as LRTokenMock

  // normal nft
  chain.nftMock = await deployContract('Nft721Mock', owner, []) as Nft721Mock

  // omni currency
  chain.omni = await deployContract('OFTMock', owner, ['OMNI', 'OMNI', toWei(1000), chain.layerZeroEndpoint.address]) as OFTMock

  // omnichain nft
  chain.onft721 = await deployContract('ONFT721Mock', owner, ['ONFT', 'ONFT', chain.layerZeroEndpoint.address]) as ONFT721Mock
  chain.onft1155 = await deployContract('ONFT1155', owner, ['https://localhost/', chain.layerZeroEndpoint.address]) as ONFT1155

  // currency manager
  chain.currencyManager = await deployContract('CurrencyManager', owner, []) as CurrencyManager

  // execution manager with strategy. protocal fee 200 = 2%
  chain.strategy = await deployContract('StrategyStandardSale', owner, [STRATEGY_PROTOCAL_FEE]) as StrategyStandardSale
  chain.executionManager = await deployContract('ExecutionManager', owner, []) as ExecutionManager

  // royalty fee manager
  const royaltyFeeRegistry = await deployContract('RoyaltyFeeRegistry', owner, [ROYALTY_FEE_LIMIT])
  chain.royaltyFeeManager = await deployContract('RoyaltyFeeManager', owner, [royaltyFeeRegistry.address]) as RoyaltyFeeManager
    
  // looks rare exchange
  chain.omniXExchange = await deployContract('OmniXExchange', owner, [
    chain.currencyManager.address,
    chain.executionManager.address,
    chain.royaltyFeeManager.address,
    ethers.constants.AddressZero,
    owner.address
  ]) as OmniXExchange

  chain.remoteAddrManager = await deployContract('RemoteAddrManager', owner, [])
  await chain.omniXExchange.setRemoteAddrManager(chain.remoteAddrManager.address)

  // transfer selector
  chain.transferManager721 = await deployContract('TransferManagerERC721', owner, [chain.omniXExchange.address, chain.layerZeroEndpoint.address]) as TransferManagerERC721
  chain.transferManager1155 = await deployContract('TransferManagerERC1155', owner, [chain.omniXExchange.address, chain.layerZeroEndpoint.address]) as TransferManagerERC1155
  chain.transferManagerONFT721 = await deployContract('TransferManagerONFT721', owner, [chain.omniXExchange.address, chain.layerZeroEndpoint.address]) as TransferManagerONFT721
  chain.transferManagerONFT1155 = await deployContract('TransferManagerONFT1155', owner, [chain.omniXExchange.address, chain.layerZeroEndpoint.address]) as TransferManagerONFT1155
  chain.transferSelector = await deployContract('TransferSelectorNFT', owner, [chain.transferManager721.address, chain.transferManager1155.address]) as TransferSelectorNFT

  chain.chainId = chainId

  return chain
}

const linkChains = async (src: Chain, dst: Chain) => {
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.omni.address, dst.layerZeroEndpoint.address)
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.onft721.address, dst.layerZeroEndpoint.address)
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.onft1155.address, dst.layerZeroEndpoint.address)
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.transferManager721.address, dst.layerZeroEndpoint.address)
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.transferManager1155.address, dst.layerZeroEndpoint.address)
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.transferManagerONFT721.address, dst.layerZeroEndpoint.address)
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.transferManagerONFT1155.address, dst.layerZeroEndpoint.address)

  await src.omni.setTrustedRemote(await dst.chainId, dst.omni.address)
  await src.onft721.setTrustedRemote(await dst.chainId, dst.onft721.address)
  await src.onft1155.setTrustedRemote(await dst.chainId, dst.onft1155.address)
  await src.transferManager721.setTrustedRemote(await dst.chainId, dst.transferManager721.address)
  await src.transferManager1155.setTrustedRemote(await dst.chainId, dst.transferManager1155.address)
  await src.transferManagerONFT721.setTrustedRemote(await dst.chainId, dst.transferManagerONFT721.address)
  await src.transferManagerONFT1155.setTrustedRemote(await dst.chainId, dst.transferManagerONFT1155.address)

  await src.remoteAddrManager.addRemoteAddress(dst.erc20Mock.address, dst.chainId, src.erc20Mock.address)
  await src.remoteAddrManager.addRemoteAddress(dst.strategy.address, dst.chainId, src.strategy.address)
  await src.remoteAddrManager.addRemoteAddress(dst.nftMock.address, dst.chainId, src.nftMock.address)
  await src.remoteAddrManager.addRemoteAddress(dst.omni.address, dst.chainId, src.omni.address)
  await src.remoteAddrManager.addRemoteAddress(dst.onft721.address, dst.chainId, src.onft721.address)
}

const prepareMaker = async (chain: Chain, maker: SignerWithAddress) => {
  await chain.executionManager.addStrategy(chain.strategy.address)
  await chain.currencyManager.addCurrency(chain.erc20Mock.address)
  await chain.currencyManager.addCurrency(chain.omni.address)

  await chain.transferSelector.addCollectionTransferManager(chain.onft721.address, chain.transferManagerONFT721.address)
  await chain.transferSelector.addCollectionTransferManager(chain.onft1155.address, chain.transferManagerONFT1155.address)
  await chain.omniXExchange.updateTransferSelectorNFT(chain.transferSelector.address)

  // normal currency and normal nft, mint token#1, #2, #3
  await chain.nftMock.mint(maker.address)
  await chain.nftMock.mint(maker.address)
  await chain.erc20Mock.mint(maker.address, toWei(100))

  await chain.onft721.mint(maker.address, 1)
  await chain.onft721.mint(maker.address, 2)
}

const prepareTaker = async (chain: Chain, taker: SignerWithAddress) => {
  await chain.executionManager.addStrategy(chain.strategy.address)

  await chain.currencyManager.addCurrency(chain.erc20Mock.address)
  await chain.currencyManager.addCurrency(chain.omni.address)

  await chain.transferSelector.addCollectionTransferManager(chain.onft721.address, chain.transferManagerONFT721.address)
  await chain.transferSelector.addCollectionTransferManager(chain.onft1155.address, chain.transferManagerONFT1155.address)
  await chain.omniXExchange.updateTransferSelectorNFT(chain.transferSelector.address)

  // normal currency and normal nft, mint token#1, #2, #3
  await chain.erc20Mock.mint(taker.address, toWei(100))
  await chain.omni.transfer(taker.address, toWei(200))
}

const approveMaker = async (chain: Chain, maker: SignerWithAddress) => {
  await chain.nftMock.connect(maker).approve(chain.transferManager721.address, 1)
  await chain.nftMock.connect(maker).approve(chain.transferManager721.address, 2)

  await chain.onft721.connect(maker).approve(chain.transferManagerONFT721.address, 1)
  await chain.onft721.connect(maker).approve(chain.transferManagerONFT721.address, 2)
}

const approveTaker = async (chain: Chain, taker: SignerWithAddress) => {
  await chain.erc20Mock.connect(taker).approve(chain.omniXExchange.address, toWei(100))
  await chain.omni.connect(taker).approve(chain.omniXExchange.address, toWei(100))
}

describe('OmniXExchange', () => {
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

    it('MakerAsk /w TakerBid - $OMNI /w ONFT', async () => {

      const makerAsk: MakerOrder = new MakerOrder(true)
      const takerBid: TakerOrder = new TakerOrder(false)
      const tokenId = 1
      const nonce = 2
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
})
