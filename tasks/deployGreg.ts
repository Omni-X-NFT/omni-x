import { task } from 'hardhat/config'
import * as TransferSelector from '../artifacts/contracts/core/TransferSelectorNFT.sol/TransferSelectorNFT.json'
import {
    LZ_ENDPOINT,
    CONTRACTS,
    deployContract,
    createContract
} from './shared'

task('deployGreg', 'deploys an Gregs Transfer manager')
    .setAction(async () => {
        // @ts-ignore
        const { ethers, network } = hre;
        const [ owner ] = await ethers.getSigners()
        const lzEndpoint = (LZ_ENDPOINT as any)[network.name];
        const omniXExchangeAddr = (CONTRACTS.omnixExchange as any)[network.name];
        const transferSelectorAddr = (CONTRACTS.transferSelector as any)[network.name];
        const gregsAddr = (CONTRACTS.gregs as any)[network.name];

        const transferManagerGregs = await deployContract(ethers, 'TransferManagerGregs', owner, [omniXExchangeAddr, lzEndpoint])
        const transferSelector = createContract(ethers, transferSelectorAddr, TransferSelector.abi, owner)

        await transferSelector.addCollectionTransferManager(gregsAddr, transferManagerGregs.address)
    })