import { deployContract, createContractByName, getContractAddrByName ,loadAbi } from './shared'

const omniXExchangeABI = loadAbi('../artifacts/contracts/core/OmniXExchange.sol/OmniXExchange.json')

export const testSgReceive = async function (taskArgs: any, hre: any) {
    const { ethers, network } = hre

    const [owner] = await ethers.getSigners()

    const omniXExchange = createContractByName(hre, 'OmniXExchange', omniXExchangeABI().abi, owner)

    const payload = ethers.utils.arrayify(
        ethers.utils.defaultAbiCoder.encode(
            [
                'address',
                'address',
                'address',
                'uint256',
                'uint256',
                'address',
                'address',
                'bytes'
            ],
            [
                "0x4a8AC1352e6c4ef5D8B4Aea370C1F9ad21A66bf8",
                "0x1aE1a74DF50E35Ab6AD84555Cc70cdBEAfa804bF",
                "0x3D4bDd0Daa396FA0b8B488FA7faF9050cb944239",
                1,
                1,
                "0xDf0360Ad8C5ccf25095Aa97ee5F2785c8d848620",
                "0x3EEBEA8080CAB74a79a2035dfA48d64E342396C4",
                ethers.utils.arrayify(ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], ['0x3D4bDd0Daa396FA0b8B488FA7faF9050cb944239', 100]))
            ]
        )
    )

    console.log(payload)

    await (await omniXExchange.sgReceive(1, ethers.utils.arrayify(ethers.utils.defaultAbiCoder.encode(['uint256'], [3])), 1, owner.address, 0, payload)).wait()

}