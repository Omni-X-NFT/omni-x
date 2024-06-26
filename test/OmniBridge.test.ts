import hre, { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { expect } from 'chai'
import ERC721PersistentArtifacts from '../artifacts/contracts/token/ERC721Persistent.sol/ERC721Persistent.json'

describe('OmniBridge', function () {
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

  const TOKEN_URI = 'https://tokenuri.com'

  before(async function () {
    owner = (await hre.ethers.getSigners())[0]
    ownerAddress = await owner.getAddress()

    lzEndpointMock = await hre.ethers.getContractFactory('LZEndpointMock')
    OmniBridge = await hre.ethers.getContractFactory('OmniBridge')
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
    const PathDst = ethers.utils.solidityPack(['address', 'address'], [OmniBridgeSrc.address, OmniBridgeDst.address])
    const PathSrc = ethers.utils.solidityPack(['address', 'address'], [OmniBridgeDst.address, OmniBridgeSrc.address])

    await OmniBridgeSrc.setTrustedRemote(chainIdDst, PathSrc) // for A, set B
    await OmniBridgeDst.setTrustedRemote(chainIdSrc, PathDst) // for B, set A

    // Mock ERC721 contract deployment on Source chain
    const ONFT721Mock = await hre.ethers.getContractFactory('ERC721Mock')
    mockInstance = await ONFT721Mock.deploy()
    await mockInstance.deployed()
  })

  it('Minting Regular NFT item and approve to spend from Bridge contract', async () => {
    await (await mockInstance.connect(owner).safeMint(ownerAddress, TOKEN_URI)).wait()
    expect(await mockInstance.ownerOf(0)).to.eq(ownerAddress)
    expect(await mockInstance.tokenURI(0)).to.eq(TOKEN_URI)
    // Approving Token
    await (await mockInstance.approve(OmniBridgeSrc.address, 0)).wait()

    // Calling wrap function in bridge contract
    const adapterParams = ethers.utils.solidityPack(['uint16', 'uint256'], [1, 3500000])

    const payload = ethers.utils.solidityPack(['address', 'address', 'string', 'string', 'string', 'uint256'], [mockInstance.address, OmniBridgeSrc.address, 'TEST', 'TEST', TOKEN_URI, 1])
    const estimatedFee = await (await lzEndpointSrcMock.estimateFees(chainIdDst, OmniBridgeSrc.address, payload, false, adapterParams))

    await (await OmniBridgeSrc.connect(owner).wrap(chainIdDst, ownerAddress, mockInstance.address, 0, adapterParams, { value: estimatedFee.toString().replace(/,/g, '') }))
    expect(await mockInstance.ownerOf(0)).to.eq(OmniBridgeSrc.address)

    expect(await OmniBridgeDst.persistentAddresses(mockInstance.address)).to.not.equal(ethers.constants.AddressZero)

    // Sending again from Dstchain to SrcChain
    const onftAddressDst = await OmniBridgeDst.persistentAddresses(mockInstance.address)
    const OmniNFTInstanceDst = await hre.ethers.getContractAt(ERC721PersistentArtifacts.abi, onftAddressDst, owner)
    expect(await OmniNFTInstanceDst.tokenURI(0)).to.eq(TOKEN_URI)
    await OmniNFTInstanceDst.approve(OmniBridgeDst.address, 0)
    await (await OmniBridgeDst.connect(owner).wrap(chainIdSrc, ownerAddress, onftAddressDst, 0, adapterParams, { value: estimatedFee.toString().replace(/,/g, '') }))

    // Withdrawing regular NFT item from BridgeSRC contract
    const onftAddressSrc = await OmniBridgeSrc.persistentAddresses(mockInstance.address)
    const OmniNFTInstanceSrc = await hre.ethers.getContractAt(ERC721PersistentArtifacts.abi, onftAddressSrc, owner)
    await OmniNFTInstanceSrc.approve(OmniBridgeSrc.address, 0)
    await (await OmniBridgeSrc.connect(owner).withdraw(onftAddressSrc, 0)).wait()

    expect(await mockInstance.ownerOf(0)).to.eq(ownerAddress)
  })
})
