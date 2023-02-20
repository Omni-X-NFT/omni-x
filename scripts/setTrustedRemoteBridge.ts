import hre, { ethers } from 'hardhat'

import Abi from '../artifacts/contracts/OmniBridge.sol/OmniBridge.json'
import GoerliAdr from '../deployments/goerli/OmniBridge.json'
import BscAdr from '../deployments/bsc-testnet/OmniBridge.json'
import FujiAdr from '../deployments/fuji/OmniBridge.json'
import MumbaiAdr from '../deployments/mumbai/OmniBridge.json'
import ArbitrumGoerliAdr from '../deployments/arbitrum-goerli/OmniBridge.json'
import OptimismGoerliAdr from '../deployments/optimism-goerli/OmniBridge.json'
import FantomAdr from '../deployments/fantom-testnet/OmniBridge.json'
import MoonbeamAdr from '../deployments/moonbeam_testnet/OmniBridge.json'

interface ChainIds {
    [key: number]: [any, any]
}

const chainIds: ChainIds = {
  1: [10121, GoerliAdr.address],
  6: [10102, BscAdr.address],
  3: [10106, FujiAdr.address],
  0: [10109, MumbaiAdr.address],
  5: [10143, ArbitrumGoerliAdr.address],
  2: [10132, OptimismGoerliAdr.address],
  7: [10112, FantomAdr.address],
  4: [10126, MoonbeamAdr.address]
}

// Developer: adjust chainIds so the key for the network you are sending transactions to is set to 0
//           then run: $ npx hardhat run scripts/setTrustedRemoteBridge.ts --network <network>

async function main () {
  const signer = (await hre.ethers.getSigners())[0]
  let trustedRemote

  // DEVELOPER: uncomment the section below and input addresses for quick test

  //  const Contract = new ethers.Contract(FantomAdr.address, Abi.abi, signer)
  //   const test = await Contract.isTrustedRemote(10102, hre.ethers.utils.solidityPack(['address', 'address'], [chainIds[0][1], chainIds[6][1]]))
  //   console.log(test)
  //   const test2 = await Contract.getTrustedRemoteAddress(10109)
  //   console.log(test2)

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
