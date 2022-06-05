import * as TransferSelector from '../artifacts/contracts/core/TransferSelectorNFT.sol/TransferSelectorNFT.json'
import {
    CONTRACTS,
    deployContract,
    createContract
} from './shared'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'

export const deployGhostTransfer = async() => {
    // @ts-ignore
    const { ethers, network } = hre;
    const [ owner ] = await ethers.getSigners()
    const lzEndpoint = (LZ_ENDPOINT as any)[network.name];
    const omniXExchangeAddr = (CONTRACTS.omnixExchange as any)[network.name];
    const transferSelectorAddr = (CONTRACTS.transferSelector as any)[network.name];
    const ghostsAddr = (CONTRACTS.ghosts as any)[network.name];

    const transferManagerGhosts = await deployContract(ethers, 'TransferManagerGhosts', owner, [omniXExchangeAddr, lzEndpoint])
    const transferSelector = createContract(ethers, transferSelectorAddr, TransferSelector.abi, owner)

    await transferSelector.addCollectionTransferManager(ghostsAddr, transferManagerGhosts.address)
}

export const deployGregTransfer = async() => {
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
}
