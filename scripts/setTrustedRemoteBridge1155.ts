import hre, { ethers } from 'hardhat'

import Abi from '../artifacts/contracts/OmniBridge1155.sol/OmniBridge1155.json'
import GoerliAdr from '../deployments/goerli/OmniBridge1155.json'
import BscAdr from '../deployments/bsc-testnet/OmniBridge1155.json'
import FujiAdr from '../deployments/fuji/OmniBridge1155.json'
import MumbaiAdr from '../deployments/mumbai/OmniBridge1155.json'
import ArbitrumGoerliAdr from '../deployments/arbitrum-goerli/OmniBridge1155.json'
import OptimismGoerliAdr from '../deployments/optimism-goerli/OmniBridge1155.json'
import FantomAdr from '../deployments/fantom-testnet/OmniBridge1155.json'
import MoonbeamAdr from '../deployments/moonbeam_testnet/OmniBridge1155.json'

interface ChainIds {
    [key: number]: [any, any]
}

const chainIds: ChainIds = {
  6: [10121, GoerliAdr.address],
  3: [10102, BscAdr.address],
  1: [10106, FujiAdr.address],
  0: [10109, MumbaiAdr.address],
  2: [10143, ArbitrumGoerliAdr.address],
  7: [10132, OptimismGoerliAdr.address],
  5: [10112, FantomAdr.address],
  4: [10126, MoonbeamAdr.address]
}

// Developer: adjust chainIds so the key for the network you are sending transactions to is set to 0
//           then run: $ npx hardhat run scripts/setTrustedRemoteBridge1155.ts --network <network>

async function main () {
  const signer = (await hre.ethers.getSigners())[0]
  let trustedRemote

  // DEVELOPER: uncomment the section below and input addresses for quick test


  // const Contract = new ethers.Contract(GoerliAdr.address, Abi.abi, signer)
  //  const test = await Contract.isTrustedRemote(10102, hre.ethers.utils.solidityPack(['address', 'address'], [chainIds[0][1], chainIds[1][1]]))
  //  console.log(test)
  // const test2 = await Contract.getTrustedRemoteAddress(10109)
  // console.log(test2)

  for (let i = 1; i < 8; i++) {
    const Contract = new ethers.Contract(chainIds[0][1], Abi.abi, signer)
    trustedRemote = hre.ethers.utils.solidityPack(['address', 'address'], [chainIds[i][1], chainIds[0][1]])
    const gasEstimate = await Contract.estimateGas.setTrustedRemote(chainIds[i][0], trustedRemote)
    const gasPriceEstimate = await signer.getGasPrice()
    const tx = await Contract.setTrustedRemote(chainIds[i][0], trustedRemote, { gasLimit: parseInt(gasEstimate.toString()) + 100000, gasPrice: Math.floor((parseInt(gasPriceEstimate.toString()) * 1.1)) })
    const receipt = await tx.wait()
    console.log(`Transaction hash: ${tx.hash}`)
  }

}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
