import { ethers, waffle } from 'hardhat'
import { Contract } from 'ethers'
import { BigNumber } from '@ethersproject/bignumber'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
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
  Nft721Mock,
  ERC20Mock,
  OFTMock,
  ONFT721Mock,
  ONFT1155,
  GhostsMock,
  LZEndpointMock,
  TransferManagerGhosts,
  StargatePoolManager,
  IStargateRouter,
  Bridge,
  FundManager,
  StrategyStargateSale,
  WETH9,
  Router,
  Pool,
  Factory
} from '../typechain-types'

export type Chain = {
  omniXExchange: OmniXExchange
  stargatePoolManager: StargatePoolManager
  currencyManager: CurrencyManager
  executionManager: ExecutionManager
  transferSelector: TransferSelectorNFT
  transferManagerONFT721: TransferManagerONFT721
  transferManagerONFT1155: TransferManagerONFT1155
  transferManager721: TransferManagerERC721
  transferManagerGhosts: TransferManagerGhosts
  transferManager1155: TransferManagerERC1155
  royaltyFeeManager: RoyaltyFeeManager
  fundManager: FundManager
  strategy: StrategyStargateSale
  nftMock: Nft721Mock
  erc20Mock: ERC20Mock
  weth: WETH9
  omni: OFTMock
  onft721: ONFT721Mock
  ghosts: GhostsMock
  onft1155: ONFT1155
  layerZeroEndpoint: LZEndpointMock
  stargateRouter: IStargateRouter
  stargateBridge: Bridge
  chainId: number

  stargatePool: Pool
  stargateFactory: Factory
}

export const toWei = (amount: number | string): BigNumber => {
  return ethers.utils.parseEther(amount.toString())
}

export const deployContract = async (name: string, owner: any, initParams: Array<any>): Promise<Contract> => {
  const factory = await ethers.getContractFactory(name, owner)
  const contract = await factory.deploy(...initParams)
  return contract.deployed()
}

export const getBlockTime = async () => {
  return (await waffle.provider.getBlock('latest')).timestamp
}

export const deploy = async (owner: SignerWithAddress, chainId: number) => {
  const chain: any = {}
  // layerzero endpoint
  chain.layerZeroEndpoint = await deployContract('LZEndpointMock', owner, [chainId]) as LZEndpointMock
  // normal currency
  chain.erc20Mock = await deployContract('ERC20Mock', owner, []) as ERC20Mock
  chain.weth = await deployContract('WETH9', owner, []) as WETH9

  // normal nft
  chain.nftMock = await deployContract('Nft721Mock', owner, []) as Nft721Mock

  // omni currency
  chain.omni = await deployContract('OFTMock', owner, ['OMNI', 'OMNI', toWei(1000), chain.layerZeroEndpoint.address]) as OFTMock

  // omnichain nft
  chain.onft721 = await deployContract('ONFT721Mock', owner, ['ONFT', 'ONFT', chain.layerZeroEndpoint.address]) as ONFT721Mock
  chain.ghosts = await deployContract('GhostsMock', owner, ['Ghosts', 'gg', chain.layerZeroEndpoint.address]) as GhostsMock
  chain.onft1155 = await deployContract('ONFT1155', owner, ['https://localhost/', chain.layerZeroEndpoint.address]) as ONFT1155

  // currency manager
  chain.currencyManager = await deployContract('CurrencyManager', owner, []) as CurrencyManager

  // execution manager with strategy. protocal fee 200 = 2%
  chain.strategy = await deployContract('StrategyStargateSale', owner, []) as StrategyStargateSale
  chain.executionManager = await deployContract('ExecutionManager', owner, []) as ExecutionManager

  // royalty fee manager
  chain.royaltyFeeManager = await deployContract('RoyaltyFeeManager', owner, []) as RoyaltyFeeManager

  // looks rare exchange
  chain.omniXExchange = await deployContract('OmniXExchange', owner, [
    chain.currencyManager.address,
    chain.executionManager.address,
    chain.royaltyFeeManager.address,
    chain.weth.address,
    owner.address,
    chain.layerZeroEndpoint.address
  ]) as OmniXExchange

  // transfer selector
  chain.transferManager721 = await deployContract('TransferManagerERC721', owner, [chain.layerZeroEndpoint.address]) as TransferManagerERC721
  chain.transferManager1155 = await deployContract('TransferManagerERC1155', owner, [chain.layerZeroEndpoint.address]) as TransferManagerERC1155
  chain.transferManagerONFT721 = await deployContract('TransferManagerONFT721', owner, [chain.layerZeroEndpoint.address]) as TransferManagerONFT721
  chain.transferManagerONFT1155 = await deployContract('TransferManagerONFT1155', owner, [chain.layerZeroEndpoint.address]) as TransferManagerONFT1155
  chain.transferManagerGhosts = await deployContract('TransferManagerGhosts', owner, [chain.layerZeroEndpoint.address]) as TransferManagerGhosts
  chain.transferSelector = await deployContract('TransferSelectorNFT', owner, [chain.transferManager721.address, chain.transferManager1155.address, chain.transferManagerONFT721.address, chain.transferManagerONFT1155.address]) as TransferSelectorNFT
  chain.fundManager = await deployContract('FundManager', owner, [chain.omniXExchange.address]) as FundManager
  chain.chainId = chainId

  await chain.omniXExchange.setFundManager(chain.fundManager.address)

  return chain
}

