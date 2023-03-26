import { loadAbi, createContractByName } from './shared'
import snapshotData from '../constants/greg_holders_snapshot_final.json'
import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256'

const AdvancedONFT721GaslessAbi = loadAbi('../artifacts/contracts/token/onft/extension/AdvancedONFT721Gasless.sol/AdvancedONFT721Gasless.json')

const tx = async (tx1: any) => {
    await tx1.wait()
}

export const mintGasless721 = async function (taskArgs: any, hre: any) {
    const { ethers, network } = hre
    const [owner] = await ethers.getSigners()
    const leaves = snapshotData.map((holder) => keccak256(ethers.utils.solidityPack(["address", 'uint256'], [holder.address, holder.count])))
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
    const leaf = keccak256(ethers.utils.solidityPack(["address", 'uint256'], [taskArgs.adr, taskArgs.amt]))
    const proof = tree.getHexProof(leaf)
    
    const advancedONFT721Gasless = createContractByName(hre, 'AdvancedONFT721Gasless', AdvancedONFT721GaslessAbi().abi, owner)
    await tx(await advancedONFT721Gasless.mintGasless(taskArgs.amt, taskArgs.adr, proof))
    console.log('Minted ', taskArgs.amt, ' tokens for ', taskArgs.adr)

}