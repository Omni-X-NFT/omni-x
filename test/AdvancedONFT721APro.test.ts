import hre from 'hardhat'
import { Signer } from 'ethers'
import { expect } from 'chai'
import { deployContract, getBlockTime, toWei } from './TestDependencies'
import { time } from '@nomicfoundation/hardhat-network-helpers'

describe('AdvancedONFT721APro: ', function () {
  let owner: Signer, ownerAddress: string, instance: any, usdc: any

  // constructor arguments

  const baseTokenURI = 'https://example.com/api/item/'
  const hiddenTokenURI = 'https://example.com/api/item/'
  const tax = 500

  let onft: any

  const getNFtPrice = async (amount: number) => {
    const price = await onft.getPriceInfo(amount)
    if (price) {
      return price[1]
    }
    return 0
  }

  beforeEach(async function () {
    owner = (await hre.ethers.getSigners())[0]

    ownerAddress = await owner.getAddress()
    const lzEndpoint = await deployContract('LZEndpointMock', owner, [await owner.getChainId()])

    onft = await deployContract('AdvancedONFT721APro', owner, [
      '',
      '',
      lzEndpoint.address,
      0,
      1000,
      10000,
      baseTokenURI,
      hiddenTokenURI,
      tax,
      100,
      10,
      hre.ethers.constants.AddressZero,
      ownerAddress,
      ownerAddress
    ])
    const timestamp = await getBlockTime()

    const nftstate = {
      saleStarted: true,
      revealed: true,
      startTime: timestamp,
      mintLength: 604800
    }

    const pricing = {
      minPrice: toWei('0.018'),
      maxPrice: toWei('0.05'),
      delta: toWei('0.00008'),
      decay: toWei('0.002'),
      spotPrice: toWei('0.01992'),
      lastUpdate: 0
    }
    await (await onft.connect(owner).setNftState(nftstate)).wait()
    await (await onft.connect(owner).setPricing(pricing)).wait()
  })

  it('single NFT mint without time-based effect', async function () {
    const amount = 1
    await time.increase(3600)
    const price = await getNFtPrice(amount)
    await (await onft.mint(amount, { value: price })).wait()

    expect(await onft.balanceOf(ownerAddress)).to.eq(amount)
    expect(await onft.ownerOf(0)).to.eq(ownerAddress)
  })

  it('multi NFT mint without time-based effect', async function () {
    const amount = 5
    await time.increase(3600)
    const price = await getNFtPrice(amount)
    await (await onft.mint(amount, { value: price })).wait()

    expect(await onft.balanceOf(ownerAddress)).to.eq(amount)
  })
})
