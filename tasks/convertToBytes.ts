

export const convertToBytes = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre
  
  const bytesRep = ethers.utils.defaultAbiCoder.encode(["address"], [taskArgs.adr])
  console.log(bytesRep)
}