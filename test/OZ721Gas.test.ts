import hre from 'hardhat'
import { Signer } from 'ethers'
import {
    deployContract
  } from './TestDependencies'

describe('AdvancedONFT721: ', function () {
    let owner: Signer
   
    let nft: any


    beforeEach(async function () {
    owner = (await hre.ethers.getSigners())[0]
    ownerAddress = await owner.getAddress()
    nft = await deployContract('ERC721Mock', owner, [])
    


    })

    it('test gas for 1 nft', async function () {
        await nft.batchMint(1)
    })
     it('test gas for 5 nfts', async function () {
        await nft.batchMint(5)
    })
    it('test gas for 10 nfts', async function () {
        await nft.batchMint(10)
    })
     it('test gas for 20 nft', async function () {
        await nft.batchMint(20)
    })
     it('test gas for 50 nft', async function () {
        await nft.batchMint(50)
    })
     it('test gas for 100 nft', async function () {
        await nft.batchMint(100)
    })



})