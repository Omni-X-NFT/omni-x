import hre from 'hardhat'
import { Signer } from 'ethers'
import { expect } from 'chai'
import {
    deployContract, getBlockTime, toWei
  } from './TestDependencies'
import { time } from "@nomicfoundation/hardhat-network-helpers";
describe('AdvancedONFT721A: ', function () {
    let owner: Signer, ownerAddress: string, instance: any, usdc: any
    let lzEndpointMock: any
    let lzEndpointDstMock: any
    const chainIdSrc = 1
    const chainIdDst = 2
  
    const baseTokenURI = 'https://example.com/api/item/'
    const hiddenTokenURI = 'https://example.com/api/item/'
    const tax = 500
    const maxMint = 5000
    const price = 100
    let onft: any


    beforeEach(async function () {
        owner = (await hre.ethers.getSigners())[0]

        ownerAddress = await owner.getAddress()
        const lzEndpoint = await deployContract('LZEndpointMock', owner, [await owner.getChainId()])

        onft = await deployContract('OmnichainAdventures', owner, ['', '', lzEndpoint.address, 4000, maxMint, 10000, baseTokenURI, hiddenTokenURI, tax, price, ownerAddress])
        const timestamp = await getBlockTime()
     
        const nftstate = {
            saleStarted: true,
            revealed: true,
            startTime: timestamp,
            mintLength: 604800
        }
        await (await onft.connect(owner).setNftState(nftstate)).wait()
    })

    it('should mint one ONFT', async function () {
        const amount = 1
        await time.increase(3600)


        await (await onft.mint(amount, { value: amount * price })).wait()


        expect(await onft.balanceOf(ownerAddress)).to.eq(amount)
        expect(await onft.ownerOf(4000)).to.eq(ownerAddress)
        

    })
    it('should mint 5 ONFT', async function () {
        const amount = 5
        await time.increase(3600)


        await (await onft.mint(amount, { value: amount * price })).wait()
        expect(await onft.balanceOf(ownerAddress)).to.eq(amount)
        for (let i = 0; i < amount; i++) {
            expect(await onft.ownerOf(4000 + i)).to.eq(ownerAddress)
        }
       
     
    }
    )
})