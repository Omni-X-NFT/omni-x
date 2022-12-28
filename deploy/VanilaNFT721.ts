import hre from 'hardhat'
import AZUKI from '../constants/azuki.json'
import BAYC from '../constants/bayc.json'
import PUDGY_PENGUINS from '../constants/pudgyPenguins.json'

const ARGS: any = {
  azuki: AZUKI,
  bayc: BAYC,
  'pudgy-penguins': PUDGY_PENGUINS,
}
// @ts-ignore
export const deployVanilaNFT = async (contract: string, { deployments, getNamedAccounts }) => {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  console.log(`>>> your address: ${deployer}`)
  const args = ARGS[contract][hre.network.name]

  await deploy('ERC721Vanila', {
    from: deployer,
    args: [
      args.name,
      args.symbol,
      args.baseTokenURI,
      args.startMintId,
      args.endMintId,
      args.maxTokensPerMint
    ],
    log: true,
    waitConfirmations: 1
  })
}
