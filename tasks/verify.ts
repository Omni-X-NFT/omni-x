import { getContractAddrByName, toWei } from './shared'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'

export const verifyOmni = async () => {
    // @ts-ignore
    const {ethers, run, network} = hre
    const [owner] = await ethers.getSigners()
    const lzEndpoint = (LZ_ENDPOINT as any)[network.name];

    // await run('verify:verify', {
    //     address: getContractAddrByName(network.name, 'OFTMock'),
    //     constructorArguments: [
    //         'OMNI', 'OMNI', toWei(ethers, 1000), lzEndpoint
    //     ],
    //     contract: "contracts/mocks/OFTMock.sol:OFTMock"
    // })

    await run('verify:verify', {
        address: getContractAddrByName(network.name, 'TransferManagerGhosts'),
        constructorArguments: [
            getContractAddrByName(network.name, 'OmniXExchange'), lzEndpoint
        ],
        contract: "contracts/transfer/TransferManagerGhosts.sol:TransferManagerGhosts"
    })

    // await run('verify:verify', {
    //     address: getContractAddrByName(network.name, 'OmniXExchange2'),
    //     constructorArguments: [
    //     ],
    //     contract: "contracts/core/OmniXExchange2.sol:OmniXExchange2"
    // })

    // await run('verify:verify', {
    //     address: getContractAddrByName(network.name, 'OmniXExchange'),
    //     constructorArguments: [
    //         getContractAddrByName(network.name, 'CurrencyManager'),
    //         getContractAddrByName(network.name, 'ExecutionManager'),
    //         getContractAddrByName(network.name, 'RoyaltyFeeManager'),
    //         ethers.constants.AddressZero,
    //         owner.address
    //     ],
    //     contract: "contracts/core/OmniXExchange.sol:OmniXExchange"
    // })
}
