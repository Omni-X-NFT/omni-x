import Moralis from "moralis";
import { EvmChain } from '@moralisweb3/common-evm-utils';
import { loadAbi, getContractAddrByName } from '../tasks/shared'
import GregAddresses from '../constants/gregAddresses.json'
import snapshotArgs from '../constants/snapshotArgs.json'
import { Network, Alchemy } from "alchemy-sdk";
import fs from 'fs'



// const getHolders = async (network: string, owners: any) => {
//   const contractAddress = GregAddresses['arbitrum']
  

//   let firstResponse: any = await Moralis.EvmApi.nft.getNFTOwners({
//     address: contractAddress,
//     chain: EvmChain.ARBITRUM,
//     limit: 100
//   })
//   firstResponse = firstResponse.toJSON()

//   let dataCursor = firstResponse.cursor
//   for (const owner of firstResponse.result) {
//     if (owners[owner.owner_of] !== undefined) {
//       owners[owner.owner_of].amount += 1
//     } else {
//       owners[owner.owner_of] = {
//         amount: 1
//       }
//     }
//   }
  

//   do {
//     setTimeout(async () => { console.log('page complete') }, 100)
//         let response: any = await Moralis.EvmApi.nft.getNFTOwners({
//             address: contractAddress,
//             chain: EvmChain.ARBITRUM,
//             disableTotal: false,
//             limit: 100,
//             cursor: dataCursor
//           })
//           response = response.toJSON()
//           for (const owner of response.result) {
//             if (owners[owner.owner_of] !== undefined) {
//               owners[owner.owner_of].amount += 1
//             } else {
//               owners[owner.owner_of] = {
//                 amount: 1
//               }
//             }
//           }
//           dataCursor = response.cursor
    
//   } while (dataCursor !== null && dataCursor !== '')
//     console.log(Object.values(owners).reduce((a: any, b: any) => a + b.amount, 0))
// }

// export const Snapshot = async function (taskargs: any, hre: any) {
//   const { ethers, network } = hre
//   await Moralis.start({
//     apiKey: process.env.MORALIS
//     // ...and any other configuration
//   })
//   const owners: any = []


//     try {
//     (await getHolders(network.name, owners))
//     } catch (e) {
//     console.log(e)
//     }
  
//   console.log(Object.values(owners).reduce((a: any, b: any) => a + b.amount, 0))

//   const snapshotData = []
//   for (const owner in owners) {
//     snapshotData.push({
//       address: owner,
//       count: owners[owner].amount
//     })
//   }
//   console.log(snapshotData)
//   console.log(JSON.stringify(snapshotData))


//   await fs.promises.writeFile('constants/GregArbitrumSnapshot.json', JSON.stringify(snapshotData, null, 2))
//   console.log('✅ Snapshot saved')
// }



