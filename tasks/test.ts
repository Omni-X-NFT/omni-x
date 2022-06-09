import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import {
  setEthers,
  TakerOrder,
  MakerOrder
} from '../utils/order-types'
import {
  toWei,
  getBlockTime,
  createContractByName,
  getContractAddrByName,
  fillMakerOrder,
  fillTakerOrder
} from './shared'
import OmniXEchangeAbi from '../artifacts/contracts/core/OmniXExchange.sol/OmniXExchange.json'
import OFTMockAbi from '../artifacts/contracts/mocks/OFTMock.sol/OFTMock.json'
import GhostsNftAbi from './fixtures/Gh0stlyGh0sts.json'

chai.use(solidity)
const { expect } = chai

export const testGhosts = async (args: any) => {
  // @ts-ignore
  const _hre = hre
  const { ethers, network: {name: network} } = _hre

  setEthers(ethers)

  const [ maker, taker ] = await ethers.getSigners()

  const prepareTest = async (tokenId: number, nonce: number) => {
    // make order
    const makerAsk: MakerOrder = new MakerOrder(true)
    await fillMakerOrder(
      makerAsk,
      tokenId,
      getContractAddrByName(network, 'ONFTMock'),
      getContractAddrByName(network, 'ghosts'),
      getContractAddrByName(network, 'StrategyStandardSale'),
      maker.address,
      await getBlockTime(ethers),
      toWei(ethers, 1),
      nonce
    )

    makerAsk.encodeParams(await maker.getChainId(), taker.address)
    await makerAsk.sign(maker)

    // save
    makerAsk.serialize('./artifacts/makerAsk.json')

    // approve
    const nftContract = createContractByName(_hre, 'ghosts', GhostsNftAbi.abi, maker)
    await nftContract.approve(getContractAddrByName(network, 'TransferManagerGhosts'), tokenId)
  }
  
  const testMakerAskTakerBid = async (tokenId: number) => {
    // load maker order
    const makerAsk: MakerOrder = MakerOrder.deserialize('./artifacts/makerAsk.json')
    const takerBid: TakerOrder = new TakerOrder(false)

    // create contracts
    const omnixContract = createContractByName(_hre, 'OmniXExchange', OmniXEchangeAbi.abi, taker)
    const nftContract = createContractByName(_hre, 'ghosts', GhostsNftAbi.abi, taker)
    const omni = createContractByName(_hre, 'OFTMock', OFTMockAbi.abi, taker)

    // approve
    omni.connect(taker).approve(omnixContract.address, toWei(ethers, 100))

    // data
    fillTakerOrder(takerBid, taker.address, tokenId, toWei(ethers, 1))
    takerBid.encodeParams(await taker.getChainId())

    // listing
    await omnixContract.matchAskWithTakerBid(takerBid, makerAsk);

    // checking
    expect(await nftContract.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
    expect(await omni.balanceOf(maker.address)).to.eq(toWei(ethers, 0.98))
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
