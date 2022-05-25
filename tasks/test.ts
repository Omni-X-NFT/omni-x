import { task } from 'hardhat/config'

import {
  TakerOrder,
  MakerOrder
} from '../utils/order-types';

// export const getBlockTime = async (ethers: any) : Promise<number> => {
//     const blockNumBefore = await ethers.provider.getBlockNumber();
//     const blockBefore = await ethers.provider.getBlock(blockNumBefore);
//     const timestampBefore = blockBefore.timestamp;
//     return timestampBefore as number
// }

// export const startTest = (ethers: any, {
//     omniXExchange,
//     currencyManager,
//     executionManager,
//     transferSelector,
//     strategy,
//     nftMock,
//     erc20Mock,
//     omni,
//     onft721,
//     onft1155,
// }) => {
//     const fillMakerOrder = async (
//         makeOrder : MakerOrder,
//         tokenId: number,
//         currency: string,
//         nftAddress: string,
//         nonce: number
//       ) => {
//         makeOrder.tokenId = tokenId
//         makeOrder.currency = currency
//         makeOrder.price = toWei(ethers, 1)
//         makeOrder.amount = 1
//         makeOrder.collection = nftAddress
//         makeOrder.strategy = strategy.address
//         makeOrder.nonce = nonce
//         makeOrder.startTime = await getBlockTime(ethers)
//         makeOrder.endTime = makeOrder.startTime + 3600 * 30
//         makeOrder.minPercentageToAsk = 900
//         makeOrder.signer = maker.address
//       }
//       const fillTakerOrder = (
//         takerOrder : TakerOrder,
//         tokenId: number
//       ) => {
//         takerOrder.tokenId = tokenId
//         takerOrder.price = toWei(1)
//         takerOrder.minPercentageToAsk = 900
//         takerOrder.taker = taker.address
//       }

//     const prepareTest = () => {

//     }
    
//     const approveTest = () => {

//     }

//     const testMakerAskTakerBid = () => {
//         const makerAsk: MakerOrder = new MakerOrder(true)
//         const takerBid: TakerOrder = new TakerOrder(false)
  
//         await fillMakerOrder(makerAsk, 1, erc20Mock.address, nftMock.address, 1)
//         fillTakerOrder(takerBid, 1)
  
//         makerAsk.encodeParams(await maker.getChainId(), taker.address)
//         takerBid.encodeParams(await taker.getChainId())
//         await makerAsk.sign(maker, omniXExchange.address)
//         await omniXExchange.connect(taker).matchAskWithTakerBid(takerBid, makerAsk);
  
//         expect(await nftMock.ownerOf(takerBid.tokenId)).to.be.eq(taker.address)
//     }

//     const testMakerAskTakerBidOmni = () => {

//     }

//     const testMakerBidTakerAsk = () => {

//     }

//     const testMakerBidTakerAskOmni = () => {

//     }

//     prepareTest()
//     approveTest()

//     testMakerAskTakerBid()
//     testMakerBidTakerAsk()
//     testMakerAskTakerBidOmni()
//     testMakerBidTakerAskOmni()
// }

task('deployContract', 'deploys an OmniX exchange && simple test')
    .setAction(async () => {
        // @ts-ignore
        const { ethers, network } = hre;
        const [ owner ] = await ethers.getSigners()
        
        // await startTest(ethers, {

        // })
    })
