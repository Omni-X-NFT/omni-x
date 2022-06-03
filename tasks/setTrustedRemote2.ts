export const setTrustedRemote2 = async function (taskArgs: any) {
  // @ts-ignore
  const { ethers, network } = hre

  const {
    contract: contractName,
    src: srcAddr,
    dst: dstAddr,
    dstchain: dstChainId
  } = taskArgs

  const [deployer] = await ethers.getSigners()
  const contractInstance = await ethers.getContractAt(contractName, srcAddr, deployer)

  await contractInstance.setTrustedRemote(dstChainId, dstAddr)

  console.log(`✅ [${network.name}] setTrustedRemote(${dstChainId}, ${dstAddr})`)
}