export const linkChains = async (src: Chain, dst: Chain) => {
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.omni.address, dst.layerZeroEndpoint.address)
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.onft721.address, dst.layerZeroEndpoint.address)
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.ghosts.address, dst.layerZeroEndpoint.address)
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.onft1155.address, dst.layerZeroEndpoint.address)
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.transferManager721.address, dst.layerZeroEndpoint.address)
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.transferManager1155.address, dst.layerZeroEndpoint.address)
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.transferManagerONFT721.address, dst.layerZeroEndpoint.address)
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.transferManagerONFT1155.address, dst.layerZeroEndpoint.address)
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.transferManagerGhosts.address, dst.layerZeroEndpoint.address)
  await src.layerZeroEndpoint.setDestLzEndpoint(dst.omniXExchange.address, dst.layerZeroEndpoint.address)

  await src.omni.setTrustedRemoteAddress(await dst.chainId, dst.omni.address)
  await src.onft721.setTrustedRemoteAddress(await dst.chainId, dst.onft721.address)
  await src.ghosts.setTrustedRemoteAddress(await dst.chainId, dst.ghosts.address)
  await src.onft1155.setTrustedRemoteAddress(await dst.chainId, dst.onft1155.address)
  await src.transferManager721.setTrustedRemoteAddress(await dst.chainId, dst.transferManager721.address)
  await src.transferManager1155.setTrustedRemoteAddress(await dst.chainId, dst.transferManager1155.address)
  await src.transferManagerONFT721.setTrustedRemoteAddress(await dst.chainId, dst.transferManagerONFT721.address)
  await src.transferManagerGhosts.setTrustedRemoteAddress(await dst.chainId, dst.transferManagerGhosts.address)
  await src.transferManagerONFT1155.setTrustedRemoteAddress(await dst.chainId, dst.transferManagerONFT1155.address)
  await src.omniXExchange.setTrustedRemoteAddress(await dst.chainId, dst.omniXExchange.address)
  await src.fundManager.setTrustedRemoteAddress(await dst.chainId, dst.fundManager.address)
}

export const prepareMaker = async (chain: Chain, maker: SignerWithAddress) => {
  await chain.executionManager.addStrategy(chain.strategy.address)
  await chain.currencyManager.addCurrency(chain.erc20Mock.address)
  await chain.currencyManager.addCurrency(chain.omni.address)
  await chain.omniXExchange.updateTransferSelectorNFT(chain.transferSelector.address)

  // normal currency and normal nft, mint token#1, #2, #3
  await chain.nftMock.mint(maker.address)
  await chain.nftMock.mint(maker.address)
  await chain.nftMock.mint(maker.address)
  await chain.nftMock.mint(maker.address)
  await chain.nftMock.mint(maker.address)
  await chain.nftMock.mint(maker.address)

  await chain.onft721.mint(maker.address, 1)
  await chain.onft721.mint(maker.address, 2)
  await chain.onft721.mint(maker.address, 3)
  await chain.onft721.mint(maker.address, 4)
  await chain.ghosts.connect(maker).mint(1)

  await chain.erc20Mock.mint(maker.address, toWei(200))
  await chain.omni.transfer(maker.address, toWei(200))
  await chain.weth.deposit({ value: toWei(1) })
}

export const prepareTaker = async (chain: Chain, taker: SignerWithAddress) => {
  await chain.executionManager.addStrategy(chain.strategy.address)

  await chain.currencyManager.addCurrency(chain.erc20Mock.address)
  await chain.currencyManager.addCurrency(chain.omni.address)
  await chain.omniXExchange.updateTransferSelectorNFT(chain.transferSelector.address)

  // normal currency and normal nft, mint token#1, #2, #3
  await chain.erc20Mock.mint(taker.address, toWei(200))
  await chain.omni.transfer(taker.address, toWei(200))

  await chain.nftMock.mint(taker.address)
  await chain.nftMock.mint(taker.address)

  await chain.onft721.mint(taker.address, 10001)
  await chain.onft721.mint(taker.address, 10002)
}

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
  await src.stargateBridge.setBridge(dst.chainId, ethers.utils.solidityPack(['address', 'address'], [dst.stargateBridge.address, src.stargateBridge.address]))
  await src.stargateBridge.setGasAmount(dst.chainId, 1, 350000)
  await src.stargateBridge.setGasAmount(dst.chainId, 2, 350000)
}

export const setupPool = async (chain: Chain, dstChainId: number, srcPoolId: number, dstPoolId: number, owner: SignerWithAddress) => {
  const stargateRouter = chain.stargateRouter as Router

  await chain.erc20Mock.connect(owner).approve(stargateRouter.address, toWei(100))
  await stargateRouter.connect(owner).addLiquidity(srcPoolId, toWei(100), owner.address)

  await stargateRouter.sendCredits(dstChainId, srcPoolId, dstPoolId, owner.address, { value: toWei(3) })
}