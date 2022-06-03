import {
    STRATEGY_PROTOCAL_FEE,
    ROYALTY_FEE_LIMIT,
    LZ_ENDPOINT,
    deployContract,
    toWei
} from './shared'

export const deployOmniX = async() => {
    // @ts-ignore
    const { ethers, network } = hre;
    const [ owner ] = await ethers.getSigners()
    const lzEndpoint = (LZ_ENDPOINT as any)[network.name];

    const currencyManager = await deployContract(ethers, 'CurrencyManager', owner, [])
    const strategy = await deployContract(ethers, 'StrategyStandardSale', owner, [STRATEGY_PROTOCAL_FEE])
    const executionManager = await deployContract(ethers, 'ExecutionManager', owner, [])
    const royaltyFeeRegistry = await deployContract(ethers, 'RoyaltyFeeRegistry', owner, [ROYALTY_FEE_LIMIT])
    const royaltyFeeManager = await deployContract(ethers, 'RoyaltyFeeManager', owner, [royaltyFeeRegistry.address])
    const omniXExchange = await deployContract(ethers, 'OmniXExchange', owner, [
        currencyManager.address,
        executionManager.address,
        royaltyFeeManager.address,
        ethers.constants.AddressZero,
        owner.address
      ])
    const transferManager721 = await deployContract(ethers, 'TransferManagerERC721', owner, [omniXExchange.address])
    const transferManager1155 = await deployContract(ethers, 'TransferManagerERC1155', owner, [omniXExchange.address])
    const transferManagerONFT721 = await deployContract(ethers, 'TransferManagerONFT721', owner, [omniXExchange.address])
    const transferManagerONFT1155 = await deployContract(ethers, 'TransferManagerONFT1155', owner, [omniXExchange.address])
    const transferSelector = await deployContract(ethers, 'TransferSelectorNFT', owner, [transferManager721.address, transferManager1155.address])

    // normal currency && nft
    const erc20Mock = await deployContract(ethers, 'LRTokenMock', owner, [])
    const nftMock = await deployContract(ethers, 'Nft721Mock', owner, [])
    
    // omni currency && onft
    const omni = await deployContract(ethers, 'OFT', owner, ['OMNI', 'OMNI', lzEndpoint, toWei(ethers, 1000)])
    const onft721 = await deployContract(ethers, 'ONFT721', owner, ['ONFT', 'ONFT', lzEndpoint])
    const onft1155 = await deployContract(ethers, 'ONFT1155', owner, ['https://localhost/', lzEndpoint])
    
    await executionManager.addStrategy(strategy.address)
    await currencyManager.addCurrency(erc20Mock.address)
    await currencyManager.addCurrency(omni.address)

    await transferSelector.addCollectionTransferManager(onft721.address, transferManagerONFT721.address)
    await transferSelector.addCollectionTransferManager(onft1155.address, transferManagerONFT1155.address)
    await omniXExchange.updateTransferSelectorNFT(transferSelector.address)
}
