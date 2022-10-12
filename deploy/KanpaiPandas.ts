import hre from 'hardhat'
import LZ_ENDPOINTS from '../constants/layerzeroEndpoints.json'
// const AONFT_ARGS = require("../constants/advancedOnftArgs.json")
import GREG_ARGS from '../constants/kanpaiPandas.json'

type CHAINTYPE = {
  [key: string]: string
}

const ENDPOINTS: CHAINTYPE = LZ_ENDPOINTS

// @ts-ignore
module.exports = async function ({ deployments, getNamedAccounts }) {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  console.log(`>>> your address: ${deployer}`)

  const lzEndpointAddress = ENDPOINTS[hre.network.name]
  // @ts-ignore
  const aonftArgs = GREG_ARGS[hre.network.name]
  console.log({ aonftArgs })
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
      aonftArgs.baseTokenURI
    ],
    log: true,
    waitConfirmations: 1
  })
}

module.exports.tags = ['KanpaiPandas']
