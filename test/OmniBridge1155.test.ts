import hre, { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { expect } from 'chai'
import ERC1155PersistentArtifacts from '../artifacts/contracts/token/ERC1155Persistent.sol/ERC1155Persistent.json'

describe('OmniBridge1155', function () {
  const chainIdSrc = 1
  const chainIdDst = 2
  let OmniBridge: any
  let OmniBridgeSrc: any
  let OmniBridgeDst: any
  let lzEndpointMock: any
  let lzEndpointSrcMock: any
  let lzEndpointDstMock: any
  let mockInstance: any
  let owner: Signer
  let ownerAddress: string

  // const TOKEN_URI = 'https://tokenuri.com'

  before(async function () {
    owner = (await hre.ethers.getSigners())[0]
    ownerAddress = await owner.getAddress()

    lzEndpointMock = await hre.ethers.getContractFactory('LZEndpointMock')
    OmniBridge = await hre.ethers.getContractFactory('OmniBridge1155')
  })

  beforeEach(async function () {
    lzEndpointSrcMock = await lzEndpointMock.deploy(chainIdSrc)
    lzEndpointDstMock = await lzEndpointMock.deploy(chainIdDst)

    // create two OmniBridge instances
    OmniBridgeSrc = await OmniBridge.deploy(lzEndpointSrcMock.address)
    OmniBridgeDst = await OmniBridge.deploy(lzEndpointDstMock.address)

    lzEndpointSrcMock.setDestLzEndpoint(OmniBridgeDst.address, lzEndpointDstMock.address)
    lzEndpointDstMock.setDestLzEndpoint(OmniBridgeSrc.address, lzEndpointSrcMock.address)

    // set each contracts source address so it can send to each other
    await OmniBridgeSrc.setTrustedRemote(chainIdDst, OmniBridgeDst.address) // for A, set B
    await OmniBridgeDst.setTrustedRemote(chainIdSrc, OmniBridgeSrc.address) // for B, set A

    // Mock ERC721 contract deployment on Source chain
    const ONFT1155Mock = await hre.ethers.getContractFactory('ERC1155Mock')
    mockInstance = await ONFT1155Mock.deploy()
    await mockInstance.deployed()
  })

  it('Minting Regular NFT item and approve to spend from Bridge contract', async () => {
    const tokenId = 1
    const tokenAmount = 10

    await (await mockInstance.connect(owner).mint(tokenId, tokenAmount)).wait()
    expect(await mockInstance.balanceOf(ownerAddress, tokenId)).to.eq(tokenAmount)
    // Approving Token
    await (await mockInstance.setApprovalForAll(OmniBridgeSrc.address, true)).wait()

    // Calling wrap function in bridge contract
    const adapterParams = ethers.utils.solidityPack(['uint16', 'uint256'], [1, 3500000])
    await (await OmniBridgeSrc.connect(owner).wrap(chainIdDst, mockInstance.address, tokenId, 5, adapterParams)).wait()
    expect(await mockInstance.balanceOf(ownerAddress, tokenId)).to.eq(5)

    expect(await OmniBridgeDst.persistentAddresses(mockInstance.address)).to.not.equal(ethers.constants.AddressZero)

    // Sending again from Dstchain to SrcChain
    const persistentAddressDst = await OmniBridgeDst.persistentAddresses(mockInstance.address)
    const OmniNFTInstanceDst = await hre.ethers.getContractAt(ERC1155PersistentArtifacts.abi, persistentAddressDst, owner)
    await OmniNFTInstanceDst.setApprovalForAll(OmniBridgeDst.address, true)
    await (await OmniBridgeDst.connect(owner).wrap(chainIdSrc, persistentAddressDst, 1, 3, adapterParams)).wait()

    // Withdrawing regular NFT item from BridgeSRC contract
    const persistentAddressSrc = await OmniBridgeSrc.persistentAddresses(mockInstance.address)
    const OmniNFTInstanceSrc = await hre.ethers.getContractAt(ERC1155PersistentArtifacts.abi, persistentAddressSrc, owner)
    await OmniNFTInstanceSrc.setApprovalForAll(OmniBridgeSrc.address, true)
    await (await OmniBridgeSrc.connect(owner).withdraw(persistentAddressSrc, 1, 3)).wait()

    expect(await mockInstance.balanceOf(ownerAddress, tokenId)).to.eq(8)
  })
})
