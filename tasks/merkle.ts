
import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256'
import snapshotData from '../constants/DadBrosFriendsFinalSnapshot.json'

export const MerkleGen = async function (taskArgs: any, hre: any) {
  const { ethers } = hre
  const leaves = (snapshotData as any).map((x: any) => keccak256(ethers.utils.solidityPack(['address', 'uint256'], [x.address, x.count])))
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
  const root = tree.getHexRoot()
  console.log('Merkle Root:', root.toString())
  const leaf = keccak256(ethers.utils.solidityPack(['address', 'uint256'], [taskArgs.adr, taskArgs.amt]))
  const proof = tree.getHexProof(leaf)
  console.log('Proof:', proof)
}

export const MerkleGenWithIds = async function (taskArgs: any, hre: any) {
  const { ethers } = hre
  const leaves = (snapshotData as any).map((x: any) => keccak256(ethers.utils.solidityPack(['address', 'uint256[]'], [x.address, x.ids])))
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
  const root = tree.getHexRoot()
  console.log('Merkle Root:', root.toString())
  const data = (snapshotData as any).find((x: any) => x.address === taskArgs.adr)
  const leaf = keccak256(ethers.utils.solidityPack(['address', 'uint256[]'], [taskArgs.adr, data.ids]))
  const proof = tree.getHexProof(leaf)
  console.log('Proof:', proof)
}