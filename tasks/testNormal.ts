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
  deployContract,
  loadAbi
} from './shared'

const OmniXEchangeAbi = loadAbi('../artifacts/contracts/core/OmniXExchange.sol/OmniXExchange.json')
const OFTMockAbi = loadAbi('../artifacts/contracts/mocks/OFTMock.sol/OFTMock.json')
const Nft721MockAbi = loadAbi('../artifacts/contracts/mocks/Nft721Mock.sol/Nft721Mock.json')
const TransferManager721Abi = loadAbi('../artifacts/contracts/transfer/TransferManagerERC721.sol/TransferManagerERC721.json')
const TransferManager1155Abi = loadAbi('../artifacts/contracts/transfer/TransferManagerERC721.sol/TransferManagerERC721.json')
const TransferManagerONFT721Abi = loadAbi('../artifacts/contracts/transfer/TransferManagerONFT721.sol/TransferManagerONFT721.json')
const TransferManagerONFT1155Abi = loadAbi('../artifacts/contracts/transfer/TransferManagerONFT1155.sol/TransferManagerONFT1155.json')

export const deployNormal = async () => {
  // @ts-ignore
  // eslint-disable-next-line
  const _hre = hre
  const { ethers } = _hre
  const [owner] = await ethers.getSigners()

  await deployContract(_hre, 'Nft721Mock', owner, [])
}

export const linkNormal = async (taskArgs: any) => {
  // @ts-ignore
  // eslint-disable-next-line
  const _hre = hre
  const { ethers } = _hre
  const [owner] = await ethers.getSigners()

  const { dstchainname: dstNetwork } = taskArgs
  const dstChainId = getChainId(dstNetwork)

  const transferManager721 = createContractByName(_hre, 'TransferManagerERC721', TransferManager721Abi().abi, owner)
  await transferManager721.setTrustedRemote(dstChainId, getContractAddrByName(dstNetwork, 'TransferManagerERC721'))
  const transferManager1155 = createContractByName(_hre, 'TransferManagerERC1155', TransferManager1155Abi().abi, owner)
  await transferManager1155.setTrustedRemote(dstChainId, getContractAddrByName(dstNetwork, 'TransferManagerERC1155'))
  const transferManagerONFT721 = createContractByName(_hre, 'TransferManagerONFT721', TransferManagerONFT721Abi().abi, owner)
  await transferManagerONFT721.setTrustedRemote(dstChainId, getContractAddrByName(dstNetwork, 'TransferManagerONFT721'))
  const transferManagerONFT1155 = createContractByName(_hre, 'TransferManagerONFT1155', TransferManagerONFT1155Abi().abi, owner)
  await transferManagerONFT1155.setTrustedRemote(dstChainId, getContractAddrByName(dstNetwork, 'TransferManagerONFT1155'))
}

export const testNormal = async (args: any) => {
  // @ts-ignore
  // eslint-disable-next-line
  const _hre = hre
  const { ethers, network: { name: network } } = _hre

  setEthers(ethers)

  const [owner, maker, taker] = await ethers.getSigners()

  const listing = async (tokenId: number, nonce: number) => {
    // make order
    const makerAsk: MakerOrder = new MakerOrder(true)
    await fillMakerOrder(
      makerAsk,
      tokenId,
      getContractAddrByName(network, 'OFTMock'),
      getContractAddrByName(network, 'Nft721Mock'),
      getContractAddrByName(network, 'StrategyStandardSale'),
      maker.address,
      await getBlockTime(ethers),
      toWei(ethers, 0.01),
      nonce
    )

    makerAsk.encodeParams(getChainId(network), taker.address)
    await makerAsk.sign(maker)

    // save
    makerAsk.serialize('./makerAskNormal.json')
  }

  const prepareMaker = async () => {
    // approve
    const nftContract = createContractByName(_hre, 'Nft721Mock', Nft721MockAbi().abi, maker)
    await nftContract.mint(maker.address)
    await nftContract.approve(getContractAddrByName(network, 'TransferManagerERC721'), 1)
  }

  const prepareTaker = async () => {
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
    const makerAsk: MakerOrder = MakerOrder.deserialize('./makerAskNormal.json')
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
    console.log(`[${network}] you can check the events or transactions of ${getContractAddrByName(network, 'TransferManagerERC721')} wallet has Token#${tokenId} after a while.`)
  }

  const { step, tokenid: tokenId, nonce } = args

  switch (step) {
  case 'preparemaker':
    await prepareMaker()
    break
  case 'preparetaker':
    await prepareTaker()
    break
  case 'listing':
    await listing(tokenId, nonce)
    break
  case 'buy':
    await buyListing(tokenId)
    break
  }
}
