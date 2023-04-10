import hre from 'hardhat'
import { Signer } from 'ethers'
import { expect } from 'chai'
import Free from '../constants/GregArbitrumSnapshot.json'
import Friends from '../constants/largeElementsSnapshot.json'
import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256'


// Must un-comment regular mint and regular public mint on AdvancedONFT1155 for these tests to pass
describe('DadBros: ', function () {
  let owner: Signer, ownerAddress: string, instance: any

  

  const baseTokenURI = 'https://example.com/api/item/'

  const tax = 500

 

  beforeEach(async function () {
    owner = (await hre.ethers.getSigners())[0]

    ownerAddress = await owner.getAddress()




    const ONFT = await hre.ethers.getContractFactory('contracts/token/onft/extension/DadBros.sol:DadBros')

    instance = await ONFT.deploy('DADBROS', 'DAD', '0x3c2269811836af69497E5F486A85D7316753cf62', baseTokenURI, baseTokenURI, tax, ownerAddress)

    await instance.deployed()
    const leavesFree = (Free as any).map((x: any) => keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [x.address, x.count])))
    const treeFree = new MerkleTree(leavesFree, keccak256, { sortPairs: true })
    const leavesFriends = (Friends as any).map((x: any) => keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [x.address, x.count])))
    const treeFriends= new MerkleTree(leavesFriends, keccak256, { sortPairs: true })
 

    await (await instance.connect(owner).setMerkleRoot(hre.ethers.utils.formatBytes32String("free"), treeFree.getHexRoot())).wait()
    await (await instance.connect(owner).setMerkleRoot(hre.ethers.utils.formatBytes32String("friends"), treeFriends.getHexRoot())).wait()
    await (await instance.connect(owner).flipSaleStarted()).wait()

   
  })
  it('should mint one DadBro: Public Mint', async function () {
    const amount = 1
    

    await instance.connect(owner).mint(amount, 3, [hre.ethers.utils.formatBytes32String("")], 4, {value: "1000000000000000000"})

    const ONFTBalance = await instance.balanceOf(ownerAddress)
    
    
    expect(await parseInt(ONFTBalance)).to.eq(amount)
  
  })
  it('should mint one DadBro: Friends Mint', async function () {
    const amount = 1

   
    const leaves = (Friends as any).map((x: any) => keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [x.address, x.count])))
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
    const leaf = keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [ownerAddress, 5]))
    const proof = tree.getHexProof(leaf)

    await instance.connect(owner).mint(amount, 2, proof, 5, {value: "1000000000000000000"})

    const ONFTBalance = await instance.balanceOf(ownerAddress)
    
    
    expect(await parseInt(ONFTBalance)).to.eq(amount)
  
  })
  it('should mint one DadBro: Free Mint', async function () {
    const amount = 1

   
    const leaves = (Free as any).map((x: any) => keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [x.address, x.count])))
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
    const leaf = keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [ownerAddress, 4]))
    const proof = tree.getHexProof(leaf)

    await instance.connect(owner).mint(amount, 1, proof, 4)

    const ONFTBalance = await instance.balanceOf(ownerAddress)
    
    
    expect(await parseInt(ONFTBalance)).to.eq(amount)
  
  })
  it ('should not mint more than 4 free per wallet', async function () {
    const leaves = (Free as any).map((x: any) => keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [x.address, x.count])))
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
    const leaf = keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [ownerAddress, 4]))
    const proof = tree.getHexProof(leaf)


    await instance.connect(owner).mint(3, 1, proof, 4)

    await instance.connect(owner).mint(1, 1, proof, 4)
    await expect(instance.connect(owner).mint(1, 1, proof, 4)).to.be.revertedWith("DadBros: Max tokens per address reached")

    
  })
  it ('should not mint more than 5 friends per wallet', async function () {
    const leaves = (Friends as any).map((x: any) => keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [x.address, x.count])))
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
    const leaf = keccak256(hre.ethers.utils.solidityPack(['address', 'uint256'], [ownerAddress, 5]))
    const proof = tree.getHexProof(leaf)

    await instance.connect(owner).mint(5, 2, proof, 5, {value: "5000000000000000000"})
    await expect(instance.connect(owner).mint(1, 2, proof, 5, {value: "2000000000000000000"})).to.be.revertedWith("DadBros: Max tokens per address reached")
  })
})