import hre from 'hardhat'
import { Signer } from 'ethers'
import { expect } from 'chai'
import {
    deployContract, getBlockTime, toWei
  } from './TestDependencies'
import { time } from "@nomicfoundation/hardhat-network-helpers";
describe('AdvancedONFT721: ', function () {
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
    onft = await deployContract('AdvancedONFT721', owner, ['', '', lzEndpoint.address, 4000, maxMint, 5, baseTokenURI, hiddenTokenURI, tax, ownerAddress])


    })

    it('should get interfaceId', async function () {
    const interfaceId = await onft.testId()
    console.log(interfaceId)


    })


})