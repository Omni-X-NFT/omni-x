import shell from 'shelljs'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import ONFT_ARGS from '../constants/ONFT721AArgs.json'
import * as CHAIN_ID from '../constants/chainIds.json'
import { loadAbi, createContractByName, deployContract, environments, submitTx, submitReturnTx } from './shared'
import fs from 'fs'
import LZEndpointABI from '../constants/LZEndpointABI.json'

type CHAINIDTYPE = {
  [key: string]: number
}

const AdvancedONFT721AAbi = loadAbi(
  '../artifacts/contracts/token/onft721A/extension/AdvancedONFT721AOpen.sol/AdvancedONFT721AOpen.json'
)

function getContract (collection: string, owner: any, hre: any, network: string): any {
  let onft721A
  if (network === 'zksync' || network === 'zksync-testnet') {
    const path = `../artifacts-zk/contracts/token/onft721A/extension/collections/${collection}.sol/${collection}.json`
    if (!fs.existsSync(path)) {
      console.log('zk aritfact not found please run npx hardhat compile --network zksync')
      return
    }
    const ContractArtifact = require(path)
    onft721A = createContractByName(hre, collection, ContractArtifact.abi, owner)
  } else {
    // onft721A = createContractByName(hre, 'OmnichainAdventures', ContractArtifact.abi, owner)
    onft721A = createContractByName(hre, collection, AdvancedONFT721AAbi().abi, owner)
  }

  return onft721A
}

const CHAIN_IDS: CHAINIDTYPE = CHAIN_ID

// const LZEndpointAbi = loadAbi('../artifacts/contracts/layerzero/LZEndpoint.sol/LZEndpoint.json')

export const deployAdvancedONFT721A = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const args = (ONFT_ARGS as any)[taskArgs.collection][network.name]
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
  if (network.name !== 'zksync' && network.name !== 'zksync-testnet') {
    await deployContract(hre, 'AdvancedONFT721AOpen', owner, [
      args.name,
      args.symbol,
      lzEndpoint,
      args.startId,
      args.maxId,
      args.maxGlobalId,
      args.basetokenURI,
      args.hiddenURI,
      args.tax,
      args.price,
      args.wlPrice,
      args.token,
      args.taxRecipient,
      args.beneficiary
    ])
  }
}

