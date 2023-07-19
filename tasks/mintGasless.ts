import { loadAbi, createContractByName } from './shared'
// import { MerkleTree } from 'merkletreejs'
// import keccak256 from 'keccak256'
import { GelatoRelay, CallWithSyncFeeRequest } from '@gelatonetwork/relay-sdk'



const relay = new GelatoRelay()
const AdvancedONFT721GaslessAbi = loadAbi('../artifacts/contracts/token/onft/extension/AdvancedONFT721Gasless.sol/AdvancedONFT721Gasless.json')


export const mintGasless721 = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  // const leaves = snapshotData.map((holder) => keccak256(ethers.utils.solidityPack(['address', 'uint256'], [holder.address, holder.count])))
  // const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
  // const leaf = keccak256(ethers.utils.solidityPack(['address', 'uint256'], [taskArgs.adr, taskArgs.gregs]))
  // const proof = tree.getHexProof(leaf)

  const advancedONFT721Gasless = createContractByName(hre, 'AdvancedONFT721Gasless', AdvancedONFT721GaslessAbi().abi, owner)
  const { data } = await advancedONFT721Gasless.populateTransaction.mintGasless(taskArgs.amt, taskArgs.adr, '', taskArgs.gregs)
  const request: CallWithSyncFeeRequest = {
    chainId: network.config.chainId,
    target: advancedONFT721Gasless.address,
    data: data as any,
    feeToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    isRelayContext: true
  }
  const relayResponse = await relay.callWithSyncFee(request)

  console.log('Minted ', taskArgs.amt, ' tokens for ', taskArgs.adr)
  console.log(relayResponse)
}