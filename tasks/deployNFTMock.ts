
import { deployContract, createContractByName, loadAbi } from './shared'
import shell from 'shelljs'


const environments: any = {
    mainnet: ['ethereum', 'bsc', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom'],
    testnet: ['goerli', 'bsc-testnet', 'mumbai', 'arbitrum-goerli', 'moonbeam_testnet', 'fantom-testnet', 'optimism-goerli', 'fuji']
}



export const deployNFTMock = async function (taskArgs: any, hre: any) {
    const { ethers, network } = hre
    
    const [owner] = await ethers.getSigners()
    const transferManager721ABI = loadAbi('../artifacts/contracts/transfer/TransferManagerERC721.sol/TransferManagerERC721.json')

    const transferManager721 = createContractByName(hre, 'TransferManagerERC721', transferManager721ABI().abi, owner)

    let nftMock

    
    
    if (network.name === 'optimism-goerli') {
        nftMock = await deployContract(hre, 'Nft721Mock', owner, [{gasPrice: 30000}])
    } else {
        nftMock = await deployContract(hre, 'Nft721Mock', owner, [])
    }

    for (let i = 1; i <= taskArgs.amount; i++) {

        try {
            if (network.name === 'optimism-goerli') {
                await (await nftMock.mintTo(owner.address, {gasPrice: 30000})).wait()
                await (await nftMock.approve(transferManager721.address, i, {gasPrice: 30000})).wait()
            } else {
                await (await nftMock.mintTo(owner.address)).wait()
                await (await nftMock.approve(transferManager721.address, i)).wait()
            }
        } catch (e) {
            console.log(e)
        }
       
    }
}

export const deployAllNFTMock = async function (taskArgs: any) {
    const networks = environments[taskArgs.e]
    if (!taskArgs.e || networks.length === 0) {
        console.log(`Invalid environment argument: ${taskArgs.e}`)
    }

    await Promise.all(
        networks.map(async (network: string) => {
            const checkWireUpCommand = `npx hardhat deployNFTMock --network ${network} --amount ${taskArgs.amount}`
            console.log(checkWireUpCommand)
            shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
        })
    )
}
