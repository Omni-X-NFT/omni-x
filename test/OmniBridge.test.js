const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('OmniBridge', function () {
  let omniBridgeA
  let omniBridgeB
  let onftMockA
  let lzEndpointMock
  let chainId = 123

  beforeEach(async function () {
    const [owner, signer1, signer2] = await ethers.getSigners()
    // use this chainId
    chainId = 123

    // create a LayerZero Endpoint mock for testing
    const LayerZeroEndpointMock = await ethers.getContractFactory('LZEndpointMock')
    lzEndpointMock = await LayerZeroEndpointMock.deploy(chainId)
    lzEndpointMock.deployed()

    // create two OmniBridge instances
    const OmniBridge = await ethers.getContractFactory('OmniBridge')
    omniBridgeA = await OmniBridge.deploy(lzEndpointMock.address)
    omniBridgeB = await OmniBridge.deploy(lzEndpointMock.address)
    await omniBridgeA.deployed()
    await omniBridgeB.deployed()

    const ONFTMockA = await ethers.getContractFactory('ONFT721Mock')
    onftMockA = await ONFTMockA.deploy('Name', 'Symbol', lzEndpointMock.address)
    await onftMockA.deployed()

    // Mint ONFTMock
    await (await onftMockA.mint(owner.address, 1)).wait()
    await (await onftMockA.approve(omniBridgeA.address, 1)).wait()

    lzEndpointMock.setDestLzEndpoint(omniBridgeA.address, lzEndpointMock.address)
    lzEndpointMock.setDestLzEndpoint(omniBridgeB.address, lzEndpointMock.address)

    // set each contracts source address so it can send to each other
    omniBridgeA.setTrustedRemote(chainId, omniBridgeB.address)
    omniBridgeB.setTrustedRemote(chainId, omniBridgeA.address)
  })

  it('Wrapping', async () => {
    await (await omniBridgeA.wrap(BigNumber.from(chainId.toString()), omniBridgeB.address, onftMockA.address, BigNumber.from('1'))).wait()
    console.log(await omniBridgeA.onftAddresses(onftMockA.address))
    console.log(await omniBridgeB.onftAddresses(onftMockA.address))
  })

  //   it('increment the counter of the destination OmniBridge', async function () {
  //     // ensure theyre both starting from 0
  //     expect(await this.omniBridgeA.counter()).to.be.equal(0) // initial value
  //     expect(await omniBridgeB.counter()).to.be.equal(0) // initial value

  //     // instruct each OmniBridge to increment the other OmniBridge
  //     // counter A increments counter B
  //     await this.omniBridgeA.incrementCounter(chainId)
  //     expect(await this.omniBridgeA.counter()).to.be.equal(0) // still 0
  //     expect(await omniBridgeB.counter()).to.be.equal(1) // now its 1

//     // counter B increments counter A
//     await omniBridgeB.incrementCounter(chainId)
//     expect(await this.omniBridgeA.counter()).to.be.equal(1) // now its 1
//     expect(await omniBridgeB.counter()).to.be.equal(1) // still 1
//   })
})