export const deployAllAdvancedONFT721A = async (taskArgs: any) => {
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
      const checkWireUpCommand = `npx hardhat deployAdvancedONFT721A --network ${network} --collection ${taskArgs.collection}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

export const trustedRemoteLookup = async (taskArgs: any, hre: any) => {
  const { ethers } = hre
  const [owner] = await ethers.getSigners()
  const targetDstChainId = CHAIN_IDS[taskArgs.target]
  const collectionContract = createContractByName(hre, taskArgs.collection, AdvancedONFT721AAbi().abi, owner)
  try {
    const result = await submitReturnTx(hre, collectionContract, 'trustedRemoteLookup', [targetDstChainId])
    console.log(`✅ trustedRemoteLookup for ${taskArgs.collection} on ${taskArgs.target} is ${result}`)
  } catch (e: any) {
    console.log(e)
  }
}

export const prepareAdvancedONFT721A = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()

  const args = (ONFT_ARGS as any)[taskArgs.collection][network.name]
  let dstChainId
  if (taskArgs.target !== 'none') {
    dstChainId = CHAIN_IDS[taskArgs.target]
  }
  let onft721A
  if (network.name === 'zksync' || network.name === 'zksync-testnet') {
    const path = `../artifacts-zk/contracts/token/onft721A/extension/collections/${taskArgs.collection}.sol/${taskArgs.collection}.json`
    if (!fs.existsSync(path)) {
      console.log('zk aritfact not found please run npx hardhat compile --network zksync')
      return
    }
    const ContractArtifact = require(path)
    onft721A = createContractByName(hre, taskArgs.collection, ContractArtifact.abi, owner)
  } else {
    // onft721A = createContractByName(hre, 'OmnichainAdventures', ContractArtifact.abi, owner)
    onft721A = createContractByName(hre, 'AdvancedONFT721AOpen', AdvancedONFT721AAbi().abi, owner)
  }

  if (taskArgs.lzconfig === 'true') {
    console.log(dstChainId)
    try {
      await submitTx(hre, onft721A, 'setDstChainIdToBatchLimit', [dstChainId, args.batchLimit])
      await submitTx(hre, onft721A, 'setDstChainIdToTransferGas', [dstChainId, args.transferGas])
      await submitTx(hre, onft721A, 'setMinDstGas', [dstChainId, 1, args.minDstGas])
      console.log(`${hre.network.name}`)
      console.log(`✅ set batch limit for (${dstChainId}) to ${args.batchLimit} `)
      console.log(`✅ set transfer gas for (${dstChainId}) to ${args.transferGas} `)
      console.log(`✅ set min dst gas for (${dstChainId}) to ${args.minDstGas} `)
    } catch (e: any) {
      console.log(e)
    }
  }
  if (taskArgs.startmint === 'true' || taskArgs.reveal === 'true') {
    const provider = hre.ethers.getDefaultProvider()
    const block = await provider.getBlock('latest')
    const timestamp = block.timestamp
    console.log(`timestamp: ${timestamp}`)
    // commented out the check because we need to set reveal for non-minting chains too
    // if (args.startId !== args.maxId) {
    try {
      const nftState = {
        saleStarted: taskArgs.startmint === 'true',
        revealed: taskArgs.reveal === 'true',
        startTime: timestamp,
        mintLength: 3024000 // 5 weeks
      }
      await submitTx(hre, onft721A, 'setNftState', [nftState])
      console.log('✅ set nft state')
    } catch (e: any) {
      console.log(e)
    }
    // }
  }
  if (taskArgs.bridgefee === 'true') {
    try {
      await submitTx(hre, onft721A, 'setBridgeFee', [args.bridgeFee])
      console.log(`✅ set bridge fee for (${dstChainId}) to ${args.bridgeFee} `)
    } catch (e: any) {
      console.log(e)
    }
  }
}

export const withdraw = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const onft721A = getContract(taskArgs.collection, owner, hre, network.name)

  try {
    await submitTx(hre, onft721A, 'withdraw', [])
    console.log('✅ withdraw')
  } catch (e: any) {
    console.log(e)
  }
}

export const withdrawAll = async (taskArgs: any) => {
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
      const checkWireUpCommand = `npx hardhat --network ${network} withdraw --collection ${taskArgs.collection}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

export const setMerkleRoot = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()

  const args = (ONFT_ARGS as any)[taskArgs.collection][network.name]
  const onft721A = getContract(taskArgs.collection, owner, hre, network.name)

  try {
    await submitTx(hre, onft721A, 'setMerkleRoot', [args.merkleRoot])
  } catch (e: any) {
    console.log(e)
  }
}

