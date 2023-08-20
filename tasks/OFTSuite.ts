import shell from 'shelljs'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import OFT_ARGS from '../constants/OFTArgs.json'
import * as CHAIN_ID from '../constants/chainIds.json'
import { loadAbi, createContractByName, deployContract, environments, submitTx, submitReturnTx } from './shared'
import { getDeploymentAddresses } from '../utils/readStatic'


type CHAINIDTYPE = {
    [key: string]: number
}

const CHAIN_IDS: CHAINIDTYPE = CHAIN_ID

const WrappedFriendProxyAbi = loadAbi('../artifacts/contracts/token/oft/WrappedFriendProxy.sol/WrappedFriendProxy.json')
const OmniWrappedFriendAbi = loadAbi('../artifacts/contracts/token/oft/OmniWrappedFriend.sol/OmniWrappedFriend.json')


export const deployOFT = async function (taskArgs: any, hre: any) {
  const { ethers, network } = hre

  const [owner] = await ethers.getSigners()
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
  const args = (OFT_ARGS as any)[taskArgs.collection][network.name]
  if (network.name !== 'zksync' && network.name !== 'zksync-testnet') {
    await deployContract(hre, taskArgs.collection, owner, [
      args.name,
      args.symbol,
      lzEndpoint
    ])
  }
}

export const deployProxyOFT = async function (taskArgs:any, hre: any) {
  const { ethers, network } = hre

  const [owner] = await ethers.getSigners()
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
  const args = (OFT_ARGS as any)[taskArgs.collection][network.name]
  if (network.name !== 'zksync' && network.name !== 'zksync-testnet') {
    await deployContract(hre, taskArgs.collection, owner, [
      lzEndpoint,
      args.baseToken
    ])
  }
}


export const deployAllOFT = async (taskArgs: any) => {
  let networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  if (taskArgs.exclude !== 'none') {
    const exclude = taskArgs.exclude.split(',')
    networks = networks.filter((n: string) => !exclude.includes(n))
  }


  await Promise.all(
    networks.map(async (network: string) => {
      if (network !== 'base') {
        const checkWireUpCommand = `npx hardhat deployOFT --network ${network} --collection ${taskArgs.collection}`
        console.log(checkWireUpCommand)
        shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
      }
    })
  )
}

export const bridgeOFT = async function (taskArgs: any, hre: any) {
  const { ethers } = hre
  const [owner] = await ethers.getSigners()
  const dstChainId = CHAIN_IDS[taskArgs.target]
  const onft = createContractByName(hre, 'OmniWrappedFriend', OmniWrappedFriendAbi().abi, owner)
  const gas = await submitReturnTx(hre, onft, 'estimateSendFee', [dstChainId, owner.address, taskArgs.amount, false, "0x"])
  console.log(gas[0].toString())
  await submitTx(hre, onft, 'sendFrom', [owner.address, dstChainId, owner.address, taskArgs.amount, owner.address, ethers.constants.AddressZero, "0x"], { value: (gas[0].toString()) })
}

export const setOFTTrustedRemote = async function (taskArgs: any, hre: any) {
  const [deployer] = await hre.ethers.getSigners()

  let srcContractName = 'OmniNFT'
  let dstContractName = srcContractName
  if (taskArgs.contract === 'WrappedFriendProxy') {
    srcContractName = taskArgs.contract
    dstContractName = 'OmniWrappedFriend'
  } else if (taskArgs.contract === 'OmniWrappedFriend') {
    srcContractName = taskArgs.contract
    dstContractName = 'WrappedFriendProxy'
  }

  const dstChainId = CHAIN_IDS[taskArgs.target]
  const dstAddr = getDeploymentAddresses(taskArgs.target)[dstContractName]
  // get local contract instance
  const addresses = getDeploymentAddresses(hre.network.name)[srcContractName]
  const contractInstance = await hre.ethers.getContractAt(srcContractName, addresses, deployer)
  console.log(`[source] contract address: ${contractInstance.address}`)

  // setTrustedRemote() on the local contract, so it can receive message from the source contract
  try {
    const trustedRemote = hre.ethers.utils.solidityPack(['address', 'address'], [dstAddr, addresses])
    await submitTx(hre, contractInstance, 'setTrustedRemote', [dstChainId, trustedRemote])
    console.log(`✅ [${hre.network.name}] setTrustedRemote(${dstChainId}, ${dstAddr})`)
  } catch (e: any) {
    console.log(e)
  }
}


export const setAllOFTTrustedRemote = async function (taskArgs: any, hre: any) {
  let networks = environments[taskArgs.e]
  let targets = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  if (taskArgs.netexclude !== 'none') {
    const exclude = taskArgs.netexclude.split(',')
    networks = networks.filter((n: string) => !exclude.includes(n))
  }
  if (taskArgs.exclude !== 'none') {
    const exclude = taskArgs.exclude.split(',')
    targets = targets.filter((n: string) => !exclude.includes(n))
  }

  if (taskArgs.contract === 'WrappedFriendProxy') {
    await Promise.all(
      networks.map(async (network: string) => {
        targets.map(async (target: string) => {
          if ((network !== target) && (network === 'base')) {
            const checkWireUpCommand = `npx hardhat --network ${network} setTrustedRemote --target ${target} --contract ${taskArgs.contract}`
            shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
          }
        })
      })
    )
  } else {
    await Promise.all(
      networks.map(async (network: string) => {
        targets.map(async (target: string) => {
          if ((network !== target) && (network !== 'base')) {
            const checkWireUpCommand = `npx hardhat --network ${network} setTrustedRemote --target ${target} --contract ${taskArgs.contract}`
            shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
          }
        })
      })
    )
  }
}

