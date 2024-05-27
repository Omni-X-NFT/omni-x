// eslint-disable-next-line camelcase
import { OmniAxAdventures, OmniAxAdventures__factory } from 'typechain-types'

export const withdraw = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()

  // eslint-disable-next-line camelcase
  const onft: OmniAxAdventures = OmniAxAdventures__factory.connect(taskArgs.address, owner)
  try {
    const tx = await onft.withdraw()
    console.log(`✅ withdraw for ${taskArgs.address} on ${network} is ${tx.hash}`)
  } catch (e: any) {
    console.log(e)
  }
}