export const setAllMerkleRoot = async (taskArgs: any) => {
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
      const checkWireUpCommand = `npx hardhat --network ${network} setMerkleRoot --collection ${taskArgs.collection}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

export const setBridgeFees = async (taskArgs: any, hre: any) => {
  let networks = environments[taskArgs.e]

  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }

  if (taskArgs.exclude !== 'none') {
    const netExclude = taskArgs.exclude.split(',')
    networks = networks.filter((n: string) => !netExclude.includes(n))
  }

  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat prepareAdvancedONFT721A --network ${network} --target none --lzconfig false --startmint false --reveal false --bridgefee true --collection ${taskArgs.collection}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

export const setMetadata = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const args = (ONFT_ARGS as any)[taskArgs.collection][network.name]
  let onft721A
  if (network.name === 'zksync' || network.name === 'zksync-testnet') {
    const path = `../artifacts-zk/contracts/token/onft721A/extension/collections/${taskArgs.collection}.sol/${taskArgs.collection}.json`
    if (!fs.existsSync(path)) {
      console.log('zk aritfact not found please run npx hardhat compile --network zksync')
      return
    }
    const ContractArtifact = require(path)
    onft721A = createContractByName(hre, taskArgs.collection, ContractArtifact.abi, owner)
  } else {
    onft721A = createContractByName(hre, taskArgs.collection, AdvancedONFT721AAbi().abi, owner)
  }

  const metadata = {
    baseURI: args.baseURI,
    hiddenMetadataURI: args.hiddenURI
  }

  try {
    await submitTx(hre, onft721A, 'setMetadata', [metadata])
    console.log('✅ set metadata')
  } catch (e: any) {
    console.log(e)
  }
}

export const setAllMetadata = async (taskArgs: any) => {
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
      const checkWireUpCommand = `npx hardhat --network ${network} setMetadata --collection ${taskArgs.collection}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

export const prepareAllAdvancedONFT721A = async (taskArgs: any) => {
  let networks = environments[taskArgs.e]
  let targets = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }

  if (taskArgs.netexclude !== 'none') {
    const netExclude = taskArgs.netexclude.split(',')
    networks = networks.filter((n: string) => !netExclude.includes(n))
  }
  if (taskArgs.exclude !== 'none') {
    const exclude = taskArgs.exclude.split(',')
    targets = targets.filter((n: string) => !exclude.includes(n))
  }
  console.log(networks)
  console.log(targets)
  await Promise.all(
    networks.map(async (network: string) => {
      targets.map(async (target: string) => {
        if (network !== target) {
          const checkWireUpCommand = `npx hardhat --network ${network} prepareAdvancedONFT721A --target ${target} --collection ${taskArgs.collection} --lzconfig ${taskArgs.lzconfig} --startmint ${taskArgs.startmint} --reveal ${taskArgs.reveal} --bridgefee false`
          console.log(checkWireUpCommand)
          shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
        }
      })
    })
  )
}

export const sendCross = async (taskArgs: any, hre: any) => {
  const { ethers } = hre
  const [owner] = await ethers.getSigners()
  const dstChainId = CHAIN_IDS[taskArgs.target]
  const onft = createContractByName(hre, 'OmniWave', AdvancedONFT721AAbi().abi, owner)
  const adapterParams = ethers.utils.solidityPack(['uint16', 'uint256'], [1, 400000])
  const gas = await submitReturnTx(hre, onft, 'estimateSendFee', [
    dstChainId,
    owner.address,
    taskArgs.tokenid,
    false,
    adapterParams
  ])
  await submitTx(
    hre,
    onft,
    'sendFrom',
    [
      owner.address,
      dstChainId,
      owner.address,
      taskArgs.tokenid,
      owner.address,
      ethers.constants.AddressZero,
      adapterParams
    ],
    { value: gas[0].add(50000000000000).toString() }
  )
}

export const mint = async (taskArgs: any, hre: any) => {
  const { ethers } = hre
  const [owner] = await ethers.getSigners()
  const onft = createContractByName(hre, 'OmniWave', AdvancedONFT721AAbi().abi, owner)
  await submitTx(hre, onft, 'mint', [taskArgs.amount])
  console.log(`✅ minted ${taskArgs.amount} to ${owner.address}`)
}

