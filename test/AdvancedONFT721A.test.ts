import hre from 'hardhat'
import { Signer } from 'ethers'
import { expect } from 'chai'
import { deployContract, getBlockTime, toWei } from './TestDependencies'
import { time } from '@nomicfoundation/hardhat-network-helpers'

describe('AdvancedONFT721A: ', function () {
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
  let onft: any
  let erc20Mock: any

  beforeEach(async function () {
    owner = (await hre.ethers.getSigners())[0]

    ownerAddress = await owner.getAddress()
    const lzEndpoint = await deployContract('LZEndpointMock', owner, [await owner.getChainId()])
    erc20Mock = await deployContract('ERC20Mock', owner, [])

    onft = await deployContract('AdvancedONFT721A', owner, [
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
    const timestamp = await getBlockTime()

    const nftstate = {
      saleStarted: true,
      revealed: true
    }
    await (await onft.connect(owner).setNftState(nftstate)).wait()

    await (
      await onft.connect(owner).setMerkleRoot('0xee9f6696d4dfb976fa6ba5f0af1a6ed73793ff8cc4a567a4c6eea0afc6c9684a')
    ).wait()
  })

  it('should mint one ONFT', async function () {
    const amount = 1
    await (await erc20Mock.mint(ownerAddress, '1000000000000000000000')).wait()
    await (await erc20Mock.approve(onft.address, '1000000000000000000000')).wait()

    await (await onft.mint(amount)).wait()

    expect(await onft.balanceOf(ownerAddress)).to.eq(amount)
    expect(await onft.ownerOf(156)).to.eq(ownerAddress)
  })
  it('should withdraw', async function () {
    const amount = 1
    await (await erc20Mock.mint(ownerAddress, '1000000000000000000000')).wait()
    await (await erc20Mock.approve(onft.address, '1000000000000000000000')).wait()
    console.log((await erc20Mock.balanceOf(ownerAddress)).toString())
    await (await onft.mint(amount)).wait()

    expect(await onft.balanceOf(ownerAddress)).to.eq(amount)
    expect(await onft.ownerOf(156)).to.eq(ownerAddress)

    expect(await erc20Mock.balanceOf(onft.address)).to.gt(0)
    let ownerBalance = await erc20Mock.balanceOf(ownerAddress)
    await (await onft.connect(owner).withdraw()).wait()
    expect(await erc20Mock.balanceOf(ownerAddress)).to.gt(ownerBalance)
    expect(await onft.balanceOf(onft.address)).to.eq(0)
  })
})
