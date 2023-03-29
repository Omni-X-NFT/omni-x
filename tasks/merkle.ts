
import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256'
import snapshotData from '../constants/greg_holders_snapshot_final.json'

export const MerkleGen = async function (taskArgs: any, hre: any) {
  const { ethers } = hre
  const leaves = snapshotData.map((x) => keccak256(ethers.utils.solidityPack(['address', 'uint256'], [x.address, x.count])))
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
  const root = tree.getHexRoot()
  console.log('Merkle Root:', root.toString())
  const leaf = keccak256(ethers.utils.solidityPack(['address', 'uint256'], [taskArgs.adr, taskArgs.gregs]))
  const proof = tree.getHexProof(leaf)
  console.log('Proof:', proof.toString())
}