import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import {
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
import * as GregNft from '../artifacts/contracts/token/onft/AdvancedONT.sol/AdvancedONT.json'

chai.use(solidity)
const { expect } = chai

export const testGhosts = async (args: any) => {
  // @ts-ignore
  const { ethers, network } = hre;

  const [ owner, maker, taker ] = await ethers.getSigners()
  const omnixExchangeAddr = (CONTRACTS.omnixExchange as any)[network]
  const strategyAddr = (CONTRACTS.strategy as any)[network]
  const nftAddr = (CONTRACTS.gregs as any)[network]
  const gregTransferAddr = (CONTRACTS.gregTransfer as any)[network]
  const currencyAddr = (CONTRACTS.erc20 as any)[network]

  const omnixAbi = OmniXEchange.abi
  const nftAbi = GregNft.abi

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
    await makerAsk.serialize('./artifacts/makerAsk.json')

    makerAsk.encodeParams(await maker.getChainId(), taker.address)
    await makerAsk.sign(maker, omnixExchangeAddr)

    // approve
    const nftContract = createContract(ethers, nftAddr, nftAbi, maker)
    await nftContract.approve(gregTransferAddr, tokenId)
  }
  
  const testMakerAskTakerBid = async (tokenId: number) => {
    const makerAsk: MakerOrder = MakerOrder.deserialize('./artifacts/makerAsk.json')
    const takerBid: TakerOrder = new TakerOrder(false)

    const omnixContract = createContract(ethers, omnixExchangeAddr, omnixAbi, taker)
    
    fillTakerOrder(takerBid, tokenId)
    takerBid.encodeParams(await taker.getChainId())

    await omnixContract.matchAskWithTakerBid(takerBid, makerAsk);

    // expect(await nftMock.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
  }

  switch (args.step) {
    case 'make':
      prepareTest(args.tokenId, args.nonce)
      break
    case 'take':
      testMakerAskTakerBid(args.tokenId)
      break
  }
}
