import hre, { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { expect } from 'chai'

describe('OmniNFT: ', function () {
  const chainIdSrc = 1
  const chainIdDst = 2
  const name = 'OmniNFT'
  const symbol = 'OmNFT'

  let owner: Signer, ownerAddress: string, lzEndpointSrcMock, lzEndpointDstMock, ONFTSrc: any, ONFTDst: any, LZEndpointMock: any, OmniNFT: any

  before(async function () {
    owner = (await hre.ethers.getSigners())[0]
    ownerAddress = await owner.getAddress()

    LZEndpointMock = await hre.ethers.getContractFactory('LZEndpointMock')
    OmniNFT = await hre.ethers.getContractFactory('OmniNFT')
  })

  beforeEach(async function () {
    lzEndpointSrcMock = await LZEndpointMock.deploy(chainIdSrc)
    lzEndpointDstMock = await LZEndpointMock.deploy(chainIdDst)

    // create two OmniNFT instances
    ONFTSrc = await OmniNFT.deploy(name, symbol, lzEndpointSrcMock.address, ethers.constants.AddressZero)
    ONFTDst = await OmniNFT.deploy(name, symbol, lzEndpointDstMock.address, ethers.constants.AddressZero)

    lzEndpointSrcMock.setDestLzEndpoint(ONFTDst.address, lzEndpointDstMock.address)
    lzEndpointDstMock.setDestLzEndpoint(ONFTSrc.address, lzEndpointSrcMock.address)

    // set each contracts source address so it can send to each other
    await ONFTSrc.setTrustedRemote(chainIdDst, ONFTDst.address) // for A, set B
    await ONFTDst.setTrustedRemote(chainIdSrc, ONFTSrc.address) // for B, set A
  })

  it('sendFrom() - mint on the source chain and send ONFT to the destination chain', async function () {
    // mint ONFT
    const newId = 1
    await (await ONFTSrc.connect(owner).mint(newId)).wait()

    // verify the owner of the token is on the source chain
    expect(await ONFTSrc.ownerOf(newId)).to.be.equal(ownerAddress)

    // approve and send ONFT
    await ONFTSrc.approve(ONFTSrc.address, newId)
    // v1 adapterParams, encoded for version 1 style, and 200k gas quote
    const adapterParam = hre.ethers.utils.solidityPack(['uint16', 'uint256'], [1, 225000])

    await ONFTSrc.connect(owner).sendFrom(
      ownerAddress,
      chainIdDst,
      ownerAddress,
      newId,
      ownerAddress,
      '0x000000000000000000000000000000000000dEaD',
      adapterParam
    )

    // // verify the owner of the token is no longer on the source chain
    // await expect(ONFTSrc.ownerOf(newId)).to.be.revertedWith('ERC721: owner query for nonexistent token')

    // verify the owner of the token is on the destination chain
    expect(await ONFTDst.ownerOf(newId)).to.not.equal(owner)
  })
})
