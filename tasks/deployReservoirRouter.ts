import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import { deployContract, getContractAddrByName } from './shared'

export const deployReservoirRouter = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre

  const [owner] = await ethers.getSigners()
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]

  const router = await deployContract(hre, 'ExchangeRouter', owner, [
    lzEndpoint
  ])

  await router.setStargatePoolManager(getContractAddrByName(network.name, 'StargatePoolManager'));
}
