import { getContractAddrByName } from './shared'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'

export const verifyOmni = async () => {
  // @ts-ignore
  // eslint-disable-next-line
  const { run, network } = hre
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
  // const [owner] = await ethers.getSigners()

  await run('verify:verify', {
    address: getContractAddrByName(network.name, 'TransferManagerGhosts'),
    constructorArguments: [
      getContractAddrByName(network.name, 'OmniXExchange'), lzEndpoint
    ]
  })

  // await run('verify:verify', {
  //     address: getContractAddrByName(network.name, 'OmniXExchange'),
  //     constructorArguments: [
  //         getContractAddrByName(network.name, 'CurrencyManager'),
  //         getContractAddrByName(network.name, 'ExecutionManager'),
  //         getContractAddrByName(network.name, 'RoyaltyFeeManager'),
  //         ethers.constants.AddressZero,
  //         owner.address
  //     ],
  //     contract: "contracts/core/OmniXExchange.sol:OmniXExchange"
  // })
}
