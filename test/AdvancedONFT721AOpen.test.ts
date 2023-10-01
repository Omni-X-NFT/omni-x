import hre from 'hardhat'
import { Signer } from 'ethers'
import { expect } from 'chai'
import { deployContract, getBlockTime, toWei } from './TestDependencies'
import { time } from '@nomicfoundation/hardhat-network-helpers'

describe('AdvancedONFT721AOpen: ', function () {
  let owner: Signer, ownerAddress: string, instance: any, usdc: any
  let lzEndpointMock: any
  let lzEndpointDstMock: any
  const chainIdSrc = 1
  const chainIdDst = 2

  const baseTokenURI = 'https://example.com/api/item/'
  const hiddenTokenURI = 'https://example.com/api/item/'
  const tax = 1000
  const maxMint = 5000
  const price = 100
  const priceNative = '1000000000000000'
  let onftUSDC: any
  let onftNative: any
  let erc20Mock: any

  beforeEach(async function () {
    owner = (await hre.ethers.getSigners())[0]

    ownerAddress = await owner.getAddress()
    const lzEndpoint = await deployContract('LZEndpointMock', owner, [await owner.getChainId()])
    erc20Mock = await deployContract('ERC20Mock', owner, [])

    onftUSDC = await deployContract('AdvancedONFT721AOpen', owner, [
      '',
      '',
      lzEndpoint.address,
      156,
      500,
      1000,
      baseTokenURI,
      hiddenTokenURI,
      tax,
      price,
      0,
      erc20Mock.address,
      ownerAddress,
      ownerAddress
    ])

    onftNative = await deployContract('AdvancedONFT721A', owner, [
      '',
      '',
      lzEndpoint.address,
      156,
      500,
      1000,
      baseTokenURI,
      hiddenTokenURI,
      tax,
      priceNative,
      0,
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

    await (await onftUSDC.connect(owner).setNftState(nftstate)).wait()

    await (await onftNative.connect(owner).setNftState(nftstate)).wait()

    await (
      await onftUSDC.connect(owner).setMerkleRoot('0xee9f6696d4dfb976fa6ba5f0af1a6ed73793ff8cc4a567a4c6eea0afc6c9684a')
    ).wait()

    await (
      await onftNative
        .connect(owner)
        .setMerkleRoot('0xee9f6696d4dfb976fa6ba5f0af1a6ed73793ff8cc4a567a4c6eea0afc6c9684a')
    ).wait()
  })

  it('should mint one onftUSDC', async function () {
    const amount = 1
    await (await erc20Mock.mint(ownerAddress, '1000000000000000000000')).wait()
    await (await erc20Mock.approve(onftUSDC.address, '1000000000000000000000')).wait()

    await (await onftUSDC.mint(amount)).wait()

    expect(await onftUSDC.balanceOf(ownerAddress)).to.eq(amount)
    expect(await onftUSDC.ownerOf(156)).to.eq(ownerAddress)
  })

  it('should mint one onftNative', async function () {
    const amount = 1
    await (await onftNative.mint(amount, { value: priceNative })).wait()

    expect(await onftNative.balanceOf(ownerAddress)).to.eq(amount)
    expect(await onftNative.ownerOf(156)).to.eq(ownerAddress)
  })

  it('should withdraw usdc', async function () {
    const amount = 1
    await (await erc20Mock.mint(ownerAddress, '1000000000000000000000')).wait()
    await (await erc20Mock.approve(onftUSDC.address, '1000000000000000000000')).wait()

    await (await onftUSDC.mint(amount)).wait()

    expect(await onftUSDC.balanceOf(ownerAddress)).to.eq(amount)
    expect(await onftUSDC.ownerOf(156)).to.eq(ownerAddress)

    expect(await erc20Mock.balanceOf(onftUSDC.address)).to.gt(0)
    let ownerBalance = await erc20Mock.balanceOf(ownerAddress)
    await (await onftUSDC.connect(owner).withdraw()).wait()
    expect(await erc20Mock.balanceOf(ownerAddress)).to.gt(ownerBalance)
    expect(await onftUSDC.balanceOf(onftUSDC.address)).to.eq(0)
  })

  // test to ensure native gets withdrawn correctly
  it('should withdraw native', async function () {
    const amount = 1

    await (await onftNative.mint(amount, { value: priceNative })).wait()

    expect(await onftNative.balanceOf(ownerAddress)).to.eq(amount)
    expect(await onftNative.ownerOf(156)).to.eq(ownerAddress)

    expect(await hre.ethers.provider.getBalance(onftNative.address)).to.gt(0)
    let ownerBalance = await hre.ethers.provider.getBalance(ownerAddress)
    await (await onftNative.connect(owner).withdraw()).wait()
    expect(await hre.ethers.provider.getBalance(ownerAddress)).to.gt(ownerBalance)
    expect(await onftNative.balanceOf(onftNative.address)).to.eq(0)
  })

  // test to make sure baseURI and hiddenURI are set correctly
  it('should set baseURI and hiddenURI correctly', async function () {
    const baseURI = 'https://newbaseuri.com/api/item/'
    const hiddenURI = 'https://newhiddenuri.com/api/item/'

    await (
      await onftUSDC.connect(owner).setMetadata({
        baseURI: baseURI,
        hiddenMetadataURI: hiddenURI
      })
    ).wait()

    const metadata = await onftUSDC.metadata()

    expect(metadata.baseURI).to.eq(baseURI)
    expect(metadata.hiddenMetadataURI).to.eq(hiddenURI)
  })

  // test setting setFinanceDetails and ensure they are set correctly
  it('should set finance details correctly', async function () {
    const financeDetails = {
      beneficiary: ownerAddress,
      taxRecipient: ownerAddress,
      token: erc20Mock.address,
      price: 1000,
      wlPrice: 10,
      tax: 500
    }

    await (await onftUSDC.connect(owner).setFinanceDetails(financeDetails)).wait()

    const details = await onftUSDC.financeDetails()

    // verify that each value is correct
    expect(details.beneficiary).to.eq(financeDetails.beneficiary)
    expect(details.taxRecipient).to.eq(financeDetails.taxRecipient)
    expect(details.token).to.eq(financeDetails.token)
    expect(details.price).to.eq(financeDetails.price)
    expect(details.wlPrice).to.eq(financeDetails.wlPrice)
    expect(details.tax).to.eq(financeDetails.tax)
  })

  // test to ensure cannot mint after the mintLength passes
  it('should not allow minting after mintLength has passed', async function () {
    const amount = 1
    await time.increase(6048000)
    await (await erc20Mock.mint(ownerAddress, '1000000000000000000000')).wait()
    await (await erc20Mock.approve(onftUSDC.address, '1000000000000000000000')).wait()
    await expect(onftUSDC.mint(amount)).to.be.revertedWith('0xd14c11fe')
  })
})
