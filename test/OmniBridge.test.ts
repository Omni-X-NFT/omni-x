import hre from 'hardhat'
import { Signer, BigNumber } from 'ethers'

describe('OmniBridge', function () {
  let omniBridgeA: any
  let omniBridgeB: any
  let onftMockA: any
  let lzEndpointMock
  let chainId = 123
  let owner: Signer

  beforeEach(async function () {
    const signers = await hre.ethers.getSigners()
    owner = signers[0]
    const ownerAddress = await owner.getAddress()
    // use this chainId
    chainId = 123

    // create a LayerZero Endpoint mock for testing
    const LayerZeroEndpointMock = await hre.ethers.getContractFactory('LZEndpointMock')
    lzEndpointMock = await LayerZeroEndpointMock.deploy(chainId)
    lzEndpointMock.deployed()

    // create two OmniBridge instances
    const OmniBridge = await hre.ethers.getContractFactory('OmniBridge')
    omniBridgeA = await OmniBridge.deploy(lzEndpointMock.address)
    omniBridgeB = await OmniBridge.deploy(lzEndpointMock.address)
    await omniBridgeA.deployed()
    await omniBridgeB.deployed()

    const ONFTMockA = await hre.ethers.getContractFactory('ONFT721Mock')
    onftMockA = await ONFTMockA.deploy('Name', 'Symbol', lzEndpointMock.address)
    await onftMockA.deployed()

    // Mint ONFTMock
    await (await onftMockA.mint(ownerAddress, 1)).wait()
    await (await onftMockA.approve(omniBridgeA.address, 1)).wait()

    lzEndpointMock.setDestLzEndpoint(omniBridgeA.address, lzEndpointMock.address)
    lzEndpointMock.setDestLzEndpoint(omniBridgeB.address, lzEndpointMock.address)

    // set each contracts source address so it can send to each other
    omniBridgeA.setTrustedRemote(chainId, omniBridgeB.address)
    omniBridgeB.setTrustedRemote(chainId, omniBridgeA.address)
  })

  it('Wrapping', async () => {
    await (await omniBridgeA.wrap(BigNumber.from(chainId.toString()), onftMockA.address, BigNumber.from('1'))).wait()
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
