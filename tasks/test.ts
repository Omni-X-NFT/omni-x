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
  fillTakerOrder,
  getChainId
} from './shared'
import OmniXEchangeAbi from '../artifacts/contracts/core/OmniXExchange.sol/OmniXExchange.json'
import OmniXEchange2Abi from '../artifacts/contracts/core/OmniXExchange2.sol/OmniXExchange2.json'
import OFTMockAbi from '../artifacts/contracts/mocks/OFTMock.sol/OFTMock.json'
import GhostsNftAbi from './fixtures/Gh0stlyGh0sts.json'
import { OFTMock, OmniXExchange, OmniXExchange2 } from '../typechain-types'

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
  
  const testMakerAskTakerBid = async (tokenId: number) => {
    // load maker order
    const makerAsk: MakerOrder = MakerOrder.deserialize('./makerAsk.json')
    const takerBid: TakerOrder = new TakerOrder(false)

    // create contracts
    const omnixContract = createContractByName(_hre, 'OmniXExchange', OmniXEchangeAbi.abi, taker) as OmniXExchange
    const nftContract = createContractByName(_hre, 'ghosts', GhostsNftAbi.abi, taker)
    const omni = createContractByName(_hre, 'OFTMock', OFTMockAbi.abi, taker) as OFTMock

    // transfer omni to taker first
    // await omni.connect(maker).transfer(taker.address, toWei(ethers, 100))

    // approve
    // const allowance = await omni.allowance(taker.address, omnixContract.address)
    // if (allowance.lt(toWei(ethers, 100))) {
    //   await omni.approve(omnixContract.address, toWei(ethers, 100))
    // }

    // data
    fillTakerOrder(takerBid, taker.address, tokenId, toWei(ethers, 0.01))
    takerBid.encodeParams(getChainId(network))

    // listing
    const lzFee = await omnixContract.connect(taker).getLzFeesForAskWithTakerBid(takerBid, makerAsk)

    console.log('lzFee: ', lzFee.toString())
    const tx = await omnixContract.connect(taker).matchAskWithTakerBid(takerBid, makerAsk, {value: lzFee });
    await tx.wait()

    // checking
    expect(await nftContract.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
  }

  // const testMakerAskTakerBid = async (tokenId: number) => {
  //   // create contracts
  //   const omnixContract = createContractByName(_hre, 'OmniXExchange2', OmniXEchange2Abi.abi, taker) as OmniXExchange2
  //   const omni = createContractByName(_hre, 'OFTMock', OFTMockAbi.abi, taker) as OFTMock

  //   // load maker order
  //   const makerAsk: MakerOrder = MakerOrder.deserialize('./makerAsk.json')
  //   const takerBid: TakerOrder = new TakerOrder(false)

  //   // data
  //   fillTakerOrder(takerBid, taker.address, tokenId, toWei(ethers, 1))
  //   takerBid.encodeParams(getChainId(network))

  //   // listing
  //   console.log((await omni.balanceOf(taker.address)).toString())

  //   console.log('---getLzFeesForAskWithTakerBid----', omnixContract.address);
  //   // const lzFee = await omnixContract.getLzFeesForAskWithTakerBid(takerBid, makerAsk)
    
  //   const currency = '0xFA2FD79235E62C6d23C04833Cf1100eCf7Afd5aD'
  //   const lzFee = await omnixContract._lzFeeTransferCurrency(
  //     currency,
  //     makerAsk.signer,
  //     takerBid.price,
  //     getChainId('rinkeby')
  //   )
  //   console.log('---lzFee----', lzFee.toString());

  //   const tx = await omnixContract.transferCurrency(
  //     currency,
  //     taker.address,
  //     makerAsk.signer,
  //     takerBid.price,
  //     getChainId('rinkeby'),
  //     {
  //       value: lzFee,
  //       gasLimit: 30000000
  //     }
  //   );
  //   await tx.wait()

  //   // // checking
  //   // expect(await nftContract.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
  // }

  const checkStatus = async (tokenId: number) => {
    // create contracts
    // const omnixContract = createContractByName(_hre, 'OmniXExchange', OmniXEchangeAbi.abi, taker) as OmniXExchange
    const nftContract = createContractByName(_hre, 'ghosts', GhostsNftAbi.abi, taker)
    const omni = createContractByName(_hre, 'OFTMock', OFTMockAbi.abi, taker)

    // checking
    console.log(`Maker, Taker: `, maker.address, taker.address)
    console.log(`Balance of maker && taker is `, (await omni.balanceOf(maker.address)).toString(), (await omni.balanceOf(taker.address)).toString())
    console.log(`Token balance of maker is `, (await nftContract.balanceOf(maker.address)).toString())
    console.log(`Token balance of taker is `, (await nftContract.balanceOf(taker.address)).toString())
    console.log(`Owner of Token#${tokenId} is `, (await nftContract.ownerOf(tokenId)).toString())
  }

  const {step, tokenid: tokenId, nonce} = args

  switch (step) {
    case 'make':
      await prepareTest(tokenId, nonce)
      break
    case 'take':
      await testMakerAskTakerBid(tokenId)
      break
    case 'status':
      await checkStatus(tokenId)
      break
  }
}
