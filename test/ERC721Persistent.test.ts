import hre from 'hardhat'
import { Signer } from 'ethers'
import { expect } from 'chai'

describe('ERC721Persistent: ', function () {
  const name = 'ERC721Persistent'
  const symbol = 'Test'

  let owner: Signer, bridge: Signer, bridgeAddress: string, ownerAddress: string, instance: any

  before(async function () {
    owner = (await hre.ethers.getSigners())[0]
    bridge = (await hre.ethers.getSigners())[1]
    ownerAddress = await owner.getAddress()
    bridgeAddress = await bridge.getAddress()

    const ERC721 = await hre.ethers.getContractFactory('ERC721Persistent')
    instance = await ERC721.deploy(name, symbol, bridgeAddress)
    await instance.deployed()
  })

  it('mint', async function () {
    await instance.safeMint(ownerAddress, 0, 'https://tokenuri.com')

    expect(await instance.ownerOf(0)).to.eq(ownerAddress)
    expect(await instance.tokenURI(0)).to.eq('https://tokenuri.com')

    await instance.approve(bridgeAddress, 0)
    await instance.connect(bridge).burn(0)
  })
})
