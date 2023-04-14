import { loadAbi, createContractByName } from './shared'




const AdvancedONFT721GaslessAbi = loadAbi('../artifacts/contracts/token/onft/extension/AdvancedONFT721Gasless.sol/AdvancedONFT721Gasless.json')
const tx = async (tx1: any) => {
    await tx1.wait()
  }
export const sendBatch721 = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const dstChainId = 10132


  const advancedONFT721Gasless = createContractByName(hre, 'AdvancedONFT721Gasless', AdvancedONFT721GaslessAbi().abi, owner)

  const gas = await advancedONFT721Gasless.estimateSendBatchFee(dstChainId, owner.address, [8504, 8505, 8506, 8507], false, ethers.utils.solidityPack(['uint16', 'uint256'], [1, 200000 + 120000]))
  await tx(await advancedONFT721Gasless.sendBatchFrom(
    owner.address,
    dstChainId,
    owner.address,
    [8504, 8505, 8506, 8507],
    owner.address,
    ethers.constants.AddressZero,
    ethers.utils.solidityPack(['uint16', 'uint256'], [1,200000 + 120000]), {value: gas.nativeFee.toString()}
    ))
}