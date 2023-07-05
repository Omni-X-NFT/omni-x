import shell from 'shelljs'
import LZ_ENDPOINT from '../constants/layerzeroEndpoints.json'
import ONFT_ARGS from '../constants/ONFT721AArgs.json'
import * as CHAIN_ID from '../constants/chainIds.json'
import { loadAbi, createContractByName, deployContract } from './shared'

const environments: any = {
    mainnet: ['arbitrum', 'optimism'],
    testnet: ['fuji', 'fantom-testnet']
}

type CHAINIDTYPE = {
    [key: string]: number
}

const tx = async (tx1: any) => {
    await tx1.wait()
}
const CHAIN_IDS: CHAINIDTYPE = CHAIN_ID

const AdvancedONFT721AAbi = loadAbi('../artifacts/contracts/token/onft721A/extension/collections/OmnichainAdventures.sol/OmnichainAdventures.json')

export const deployAdvancedONFT721A = async (taskArgs: any, hre: any) => {
    const { ethers, network } = hre
    const [owner] = await ethers.getSigners()
    const args = (ONFT_ARGS as any)[taskArgs.collection][network.name]
    const lzEndpoint = (LZ_ENDPOINT as any)[network.name]
    await deployContract(hre, 'OmnichainAdventures', owner, [
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
        args.taxRecipient
    ])
}

export const deployAllAdvancedONFT721A = async (taskArgs: any) => {
    const networks = environments[taskArgs.e]
    if (!taskArgs.e || networks.length === 0) {
        console.log(`Invalid environment argument: ${taskArgs.e}`)
    }
    await Promise.all(
        networks.map(async (network: string) => {
            const checkWireUpCommand = `npx hardhat deployAdvancedONFT721A --network ${network} --collection ${taskArgs.collection}`
            console.log(checkWireUpCommand)
            shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
        })
    )
}

export const prepareAdvancedONFT721A = async (taskArgs: any, hre: any) => {
    const { ethers, network } = hre
    const [owner] = await ethers.getSigners()

    const args = (ONFT_ARGS as any)[taskArgs.collection][network.name]


    const dstChainId = CHAIN_IDS[taskArgs.target]


    const onft721A = createContractByName(hre, 'OmnichainAdventures', AdvancedONFT721AAbi().abi, owner)

    if (taskArgs.lzconfig === 'true') {
        try {
           
              await tx(await onft721A.setDstChainIdToBatchLimit(dstChainId, args.batchLimit))
              await tx(await onft721A.setDstChainIdToTransferGas(dstChainId, args.transferGas))
              await tx(await onft721A.setMinDstGas(dstChainId, 1, args.minDstGas))
           
         
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
        if (args.startId !== args.endId) {
          try {
              const nftState = {
                  saleStarted: taskArgs.startmint === 'true',
                  revealed: taskArgs.reveal === 'true',
                  startTime: timestamp,
                  mintLength: 1209600 // 2 weeks
              }
              await tx(await onft721A.setNftState(nftState))
              console.log(`✅ set nft state`)
          } catch (e: any) {
              console.log(e)
          }
        }
    }



   
}

export const prepareAllAdvancedONFT721A = async (taskArgs: any) => {
    const networks = environments[taskArgs.e]
    if (!taskArgs.e || networks.length === 0) {
      console.log(`Invalid environment argument: ${taskArgs.e}`)
    }

    await Promise.all(
      networks.map(async (network: string) => {
        networks.map(async (target: string) => {
          if (network !== target && network !== 'ethereum') {
            const checkWireUpCommand = `npx hardhat --network ${network} prepareAdvancedONFT721A --target ${target} --collection ${taskArgs.collection} --lzconfig ${taskArgs.lzconfig} --startmint ${taskArgs.startmint} --reveal ${taskArgs.reveal}`
            console.log(checkWireUpCommand)
            shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
          }
        })
      })
    )
}

export const sendCross = async (taskArgs: any, hre: any) => {
    const { ethers, network } = hre
    const [owner] = await ethers.getSigners()
    const dstChainId = CHAIN_IDS[taskArgs.target]
    const onft = createContractByName(hre, 'OmnichainAdventures', AdvancedONFT721AAbi().abi, owner)
    const adapterParams = ethers.utils.solidityPack(['uint16', 'uint256'], [1, 400000])
    const gas = await onft.estimateSendFee(dstChainId, owner.address, taskArgs.tokenid, false, adapterParams)
    await tx(await onft.sendFrom(owner.address, dstChainId, owner.address, taskArgs.tokenid, owner.address, ethers.constants.AddressZero, adapterParams, { value: gas[0].toString() }))
}


export const mint = async (taskArgs: any, hre: any) => {
    const { ethers, network } = hre
    const [owner] = await ethers.getSigners()
    const onft = createContractByName(hre, 'OmnichainAdventures', AdvancedONFT721AAbi().abi, owner)
    await tx(await onft.mint(taskArgs.amount, { value: taskArgs.amount }))
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

export const deployCollection = async (taskArgs: any, hre: any) => {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }
  
    let checkWireUpCommand = `npx hardhat deployAllAdvancedONFT721A --e ${taskArgs.e} --collection ${taskArgs.collection}`
    console.log(checkWireUpCommand)
    shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    checkWireUpCommand = `npx hardhat prepareAllAdvancedONFT721A --e ${taskArgs.e} --collection ${taskArgs.collection} --lzconfig ${taskArgs.lzconfig} --startmint false --reveal false`
    console.log(checkWireUpCommand)
    shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    checkWireUpCommand = `npx hardhat setAllTrustedRemote --e ${taskArgs.e} --contract OmnichainAdventures`
    console.log(checkWireUpCommand)
    shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    checkWireUpCommand = `npx hardhat verifyAll --e ${taskArgs.e} --tags OmnichainAdventures`
    console.log(checkWireUpCommand)
    shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
    checkWireUpCommand = `npx hardhat prepareAllAdvancedONFT721A --e ${taskArgs.e} --collection ${taskArgs.collection} --lzconfig false --startmint ${taskArgs.startmint} --reveal ${taskArgs.reveal}`
    console.log(checkWireUpCommand)
    shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')

  
}