export const tokenSnap = async (taskArgs: any, hre: any) => {
  const { ethers, network } = hre
  const owners: any = {}
  const contractAddress = (snapshotArgs as any)[taskArgs.target][network.name]
  if (taskArgs.api === 'moralis') {
    await Moralis.start( {
        apiKey: process.env.MORALIS
        // ...and any other configuration
    })
    try {
        let firstResponse: any = await Moralis.EvmApi.nft.getNFTOwners({
          address: contractAddress,
          chain: EvmChain.POLYGON,
          limit: 100
        })
        firstResponse = firstResponse.toJSON()
    
        let dataCursor = firstResponse.cursor
        for (const owner of firstResponse.result) {
            if (owners[owner.owner_of] !== undefined) {
                owners[owner.owner_of].amount += 1
            } else {
                owners[owner.owner_of] = {
                amount: 1
                }
            }
        }
    do {

        setTimeout(async () => { console.log('page complete') }, 100)
         
         let response: any = await Moralis.EvmApi.nft.getNFTOwners({
             address: contractAddress,
             chain: EvmChain.POLYGON,
             disableTotal: false,
             limit: 100,
             cursor: dataCursor
         })
         response = response.toJSON()
 
         for (const owner of response.result) {
             if (owners[owner.owner_of] !== undefined) {
                 owners[owner.owner_of].amount += 1
             } else {
                 owners[owner.owner_of] = {
                 amount: 1
                 }
             }
         }
         dataCursor = response.cursor
     } while (dataCursor !== null && dataCursor !== '')
  
     const data = await fs.promises.readFile('constants/largeSnapshot2.json', 'utf8')
     const jsonData = JSON.parse(data)
     for (const item in owners) {
     if (jsonData[item] !== undefined) {
        if (jsonData[item].count < 10) {
            jsonData[item].count += 1
        }
     } else {
         jsonData[item] = {
             count: 1
         }
     }
     }
 
     if (Object.keys(jsonData).length > 0) {
         // Convert the array back to JSON format
         await fs.promises.writeFile('constants/largeSnapshot2.json', JSON.stringify(jsonData, null, 2))
     }
         
 
 
     console.log('✅ Snapshot saved')
     console.log(Object.values(owners).reduce((a: any, b: any) => a + b.amount, 0))
   } catch (e) {
     console.log(e)
   }
    } else if (taskArgs.api === 'alchemy') {
        const settings = {
            apiKey: process.env.ALCHEMY_OP, // Replace with your Alchemy API Key.
            network: Network.OPT_MAINNET, // Replace with your network.
          }
          
          const alchemy = new Alchemy(settings)
          try{
            const ownersArray: any = await alchemy.nft.getOwnersForContract(contractAddress)
            const uniqOwners = [...new Set(ownersArray.owners)]
            console.log(uniqOwners.length)
            console.log(uniqOwners)
     
            const data = await fs.promises.readFile('constants/largeSnapshot2.json', 'utf8')
            const jsonData = JSON.parse(data)
            
            for (const item of uniqOwners) {
                if (jsonData[item as string] !== undefined) {
                    if (jsonData[item as string].count < 10) {
                        jsonData[item as string].count += 1
                    }
                } else {
                    jsonData[item as string] = {
                        count: 1
                    }
                }
            }

           
           
        
            if (Object.keys(jsonData).length > 0) {
                // Convert the array back to JSON format
                await fs.promises.writeFile('constants/largeSnapshot2.json', JSON.stringify(jsonData, null, 2))
            }
            console.log('✅ Snapshot saved')
            
          } catch (e) {
            console.log(e)
          }

    }


   

}
export const snap = async (taskArgs: any, hre: any) => {
    const { ethers, network } = hre
    const owners: any = {}
    const contractAddress = (snapshotArgs as any)[taskArgs.target][network.name]
    if (taskArgs.api === 'moralis') {
      await Moralis.start( {
          apiKey: process.env.MORALIS
          // ...and any other configuration
      })
      try {
          let firstResponse: any = await Moralis.EvmApi.nft.getNFTOwners({
            address: contractAddress,
            chain: EvmChain.POLYGON,
            limit: 100
          })
          firstResponse = firstResponse.toJSON()
      
          let dataCursor = firstResponse.cursor
          for (const owner of firstResponse.result) {
              if (owners[owner.owner_of] !== undefined) {
                  owners[owner.owner_of].amount += 1
              } else {
                  owners[owner.owner_of] = {
                  amount: 1
                  }
              }
          }
      do {
  
          setTimeout(async () => { console.log('page complete') }, 100)
           
           let response: any = await Moralis.EvmApi.nft.getNFTOwners({
               address: contractAddress,
               chain: EvmChain.POLYGON,
               disableTotal: false,
               limit: 100,
               cursor: dataCursor
           })
           response = response.toJSON()
   
           for (const owner of response.result) {
               if (owners[owner.owner_of] !== undefined) {
                   owners[owner.owner_of].amount += 1
               } else {
                   owners[owner.owner_of] = {
                   amount: 1
                   }
               }
           }
           dataCursor = response.cursor
       } while (dataCursor !== null && dataCursor !== '')
    
       const data = await fs.promises.readFile('constants/largeSnapshot2.json', 'utf8')
       const jsonData = JSON.parse(data)
       for (const item in owners) {
       if (jsonData[item] !== undefined) {
          if (jsonData[item].count < 10) {
              jsonData[item].count += 1
          }
       } else {
           jsonData[item] = {
               count: 1
           }
       }
       }
   
       if (Object.keys(jsonData).length > 0) {
           // Convert the array back to JSON format
           await fs.promises.writeFile('constants/largeSnapshot2.json', JSON.stringify(jsonData, null, 2))
       }
           
   
   
       console.log('✅ Snapshot saved')
       console.log(Object.values(owners).reduce((a: any, b: any) => a + b.amount, 0))
     } catch (e) {
       console.log(e)
     }
      } else if (taskArgs.api === 'alchemy') {
          const settings = {
              apiKey: process.env.ALCHEMY_OP, // Replace with your Alchemy API Key.
              network: Network.OPT_MAINNET, // Replace with your network.
            }
            
            const alchemy = new Alchemy(settings)
            try{
              const ownersArray: any = await alchemy.nft.getOwnersForContract(contractAddress)
              const uniqOwners = [...new Set(ownersArray.owners)]
              console.log(uniqOwners.length)
              console.log(uniqOwners)
       
              const data = await fs.promises.readFile('constants/largeSnapshot2.json', 'utf8')
              const jsonData = JSON.parse(data)
              
              for (const item of uniqOwners) {
                  if (jsonData[item as string] !== undefined) {
                      if (jsonData[item as string].count < 10) {
                          jsonData[item as string].count += 1
                      }
                  } else {
                      jsonData[item as string] = {
                          count: 1
                      }
                  }
              }
  
             
             
          
              if (Object.keys(jsonData).length > 0) {
                  // Convert the array back to JSON format
                  await fs.promises.writeFile('constants/largeSnapshot2.json', JSON.stringify(jsonData, null, 2))
              }
              console.log('✅ Snapshot saved')
              
            } catch (e) {
              console.log(e)
            }
  
      }
  
  
     
  
  }

export const convertFormat = async (taskArgs: any, hre: any) => {
    const data = await fs.promises.readFile("constants/largeSnapshot2.json", "utf8")
    const jsonData = JSON.parse(data)

    const newData:any = []

    for (const item in jsonData) {
        newData.push({
            address: item,
            count: jsonData[item].count
        })
    }


    await fs.promises.writeFile("constants/largeElementsSnapshot.json", JSON.stringify(newData, null, 2))
}

export const addSTG = async(taskArgs: any, hre: any) => {
    const oldData = await fs.promises.readFile("constants/largeElementsSnapshot.json", "utf8")
    const jsonOldData = JSON.parse(oldData)
    const newData = await fs.promises.readFile("constants/finalAddresses.json", "utf8")
    const jsonNewData = JSON.parse(newData)
   const finalData = []




   const convertedData: any = {}
   for (const item of jsonOldData) {
       convertedData[item.address] = {count: item.count}
   }
  
    for (const i of jsonNewData){
            if (convertedData[i.Address] !== undefined) {
                if (convertedData[i.Address].count < 10) {

                    convertedData[i.Address].count += 1
                    }
            } else {
                convertedData[i.Address] = {
                count: 1
            }
        }
    }

    


   for (const item in convertedData) {
       finalData.push({
           address: item,
           count: convertedData[item].count
       })
   }

   await fs.promises.writeFile("constants/largeElementsSnapshot.json", JSON.stringify(finalData, null, 2))
 
}
