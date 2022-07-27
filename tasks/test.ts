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
  fillTakerOrder,
  getChainId,
  loadAbi
} from './shared'
import GhostsNftAbi from './fixtures/Gh0stlyGh0sts.json'

const OmniXEchangeAbi = loadAbi('../artifacts/contracts/core/OmniXExchange.sol/OmniXExchange.json')
const OFTMockAbi = loadAbi('../artifacts/contracts/mocks/OFTMock.sol/OFTMock.json')

export const testGhosts = async (args: any) => {
  // @ts-ignore
  // eslint-disable-next-line
  const _hre = hre
  const { ethers, network: { name: network } } = _hre

  setEthers(ethers)

  const [owner, taker] = await ethers.getSigners()
  const maker = owner;

  const listing = async (tokenId: number, nonce: number) => {
    // make order
    const makerAsk: MakerOrder = new MakerOrder(true)
    await fillMakerOrder(
      makerAsk,
      tokenId,
      getContractAddrByName(network, 'OFTMock'),
      getContractAddrByName(network, 'ghosts'),
      getContractAddrByName(network, 'StrategyStandardSale'),
      maker.address,
      await getBlockTime(ethers),
      toWei(ethers, 0.01),
      nonce
    )

    makerAsk.encodeParams(getChainId(network), taker.address)
    await makerAsk.sign(maker)

    console.log(makerAsk)
    // save
    makerAsk.serialize('./makerAsk.json')

    // approve
    const nftContract = createContractByName(_hre, 'ghosts', GhostsNftAbi.abi, maker)
    await nftContract.approve(getContractAddrByName(network, 'TransferManagerGhosts'), tokenId)
  }

  const prepare = async () => {
    // create contracts
    const omnixContract = createContractByName(_hre, 'OmniXExchange', OmniXEchangeAbi().abi, taker)
    const omni = createContractByName(_hre, 'OFTMock', OFTMockAbi().abi, taker)

    // transfer omni to taker first
    const balance = await omni.balanceOf(taker.address)
    if (balance.lt(toWei(ethers, 1))) {
      await (await omni.connect(owner).transfer(taker.address, toWei(ethers, 100))).wait()

      console.log(`deposited 100 to ${taker.address}`)
    }

    // approve
    const allowance = await omni.allowance(taker.address, omnixContract.address)
    if (allowance.lt(toWei(ethers, 1))) {
      await (await omni.approve(omnixContract.address, toWei(ethers, 100))).wait()

      console.log(`omni.approve(${omnixContract.address}, 100)`)
    }
  }

  const buyListing = async (tokenId: number) => {
    // load maker order
    const makerAsk: MakerOrder = MakerOrder.deserialize('./makerAsk.json')
    const takerBid: TakerOrder = new TakerOrder(false)

    // create contracts
    const omnixContract = createContractByName(_hre, 'OmniXExchange', OmniXEchangeAbi().abi, taker)

    // data
    fillTakerOrder(takerBid, taker.address, tokenId, toWei(ethers, 0.01))
    takerBid.encodeParams(getChainId(network))

    // listing
    const lzFee = await omnixContract.connect(taker).getLzFeesForAskWithTakerBid(takerBid, makerAsk)

    console.log('lzFee: ', lzFee.toString())
    const tx = await omnixContract.connect(taker).matchAskWithTakerBid(takerBid, makerAsk, { value: lzFee })
    await tx.wait()

    console.log(`please check ${taker.address} wallet has Token#${tokenId} after a while.`)
    console.log(`[${network}] you can check the events or transactions of ${getContractAddrByName(network, 'TransferManagerGhosts')} wallet has Token#${tokenId} after a while.`)
  }

  const checkStatus = async (tokenId: number) => {
    // create contracts
    const nftContract = createContractByName(_hre, 'ghosts', GhostsNftAbi.abi, taker)
    const omni = createContractByName(_hre, 'OFTMock', OFTMockAbi().abi, taker)

    // checking
    console.log('Maker, Taker: ', maker.address, taker.address)
    console.log('Balance of maker && taker is ', (await omni.balanceOf(maker.address)).toString(), (await omni.balanceOf(taker.address)).toString())
    console.log('Token balance of maker is ', (await nftContract.balanceOf(maker.address)).toString())
    console.log('Token balance of taker is ', (await nftContract.balanceOf(taker.address)).toString())
    console.log(`Owner of Token#${tokenId} is `, (await nftContract.ownerOf(tokenId)).toString())
  }

  const { step, tokenid: tokenId, nonce } = args

  switch (step) {
  case 'listing':
    await listing(tokenId, nonce)
    break
  case 'prepare':
    await prepare()
    break
  case 'buy':
    await buyListing(tokenId)
    break
  case 'status':
    await checkStatus(tokenId)
    break
  }
}
