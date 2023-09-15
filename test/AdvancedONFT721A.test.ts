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

    onft = await deployContract('PrimeGenesis', owner, [
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
      false,
      ownerAddress
    ])
    const timestamp = await getBlockTime()

    const nftstate = {
      saleStarted: true,
      revealed: true
    }
    await (await onft.connect(owner).setNftState(nftstate)).wait()

    await (await onft.connect(owner).setMerkleRoot("0xee9f6696d4dfb976fa6ba5f0af1a6ed73793ff8cc4a567a4c6eea0afc6c9684a")).wait()
  })

  it('should mint one ONFT', async function () {
    const amount = 1
    await (await erc20Mock.mint(ownerAddress, "1000000000000000000000")).wait()
    await (await erc20Mock.approve(onft.address, "1000000000000000000000")).wait()

    await (await onft.mint(amount)).wait()

    expect(await onft.balanceOf(ownerAddress)).to.eq(amount)
    expect(await onft.ownerOf(156)).to.eq(ownerAddress)
  })
  // it('should mint 5 ONFT', async function () {
  //   const amount = 5
  //   await time.increase(3600)

  //   await (await onft.mint(amount, { value: amount * price })).wait()
  //   expect(await onft.balanceOf(ownerAddress)).to.eq(amount)
  //   for (let i = 0; i < amount; i++) {
  //     expect(await onft.ownerOf(4000 + i)).to.eq(ownerAddress)
  //   }
  // })
  it('should claim', async function () {
    const ids = [1, 2]
    await (await onft.claim(ids, "0x8636FA411113D1b40B5D76F6766D16b3aA829D30", [
  '0xdf6988bc442b27b054ef4cbc7560456841dac6f35cf08e971b330fdf9bf26141',
  '0x0247435a56ebdd0d4221d4eb119802a6e1efda0bb462c5ced7d9f32cdecc2adb',
  '0xe3ccc7bcc5bdc7797c6dfdcfe89334710246e96c71741fca9737a32a134d45b6',
  '0xa99cf74a700944d51df2d7086bbc601395e22b5a19b5ced8c6e076e6a08faff6',
  '0x6fc2641d1c41b8d8fa8abbd3cdbd81ed28ae489dc3c2b03541e860a54b5258b6'
] )).wait()

    expect(await onft.balanceOf("0x8636FA411113D1b40B5D76F6766D16b3aA829D30")).to.eq(2)
    expect(await onft.ownerOf(1)).to.eq("0x8636FA411113D1b40B5D76F6766D16b3aA829D30")
    expect(await onft.ownerOf(2)).to.eq("0x8636FA411113D1b40B5D76F6766D16b3aA829D30")

  })
  it('should fail to claim twice', async function () {
    const ids = [1, 2]
      await (await onft.claim(ids, "0x8636FA411113D1b40B5D76F6766D16b3aA829D30", [
    '0xdf6988bc442b27b054ef4cbc7560456841dac6f35cf08e971b330fdf9bf26141',
    '0x0247435a56ebdd0d4221d4eb119802a6e1efda0bb462c5ced7d9f32cdecc2adb',
    '0xe3ccc7bcc5bdc7797c6dfdcfe89334710246e96c71741fca9737a32a134d45b6',
    '0xa99cf74a700944d51df2d7086bbc601395e22b5a19b5ced8c6e076e6a08faff6',
    '0x6fc2641d1c41b8d8fa8abbd3cdbd81ed28ae489dc3c2b03541e860a54b5258b6'
  ] )).wait()

    expect(await onft.balanceOf("0x8636FA411113D1b40B5D76F6766D16b3aA829D30")).to.eq(2)
    expect(await onft.ownerOf(1)).to.eq("0x8636FA411113D1b40B5D76F6766D16b3aA829D30")
    expect(await onft.ownerOf(2)).to.eq("0x8636FA411113D1b40B5D76F6766D16b3aA829D30")

    await expect( onft.claim(ids, "0x8636FA411113D1b40B5D76F6766D16b3aA829D30", [
    '0xdf6988bc442b27b054ef4cbc7560456841dac6f35cf08e971b330fdf9bf26141',
    '0x0247435a56ebdd0d4221d4eb119802a6e1efda0bb462c5ced7d9f32cdecc2adb',
    '0xe3ccc7bcc5bdc7797c6dfdcfe89334710246e96c71741fca9737a32a134d45b6',
    '0xa99cf74a700944d51df2d7086bbc601395e22b5a19b5ced8c6e076e6a08faff6',
    '0x6fc2641d1c41b8d8fa8abbd3cdbd81ed28ae489dc3c2b03541e860a54b5258b6'
  ] )).to.be.reverted
  })
  it('should regular mint and claim', async function () {
    const amount = 1
    await (await erc20Mock.mint(ownerAddress, "1000000000000000000000")).wait()
    await (await erc20Mock.approve(onft.address, "1000000000000000000000")).wait()

    await (await onft.mint(amount)).wait()

    expect(await onft.balanceOf(ownerAddress)).to.eq(amount)
    expect(await onft.ownerOf(156)).to.eq(ownerAddress)
    const ids = [1, 2]
    await (await onft.claim(ids, "0x8636FA411113D1b40B5D76F6766D16b3aA829D30", [
  '0xdf6988bc442b27b054ef4cbc7560456841dac6f35cf08e971b330fdf9bf26141',
  '0x0247435a56ebdd0d4221d4eb119802a6e1efda0bb462c5ced7d9f32cdecc2adb',
  '0xe3ccc7bcc5bdc7797c6dfdcfe89334710246e96c71741fca9737a32a134d45b6',
  '0xa99cf74a700944d51df2d7086bbc601395e22b5a19b5ced8c6e076e6a08faff6',
  '0x6fc2641d1c41b8d8fa8abbd3cdbd81ed28ae489dc3c2b03541e860a54b5258b6'
] )).wait()

    expect(await onft.balanceOf("0x8636FA411113D1b40B5D76F6766D16b3aA829D30")).to.eq(2)
    expect(await onft.ownerOf(1)).to.eq("0x8636FA411113D1b40B5D76F6766D16b3aA829D30")
    expect(await onft.ownerOf(2)).to.eq("0x8636FA411113D1b40B5D76F6766D16b3aA829D30")

  })
  it('should withdraw', async function () {
    const amount = 1
    await (await erc20Mock.mint(ownerAddress, "1000000000000000000000")).wait()
    await (await erc20Mock.approve(onft.address, "1000000000000000000000")).wait()
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
