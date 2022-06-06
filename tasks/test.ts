import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import {
  setEthers,
  TakerOrder,
  MakerOrder
} from '../utils/order-types'
import {
  CONTRACTS,
  createContract,
  toWei,
  getBlockTime
} from './shared'
import * as OmniXEchange from '../artifacts/contracts/core/OmniXExchange.sol/OmniXExchange.json'
import * as GhostNft from './fixtures/Gh0stlyGh0sts.json'

chai.use(solidity)
const { expect } = chai

export const testGhosts = async (args: any) => {
  // @ts-ignore
  const { ethers, network: {name: network} } = hre;

  setEthers(ethers)

  const [ maker, taker ] = await ethers.getSigners()
  const omnixExchangeAddr = (CONTRACTS.omnixExchange as any)[network]
  const strategyAddr = (CONTRACTS.strategy as any)[network]
  const nftAddr = (CONTRACTS.ghosts as any)[network]
  const ghostTransferAddr = (CONTRACTS.ghostTransfer as any)[network]
  const currencyAddr = (CONTRACTS.erc20 as any)[network]

  const omnixAbi = OmniXEchange.abi
  const nftAbi = GhostNft.abi

  const fillMakerOrder = async (
    makeOrder : MakerOrder,
    tokenId: number,
    currency: string,
    nftAddress: string,
    nonce: number
  ) => {
    makeOrder.tokenId = tokenId
    makeOrder.currency = currency
    makeOrder.price = toWei(ethers, 1)
    makeOrder.amount = 1
    makeOrder.collection = nftAddress
    makeOrder.strategy = strategyAddr
    makeOrder.nonce = nonce
    makeOrder.startTime = await getBlockTime(ethers)
    makeOrder.endTime = makeOrder.startTime + 3600 * 30
    makeOrder.minPercentageToAsk = 900
    makeOrder.signer = maker.address
  }

  const fillTakerOrder = (
    takerOrder : TakerOrder,
    tokenId: number
  ) => {
    takerOrder.tokenId = tokenId
    takerOrder.price = toWei(ethers, 1)
    takerOrder.minPercentageToAsk = 900
    takerOrder.taker = taker.address
  }

  const prepareTest = async (tokenId: number, nonce: number) => {
    // make order
    const makerAsk: MakerOrder = new MakerOrder(true)
    await fillMakerOrder(makerAsk, tokenId, currencyAddr, nftAddr, nonce)

    makerAsk.encodeParams(await maker.getChainId(), taker.address)
    await makerAsk.sign(maker, omnixExchangeAddr)

    makerAsk.serialize('./artifacts/makerAsk.json')

    // approve
    const nftContract = createContract(ethers, nftAddr, nftAbi, maker)
    await nftContract.approve(ghostTransferAddr, tokenId)
  }
  
  const testMakerAskTakerBid = async (tokenId: number) => {
    const makerAsk: MakerOrder = MakerOrder.deserialize('./artifacts/makerAsk.json')
    const takerBid: TakerOrder = new TakerOrder(false)

    const omnixContract = createContract(ethers, omnixExchangeAddr, omnixAbi, taker)
    
    fillTakerOrder(takerBid, tokenId)
    takerBid.encodeParams(await taker.getChainId())

    // listing
    await omnixContract.matchAskWithTakerBid(takerBid, makerAsk);

    // checking
    const nftContract = createContract(ethers, nftAddr, nftAbi, taker)
    expect(await nftContract.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
  }

  const {step, tokenid: tokenId, nonce} = args

  switch (step) {
    case 'make':
      await prepareTest(tokenId, nonce)
      break
    case 'take':
      await testMakerAskTakerBid(tokenId)
      break
  }
}
