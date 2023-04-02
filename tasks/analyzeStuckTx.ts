import { loadAbi } from './shared'
import Moralis from "moralis"
import { EvmChain } from "@moralisweb3/common-evm-utils"

const AdvancedONFT721GaslessAbi = loadAbi('../artifacts/contracts/token/onft/extension/AdvancedONFT721Gasless.sol/AdvancedONFT721Gasless.json')


export const analyzeStuckTx = async (taskArgs: any, hre: any) => {

    const { ethers, network } = hre



  await Moralis.start({
    apiKey: process.env.MORALIS
    // ...and any other configuration
  })

  const chain = EvmChain.POLYGON
  const address = taskArgs.adr
  const topic = taskArgs.topic
  const abi =    {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "_hashedPayload",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "_payload",
        "type": "bytes"
      }
    ],
    "name": "CreditStored",
    "type": "event"
  }

  const response: any = await Moralis.EvmApi.events.getContractLogs({
    address,
    chain
  })
 

  

 
  for (const elem of response.result) {
        if(elem.topics[0] === taskArgs.topic) {
            const data = ethers.utils.defaultAbiCoder.decode(
                ['bytes32', 'bytes'],
                elem.data
              )
            console.log(data)
        }
  }



  
  

  

}

