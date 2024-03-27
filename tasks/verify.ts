import shell from 'shelljs'
import { getContractAddrByName, environments } from './shared'
import { getDeploymentAddresses } from '../utils/readStatic'
import LZ_ENDPOINTS from '../constants/layerzeroEndpoints.json'
// import STARGATE from '../constants/stargate.json'
import ONFTA_ARGS from '../constants/ONFT721AArgs.json'

type ENDPOINT_TYPE = {
  [key: string]: string
}

const ENDPOINTS: ENDPOINT_TYPE = LZ_ENDPOINTS

export const verifyAll = async function (taskArgs: any, hre: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }

  if (!taskArgs.tags) {
    console.log(`Invalid tags name: ${taskArgs.tags}`)
  }

  await Promise.all(
    networks.map(async (network: string) => {
      // @ts-ignore
      const aonftArgs = ONFTA_ARGS.OmniGaws[network]
      const address = getDeploymentAddresses(network)[taskArgs.tags]
      console.log(address)
      const endpointAddr = ENDPOINTS[network]
      if (address) {
        const checkWireUpCommand = `npx hardhat verify --contract contracts/token/onft721A/extension/AdvancedONFT721AOpen.sol:AdvancedONFT721AOpen --network ${network} ${address} "${aonftArgs.name}" "${aonftArgs.symbol}" ${endpointAddr} ${aonftArgs.startId} ${aonftArgs.maxId} ${aonftArgs.maxGlobalId} "${aonftArgs.basetokenURI}" "${aonftArgs.hiddenURI}" ${aonftArgs.tax} ${aonftArgs.price} ${aonftArgs.wlPrice} ${aonftArgs.token} ${aonftArgs.taxRecipient} ${aonftArgs.beneficiary}`
        console.log(checkWireUpCommand)
        shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
      }
    })
  )
}

export const verifyOmni = async () => {
  // @ts-ignore
  // eslint-disable-next-line
  const { ethers, run, network } = hre
  const [owner] = await ethers.getSigners()

  const lzEndpoint = ENDPOINTS[network.name]

  await run('verify:verify', {
    address: getContractAddrByName(network.name, 'OmniXExchange'),
    constructorArguments: [
      getContractAddrByName(network.name, 'CurrencyManager'),
      getContractAddrByName(network.name, 'ExecutionManager'),
      getContractAddrByName(network.name, 'RoyaltyFeeManager'),
      getContractAddrByName(network.name, 'SGETH') || ethers.constants.AddressZero,
      owner.address,
      lzEndpoint
    ],
    contract: 'contracts/core/OmniXExchange.sol:OmniXExchange'
  })

  // await run('verify:verify', {
  //   address: getContractAddrByName(network.name, 'FundManager'),
  //   constructorArguments: [
  //     getContractAddrByName(network.name, 'OmniXExchange')
  //   ],
  //   contract: 'contracts/core/FundManager.sol:FundManager'
  // })

  // const stargateEndpoint = (STARGATE as any)[network.name]
  // await run('verify:verify', {
  //   address: getContractAddrByName(network.name, 'StargatePoolManager'),
  //   constructorArguments: [stargateEndpoint.router, getContractAddrByName(network.name, 'SGETH') || ethers.constants.AddressZero],
  //   contract: 'contracts/core/StargatePoolManager.sol:StargatePoolManager'
  // })

  // await run('verify:verify', {
  //   address: getContractAddrByName(network.name, 'ExchangeRouter'),
  //   constructorArguments: [lzEndpoint],
  //   contract: 'contracts/core/ExchangeRouter.sol:ExchangeRouter'
  // })
}
