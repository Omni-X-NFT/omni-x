import {
    STRATEGY_PROTOCAL_FEE,
    ROYALTY_FEE_LIMIT,
    deployContract,
    toWei,
    getContractAddrByName,
    createContractByName
} from './shared'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import { OmniXExchange, TransferSelectorNFT } from '../typechain-types'

import TransferSelectorNFTAbi from '../artifacts/contracts/core/TransferSelectorNFT.sol/TransferSelectorNFT.json'

export const deployOmniX = async() => {
    // @ts-ignore
    const _hre = hre
    const { ethers, network } = _hre
    const [ owner, , , deployer ] = await ethers.getSigners()
    const lzEndpoint = (LZ_ENDPOINT as any)[network.name];

    await deployContract(_hre, 'StrategyStandardSale', owner, [STRATEGY_PROTOCAL_FEE])

    const currencyManager = await deployContract(_hre, 'CurrencyManager', owner, [])
    const executionManager = await deployContract(_hre, 'ExecutionManager', owner, [])
    const royaltyFeeRegistry = await deployContract(_hre, 'RoyaltyFeeRegistry', owner, [ROYALTY_FEE_LIMIT])
    const royaltyFeeManager = await deployContract(_hre, 'RoyaltyFeeManager', owner, [royaltyFeeRegistry.address])
    const omniXExchange = await deployContract(_hre, 'OmniXExchange', owner, [
        currencyManager.address,
        executionManager.address,
        royaltyFeeManager.address,
        ethers.constants.AddressZero,
        owner.address
      ]) as OmniXExchange

    const transferManager721 = await deployContract(_hre, 'TransferManagerERC721', owner, [omniXExchange.address, lzEndpoint])
    const transferManager1155 = await deployContract(_hre, 'TransferManagerERC1155', owner, [omniXExchange.address, lzEndpoint])
    const transferSelector = await deployContract(_hre, 'TransferSelectorNFT', owner, [transferManager721.address, transferManager1155.address])
    const remoteAddrManager = await deployContract(_hre, 'RemoteAddrManager', owner, [])
    await deployContract(_hre, 'TransferManagerONFT721', owner, [omniXExchange.address, lzEndpoint])
    await deployContract(_hre, 'TransferManagerONFT1155', owner, [omniXExchange.address, lzEndpoint])
    await deployContract(_hre, 'TransferManagerGhosts', deployer, [omniXExchange.address, lzEndpoint])

    await deployContract(_hre, 'OFTMock', owner, ['OMNI', 'OMNI', toWei(ethers, 1000), lzEndpoint])

    await omniXExchange.updateTransferSelectorNFT(transferSelector.address)
    await omniXExchange.setRemoteAddrManager(remoteAddrManager.address)
}

export const deploy2 = async() => {
    // @ts-ignore
    const _hre = hre
    const { ethers, network } = _hre
    const [ owner, , , deployer] = await ethers.getSigners()

    const lzEndpoint = (LZ_ENDPOINT as any)[network.name];
    await deployContract(_hre, 'TransferManagerGhosts', deployer, [
        getContractAddrByName(network.name, 'OmniXExchange'),
        lzEndpoint
    ])

    const transferSelector = createContractByName(
        _hre,
        'TransferSelectorNFT',
        TransferSelectorNFTAbi.abi,
        owner
    ) as TransferSelectorNFT

    await transferSelector.addCollectionTransferManager(
        getContractAddrByName(network.name, 'ghosts'),
        getContractAddrByName(network.name, 'TransferManagerGhosts')
    )
}
