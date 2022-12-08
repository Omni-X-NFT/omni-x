import hre from 'hardhat'
import { ethers } from 'ethers'
import LZ_ENDPOINTS from '../constants/layerzeroEndpoints.json'
import GREG_ARGS from '../constants/kanpaiPandas.json'
import STABLE_COINS from '../constants/usd.json'

type CHAINTYPE = {
  [key: string]: string
}

const ENDPOINTS: CHAINTYPE = LZ_ENDPOINTS
const stableCoins: CHAINTYPE = STABLE_COINS

// @ts-ignore
module.exports = async function ({ deployments, getNamedAccounts }) {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  console.log(`>>> your address: ${deployer}`)

  const lzEndpointAddress = ENDPOINTS[hre.network.name]
  // @ts-ignore
  const aonftArgs = GREG_ARGS[hre.network.name]
  const stableAddr = stableCoins[hre.network.name] || ethers.constants.AddressZero
  console.log([
    aonftArgs.name,
    aonftArgs.symbol,
    lzEndpointAddress,
    aonftArgs.startMintId,
    aonftArgs.endMintId,
    aonftArgs.maxTokensPerMint,
    aonftArgs.baseTokenURI,
    stableAddr
  ])
  console.log(`[${hre.network.name}] LayerZero Endpoint address: ${lzEndpointAddress}`)

  await deploy('KanpaiPandas', {
    from: deployer,
    args: [
      aonftArgs.name,
      aonftArgs.symbol,
      lzEndpointAddress,
      aonftArgs.startMintId,
      aonftArgs.endMintId,
      aonftArgs.maxTokensPerMint,
      aonftArgs.baseTokenURI,
      stableAddr
    ],
    log: true,
    waitConfirmations: 1
  })
}

module.exports.tags = ['KanpaiPandas']
