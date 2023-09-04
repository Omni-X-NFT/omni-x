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

const CHAIN_IDS: CHAINIDTYPE = CHAIN_ID

const AdvancedONFT721AAbi = loadAbi(
  '../artifacts/contracts/token/onft721A/extension/collections/OmniFlowers.sol/OmniFlowers.json'
)
// const LZEndpointAbi = loadAbi('../artifacts/contracts/layerzero/LZEndpoint.sol/LZEndpoint.json')

export const deployAdvancedONFT721A = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const args = (ONFT_ARGS as any)[taskArgs.collection][network.name]
  const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
  if (network.name !== 'zksync' && network.name !== 'zksync-testnet') {
    await deployContract(hre, taskArgs.collection, owner, [
      args.name,
      args.symbol,
      lzEndpoint,
      args.startId,
      args.endId,
      args.maxGlobalId,
      args.baseURI,
      args.hiddenURI,
      args.tax,
      args.price,
      args.taxRecipient,
      args.premint,
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
  const { ethers, network } = hre
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

export const startMint = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const onft = createContractByName(hre, taskArgs.collection, AdvancedONFT721AAbi().abi, owner)
  const nftstate = {
    publicSaleStarted: taskArgs.public === 'true',
    privateSaleStarted: taskArgs.private === 'true',
    revealed: taskArgs.reveal === 'true'
  }
  try {
    await submitTx(hre, onft, 'setNftState', [nftstate])
    console.log('✅ set nft state')
  } catch (e: any) {
    console.log(e)
  }
}

export const startAllMint = async (taskArgs: any, hre: any) => {
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
      const checkWireUpCommand = `npx hardhat --network ${network} startMint --collection ${taskArgs.collection} --reveal ${taskArgs.reveal} --public ${taskArgs.public} --private ${taskArgs.private}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
}

export const setFinanceDetails = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const [owner] = await ethers.getSigners()
  const onft = createContractByName(hre, taskArgs.collection, AdvancedONFT721AAbi().abi, owner)
  const financestate = {
    beneficiary: ONFT_ARGS[taskArgs.collection][network.name].beneficiary,
    taxRecipient: ONFT_ARGS[taskArgs.collection][network.name].taxRecipient,
    tax: ONFT_ARGS[taskArgs.collection][network.name].tax, // 100% = 10000
    price: ONFT_ARGS[taskArgs.collection][network.name].price
  }
  try {
    await submitTx(hre, onft, 'setFinanceDetails', [financestate])
    console.log('✅ set finance details')
  } catch (e: any) {
    console.log(e)
  }
}

export const setAllFinanceDetails = async (taskArgs: any, hre: any) => {
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
      const checkWireUpCommand = `npx hardhat --network ${network} setFinanceDetails --collection ${taskArgs.collection}`
      console.log(checkWireUpCommand)
      shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    })
  )
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
    onft721A = createContractByName(hre, taskArgs.collection, AdvancedONFT721AAbi().abi, owner)
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
  if (taskArgs.bridgefee === 'true') {
    try {
      await submitTx(hre, onft721A, 'setBridgeFee', [args.bridgeFee])
      console.log(`✅ set bridge fee for (${dstChainId}) to ${args.bridgeFee} `)
    } catch (e: any) {
      console.log(e)
    }
  }
}

export const setMerkleRoot = async (taskArgs: any, hre: any) => {
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
    // onft721A = createContractByName(hre, 'OmnichainAdventures', ContractArtifact.abi, owner)
    onft721A = createContractByName(hre, taskArgs.collection, AdvancedONFT721AAbi().abi, owner)
  }

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
      const checkWireUpCommand = `npx hardhat prepareAdvancedONFT721A --network ${network} --target none --lzconfig false --bridgefee true --collection ${taskArgs.collection}`
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
    hiddenMetadataURI: args.hiddenURIf
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
          const checkWireUpCommand = `npx hardhat --network ${network} prepareAdvancedONFT721A --target ${target} --collection ${taskArgs.collection} --lzconfig ${taskArgs.lzconfig}  --bridgefee false`
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
  const onft = createContractByName(hre, 'OmniFlowers', AdvancedONFT721AAbi().abi, owner)
  await submitTx(
    hre,
    onft,
    'whitelistMint',
    [
      taskArgs.amount,
      [
        '0x190a19a87545d6d53aef2c2a6fae0104c4e15144ad314f79aede4d31b656e750',
        '0xe05dc14cd651f320052c023a6a6a35be039dce5b31c490ab66a87ecdf846490d',
        '0xa888b25ad33b256065cd9ab0547be1084f2067649d053ff55a3e7629efdc78bf',
        '0xaaadaf4da7b97e8b7049d3f20c426f286c222418ed32c37a32b452db569c1cc5',
        '0xd98c2e0f008e93a2a99a1fefbeaf59036f25729fa92e98b22c95a0be7228caf1',
        '0x59b61a895bc680691a2a09034a815ae8e7e14e3a2ce373714bb753c2ff19e876',
        '0x4073bd2a6073b8e4f9a0583eb58ef0afb70037146dfd9c42b92c2f29ce7b387b',
        '0x4d9bc4a982d66b99408cee6c2953d3d6c51b38126d102ff5f6c095afcda0c389',
        '0x4aea6db44be9e4bb59f729136689b2af5cd13b44e6183fff21b1b035409fdd78',
        '0x2ea177625e98344193a9e49aff46274e4484d787a58768b81f4cfca4c7dde4c2',
        '0x321af9145f7bc69f4f83afd386cec4dcfdd4acc9e205782c2b9f4822c13a349d',
        '0x478d3f12b0c45a7fa2b265631ffd97592e0fef0436b088485c6a2df41c4cc048',
        '0xabf1d5d7d4c440a21fd2af01900403b194267f7ffc64069e34ec4fcc74cf6ed2'
      ]
    ],
    { value: 6000000000000000 }
  )
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

export const expandCollection = async (taskArgs: any, hre: any) => {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  let checkWireUpCommand

  checkWireUpCommand = `npx hardhat deployAllAdvancedONFT721A --e ${taskArgs.e} --collection ${taskArgs.collection} --exclude ${taskArgs.oldchains}`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat prepareAllAdvancedONFT721A --e ${taskArgs.e} --collection ${taskArgs.collection} --lzconfig ${taskArgs.lzconfig} --netexclude ${taskArgs.oldchains} --exclude none `
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat setAllTrustedRemote --e ${taskArgs.e} --contract ${taskArgs.collection} --netexclude ${taskArgs.oldchains} --exclude none`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat prepareAllAdvancedONFT721A --e ${taskArgs.e} --collection ${taskArgs.collection} --lzconfig ${taskArgs.lzconfig} --netexclude ${taskArgs.newchains} --exclude ${taskArgs.oldchains} `
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
  // checkWireUpCommand = `npx hardhat prepareAllAdvancedONFT721A --e ${taskArgs.e} --collection ${taskArgs.collection} --lzconfig false `
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
  checkWireUpCommand = `npx hardhat setAllTrustedRemote --e ${taskArgs.e} --contract ${taskArgs.collection} --exclude none --netexclude none`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat prepareAllAdvancedONFT721A --e ${taskArgs.e} --collection ${taskArgs.collection} --lzconfig true --exclude none --netexclude none`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat setBridgeFees --e ${taskArgs.e} --collection ${taskArgs.collection} --exclude none`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  checkWireUpCommand = `npx hardhat verifyAll --e ${taskArgs.e} --tags ${taskArgs.collection}`
  console.log(checkWireUpCommand)
  shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
  // checkWireUpCommand = `npx hardhat prepareAllAdvancedONFT721A --e ${taskArgs.e} --collection ${taskArgs.collection} --lzconfig false`
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
