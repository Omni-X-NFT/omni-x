import hre, { ethers } from 'hardhat'
import { Signer } from 'ethers'
import { expect } from 'chai'




describe('AdvancedONFT1155Gasless: ', function () {
    let owner: Signer, ownerAddress: string, instance: any, USDCADR: string, usdc: any
    let lzEndpointMock: any
    let lzEndpointSrcMock: any
    let lzEndpointDstMock: any
    const chainIdSrc = 1
    const chainIdDst = 2


    const baseTokenURI = "https://example.com/api/item/"
    const hiddenTokenURI = "https://example.com/api/item/"
    const tax = 500
    const numOfIds = 8
    const maxTokensPerMint = 5
    const ableToMint = 1
    const maxTokenPerId = 5000






    beforeEach(async function () {
        owner = (await hre.ethers.getSigners())[0]
        
        ownerAddress = await owner.getAddress()
        
        


        const USDC = await hre.ethers.getContractFactory('ERC20Mock')
        usdc = await USDC.deploy()
        await usdc.deployed()

        await usdc.mint(ownerAddress, 100000)
        lzEndpointMock = await hre.ethers.getContractFactory('LZEndpointMock')
        lzEndpointSrcMock = await lzEndpointMock.deploy(chainIdSrc)
        lzEndpointDstMock = await lzEndpointMock.deploy(chainIdDst)

    

        const ONFT = await hre.ethers.getContractFactory('contracts/token/onft/extension/AdvancedONFT1155Gasless.sol:AdvancedONFT1155Gasless')

        instance = await ONFT.deploy(lzEndpointDstMock.address, baseTokenURI, hiddenTokenURI, tax, ownerAddress, usdc.address, maxTokensPerMint, ableToMint, maxTokenPerId, numOfIds)
       
        await instance.deployed()
        await (await instance.connect(owner).setPrice(1000)).wait()
        
    })
    it("should mint one ONFT", async function () {
        let tokenId = 1
        let amount = 1
        await ( await usdc.connect(owner).approve(instance.address, 10000)).wait()
        let balance = await usdc.balanceOf(ownerAddress)
    
        expect(parseInt(balance)).to.eq(100000)

        await instance.publicMint(tokenId, amount)

        balance = await usdc.balanceOf(ownerAddress)
        let instanceBalance = await usdc.balanceOf(instance.address)
        let ONFTBalance = await instance.balanceOf(ownerAddress, tokenId)
        expect(await parseInt(ONFTBalance)).to.eq(amount)
        expect(await parseInt(balance)).to.eq(100000-1000)
        expect(await parseInt(instanceBalance)).to.eq(1000)

    })
    it("should mint 5 ONFT", async function () {
        let tokenId = 1
        let amount = 5
        await ( await usdc.connect(owner).approve(instance.address, 10000)).wait()
        let balance = await usdc.balanceOf(ownerAddress)
    
        expect(parseInt(balance)).to.eq(100000)
       

        await instance.publicMint(tokenId, amount)

        balance = await usdc.balanceOf(ownerAddress)
        let instanceBalance = await usdc.balanceOf(instance.address)
        let ONFTBalance = await instance.balanceOf(ownerAddress, tokenId)
        expect(await parseInt(ONFTBalance)).to.eq(amount)
        expect(await parseInt(balance)).to.eq(100000 - (5 * 1000))
        expect(await parseInt(instanceBalance)).to.eq(1000*5)

    })
    it("should not mint with ivalid tokenID for chain", async function () {
        let tokenId = 2
        let amount = 1
        await ( await usdc.connect(owner).approve(instance.address, 10000)).wait()
        let balance = await usdc.balanceOf(ownerAddress)
        expect(parseInt(balance)).to.eq(100000)
        await expect(instance.publicMint(tokenId, amount)).to.be.revertedWith("AdvancedONFT1155Gasless: trying to mint from an invalid chain")

    })
    it("should not mint over max tokens per mint", async function () {
        let tokenId = 1
        let amount = 6
        await ( await usdc.connect(owner).approve(instance.address, 10000)).wait()
        let balance = await usdc.balanceOf(ownerAddress)
        expect(parseInt(balance)).to.eq(100000)
        await expect(instance.publicMint(tokenId, amount)).to.be.revertedWith("AdvancedONFT1155Gasless: trying to mint too many tokens")

    })

})