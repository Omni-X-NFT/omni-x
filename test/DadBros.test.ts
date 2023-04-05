import hre from 'hardhat'
import { Signer } from 'ethers'
import { expect } from 'chai'
import snapshotData from '../constants/GregArbitrumSnapshot.json'
import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256'
import { time } from '@nomicfoundation/hardhat-network-helpers';

// Must un-comment regular mint and regular public mint on AdvancedONFT1155 for these tests to pass
describe('DadBros: ', function () {
  let owner: Signer, ownerAddress: string, instance: any, usdc: any

  

  const baseTokenURI = 'https://example.com/api/item/'

  const tax = 500

 

  beforeEach(async function () {
    owner = (await hre.ethers.getSigners())[0]

    ownerAddress = await owner.getAddress()

    const USDC = await hre.ethers.getContractFactory('ERC20Mock')
    usdc = await USDC.deploy()
    await usdc.deployed()

    await usdc.mint(ownerAddress, hre.ethers.BigNumber.from("1000000000000000000"))



    const ONFT = await hre.ethers.getContractFactory('contracts/token/onft/extension/DadBros.sol:DadBros')

    instance = await ONFT.deploy('DADBROS', 'DAD', '0x3c2269811836af69497E5F486A85D7316753cf62', baseTokenURI, baseTokenURI, tax, ownerAddress, usdc.address)

    await instance.deployed()
    const leaves = (snapshotData as any).map((x: any) => keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [x.address, x.count])))
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
 

    await (await instance.connect(owner).setMerkleRoot(hre.ethers.utils.formatBytes32String("free"), tree.getHexRoot())).wait()
    await (await instance.connect(owner).setMerkleRoot(hre.ethers.utils.formatBytes32String("friends"), tree.getHexRoot())).wait()
    await (await instance.connect(owner).flipSaleStarted()).wait()

   
  })
  it('should mint one ONFT', async function () {
    const tokenId = 1
    const amount = 1
    await (await usdc.connect(owner).approve(instance.address, hre.ethers.BigNumber.from("1000000000000000000"))).wait()
   
    const leaves = (snapshotData as any).map((x: any) => keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [x.address, x.count])))
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
    const leaf = keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [ownerAddress, 1]))
    const proof = tree.getHexProof(leaf)

    await instance.connect(owner).mint(amount, 2, proof, 1)

    const ONFTBalance = await instance.balanceOf(ownerAddress)
    
    
    expect(await parseInt(ONFTBalance)).to.eq(amount)
  
  })
  it('should increase price', async function () {
    const tokenId = 1
    const amount = 1
    await (await usdc.connect(owner).approve(instance.address, hre.ethers.BigNumber.from("1000000000000000000"))).wait()

   
    const leaves = (snapshotData as any).map((x: any) => keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [x.address, x.count])))
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
    const leaf = keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [ownerAddress, 1]))
    const proof = tree.getHexProof(leaf)
    
    console.log(hre.ethers.BigNumber.from((await instance.PRICE_DELTA()).toString()).div("1000000000000000000"))
    for (let i = 0; i < 10; i++) {

      console.log((await usdc.balanceOf(ownerAddress)).toString())
      const priceBefore = await instance.spotPricePublic()
      await instance.connect(owner).mint(amount, 3, proof, 1)
      const priceAfter = await instance.spotPricePublic()
      console.log(priceBefore.toString())
      console.log(priceAfter.toString())
      console.log("------------------------------")
    }

    console.log("")
    await time.increaseTo(hre.ethers.utils.hexValue(hre.ethers.BigNumber.from((await instance.lastUpdatePublic() + 50))))
    const priceBefore2 = await instance.spotPricePublic()
    const balanceBefore = await usdc.balanceOf(ownerAddress)
    await instance.connect(owner).mint(amount, 3, proof, 1)
    const balanceAfter = await usdc.balanceOf(ownerAddress)

    const priceAfter2 = await instance.spotPricePublic()
    console.log(priceBefore2.toString())
    console.log(priceAfter2.toString())
    console.log(balanceBefore.toString())
    console.log(balanceAfter.toString())


    const ONFTBalance = await instance.balanceOf(ownerAddress)
    
    expect(await parseInt(ONFTBalance)).to.eq(amount * 11)
  })
})