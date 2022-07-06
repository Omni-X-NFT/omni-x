export const checkNonce = async () => {
  // @ts-ignore
  // eslint-disable-next-line
  const { ethers, network } = hre
  const [, , , deployer] = await ethers.getSigners()

  const tx = await deployer.getTransactionCount()

  console.log(`${network.name}: Transaction Count of ${deployer.address} is ${tx}`)
}
