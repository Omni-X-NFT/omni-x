
import { deployContract, createContractByName, getContractAddrByName ,loadAbi } from './shared'
import { TakerOrder, MakerOrder, setEthers } from '../utils/order-types'

import { BigNumberish } from 'ethers'
import { deploy } from 'test/TestDependencies'



let currentNFT = 1
let nonce = 11
let nftMock
let erc20Mock: any
let currencyManager
let omniXExchange
let fundManager
let transferManager721
let transferSelector
let maker
let taker


const ROYALTY_FEE_LIMIT = 500 // 5%


const nftMockABI = loadAbi('../artifacts/contracts/mocks/Nft721Mock.sol/Nft721Mock.json')
const erc20MockABI = loadAbi('../artifacts/contracts/mocks/ERC20Mock.sol/ERC20Mock.json')
const strategyABI = loadAbi('../artifacts/contracts/strategy/StrategyStargateSale.sol/StrategyStargateSale.json')
const currencyManagerABI = loadAbi('../artifacts/contracts/core/CurrencyManager.sol/CurrencyManager.json')
const omniXExchangeABI = loadAbi('../artifacts/contracts/core/OmniXExchange.sol/OmniXExchange.json')
const fundManagerABI = loadAbi('../artifacts/contracts/core/FundManager.sol/FundManager.json')
const transferManager721ABI = loadAbi('../artifacts/contracts/transfer/TransferManagerERC721.sol/TransferManagerERC721.json')
const transferSelectorNFT = loadAbi('../artifacts/contracts/core/TransferSelectorNFT.sol/TransferSelectorNFT.json')

export const executeBatchOrder = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre

  const [owner] = await ethers.getSigners()



   const strategy = createContractByName(hre, 'StrategyStargateSale', strategyABI().abi, owner)



    // nftMock = await createContractByName(hre, 'Nft721Mock', nftMockABI().abi, owner)
    

    // erc20Mock = createContractByName(hre, 'ERC20Mock', erc20MockABI().abi, owner)
    currencyManager = createContractByName(hre, 'CurrencyManager', currencyManagerABI().abi, owner)
    omniXExchange = createContractByName(hre, 'OmniXExchange', omniXExchangeABI().abi, owner)
    fundManager = createContractByName(hre, 'FundManager', fundManagerABI().abi, owner)
    transferManager721 = createContractByName(hre, 'TransferManagerERC721', transferManager721ABI().abi, owner)
    transferSelector = createContractByName(hre, 'TransferSelectorNFT', transferSelectorNFT().abi, owner)
    maker = new ethers.Wallet('f25db1c5c7d99c6c5ef6cdace6220c6d2150bb2c38c464642ea785f0e646c1b6', new ethers.providers.JsonRpcProvider('https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'))
    taker = owner
    const numOfNfts: number = 4
  
  const provider = new ethers.providers.JsonRpcProvider('https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161')
  const blockNumber = await provider.getBlockNumber()
  const block = await provider.getBlock(blockNumber)
  const blockTime = block.timestamp

  // for (let i = 1; i < 11; i++) {
  //   await nftMock.mintTo(maker.address)
  // }
  // await nftMock.connect(maker).setApprovalForAll(transferManager721.address, true)

 // await transferSelector.addCollectionTransferManager(nftMock.address, transferManager721.address)

  



  const toWei = (amount: number | string): BigNumberish => {
    return ethers.utils.parseEther(amount.toString())
  }

  setEthers(ethers)

  const fillMakerOrder = async (
    makeOrder : MakerOrder,
    tokenId: number,
    currency: string,
    nftAddress: string,
    nonce: number,
    signer: string
  ) => {
    makeOrder.tokenId = tokenId
    makeOrder.currency = currency
    makeOrder.price = 1000000
    makeOrder.amount = 1
    makeOrder.collection = nftAddress
    makeOrder.strategy = '0x842ccFeDbA534CE9C6D9B0CA58FB3447fCC976A7'
    makeOrder.nonce = nonce
    makeOrder.startTime = blockTime
    makeOrder.endTime = (parseInt((makeOrder.startTime).toString()) + 3600 * 30)
    makeOrder.signer = signer
  }

  const fillTakerOrder = (
    takerOrder : TakerOrder,
    tokenId: number,
    takerAddr: string
  ) => {
    takerOrder.tokenId = tokenId
    takerOrder.price = 1000000
    takerOrder.minPercentageToAsk = 900
    takerOrder.taker = takerAddr
  }


  const makerAsks: MakerOrder[] = []
  const takerBids: TakerOrder[] = []
  const destAirdrops: BigNumberish[] = []


  console.log(await maker.getChainId())
  console.log(await taker.getChainId())

  for (let i = 0; i < numOfNfts; i++) {
    makerAsks.push(new MakerOrder(true))
    takerBids.push(new TakerOrder(false))
    await fillMakerOrder(makerAsks[i], currentNFT, "0xDf0360Ad8C5ccf25095Aa97ee5F2785c8d848620", "0x998ECFf723CDFC83b76796A0Af4dDa7d143da762", nonce, maker.address)
    fillTakerOrder(takerBids[i], currentNFT, taker.address)
    makerAsks[i].encodeParams(10121, maker.address, ROYALTY_FEE_LIMIT)
    takerBids[i].encodeParams(10143, "0x6aAd876244E7A1Ad44Ec4824Ce813729E5B6C291", "0x998ECFf723CDFC83b76796A0Af4dDa7d143da762", strategy.address, 0)
    await makerAsks[i].sign(maker)
    destAirdrops.push(0)
    currentNFT++
    nonce++

}

     // await (await omniXExchange.executeMultipleTakerBids(destAirdrops, takerBids, makerAsks, { value: toWei(0.002) })).wait()
     // await (await omniXExchange.matchAskWithTakerBid(0, takerBids[0], makerAsks[0], { value: toWei(0.001) })).wait()
    // const resp = await omniXExchange.getLzFeesForTrading(takerBids[0], makerAsks[0], 0)

 

   // console.log(makerAsks)
}