export const mintAll = async (taskArgs: any) => {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat --network ${network} mint721A --amount ${taskArgs.amount}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

export const transferOwnership = async (taskArgs: any, hre: any) => {
  const { ethers } = hre
  const [owner] = await ethers.getSigners()
  const onft = getContract(taskArgs.collection, owner, hre, hre.network.name)
  await submitTx(hre, onft, 'transferOwnership', [taskArgs.address])
}

export const transferAllOwnership = async (taskArgs: any) => {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  await Promise.all(
    networks.map(async (network: string) => {
      const checkWireUpCommand = `npx hardhat --network ${network} transferOwnership --address ${taskArgs.address} --collection ${taskArgs.collection}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

export const expandCollection = async (taskArgs: any, hre: any) => {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  let checkWireUpCommand

  checkWireUpCommand = `npx hardhat deployAllAdvancedONFT721A --e ${taskArgs.e} --collection ${taskArgs.collection} --exclude ${taskArgs.oldchains}`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat prepareAllAdvancedONFT721A --e ${taskArgs.e} --collection ${taskArgs.collection} --lzconfig ${taskArgs.lzconfig} --startmint false --reveal false --netexclude ${taskArgs.oldchains} --exclude none `
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat setAllTrustedRemote --e ${taskArgs.e} --contract ${taskArgs.collection} --netexclude ${taskArgs.oldchains} --exclude none`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat prepareAllAdvancedONFT721A --e ${taskArgs.e} --collection ${taskArgs.collection} --lzconfig ${taskArgs.lzconfig} --startmint false --reveal false --netexclude ${taskArgs.newchains} --exclude ${taskArgs.oldchains} `
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat setAllTrustedRemote --e ${taskArgs.e} --contract ${taskArgs.collection} --netexclude ${taskArgs.newchains} --exclude ${taskArgs.oldchains}`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat setBridgeFees --e ${taskArgs.e} --collection ${taskArgs.collection} --exclude ${taskArgs.oldchains}`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  // checkWireUpCommand = `npx hardhat verifyAll --e ${taskArgs.e} --tags OmnichainAdventures`
  // console.log(checkWireUpCommand)
  // shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  // checkWireUpCommand = `npx hardhat prepareAllAdvancedONFT721A --e ${taskArgs.e} --collection ${taskArgs.collection} --lzconfig false --startmint ${taskArgs.startmint} --reveal ${taskArgs.reveal}`
  // console.log(checkWireUpCommand)
  // shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
}

export const deployCollection = async (taskArgs: any, hre: any) => {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  let checkWireUpCommand

  checkWireUpCommand = `npx hardhat deployAllAdvancedONFT721A --e ${taskArgs.e} --collection ${taskArgs.collection} --exclude none`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat prepareAllAdvancedONFT721A --e ${taskArgs.e} --collection ${taskArgs.collection} --lzconfig ${taskArgs.lzconfig} --startmint false --reveal false --exclude none --netexclude none`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat setAllTrustedRemote --e ${taskArgs.e} --contract ${taskArgs.collection} --exclude none --netexclude none`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat setBridgeFees --e ${taskArgs.e} --collection ${taskArgs.collection} --exclude none`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat verifyAll --e ${taskArgs.e} --tags ${taskArgs.collection}`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  // checkWireUpCommand = `npx hardhat prepareAllAdvancedONFT721A --e ${taskArgs.e} --collection ${taskArgs.collection} --lzconfig false --startmint ${taskArgs.startmint} --reveal ${taskArgs.reveal}`
  // console.log(checkWireUpCommand)
  // shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
}
export const estimateSendFee = async (taskArgs: any, hre: any) => {
  const { ethers } = hre
  const [owner] = await ethers.getSigners()

  // get lz endpoint instance
  const lzEndpoint = new ethers.Contract('0x3c2269811836af69497E5F486A85D7316753cf62', LZEndpointABI, owner)

  // establish adapterParams
  const adapterParams = ethers.utils.solidityPack(['uint16', 'uint256'], [1, 400000])

  // load onft address

  const onftAddress = '0xf42647D472B6D2299eB283081714C8657e657295'

  // destination chain id
  const dstChainId = 101

  // use a list with single tokenId if it is not a batch send
  const tokenIds = [1]
  // get payload
  const abi = ethers.utils.defaultAbiCoder
  const payload = abi.encode(['bytes', 'uint256[]'], [onftAddress, tokenIds])

  // get gas estimate
  const response = await lzEndpoint.estimateFees(
    dstChainId,
    onftAddress,
    payload,
    false, // useZro
    adapterParams
  )
  // native fee is first element in response array. It is returned as a BigNumber
  const gas = response[0]
  console.log(gas.toString())
}
