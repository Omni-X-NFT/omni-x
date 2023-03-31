import shell from 'shelljs'

const environments: any = {
  mainnet: ['bsc', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'fantom', 'moonbeam', 'metis'],
  testnet: ['goerli', 'bsc-testnet', 'fuji', 'arbitrum-goerli', 'optimism-goerli', 'fantom-testnet', 'moonbeam_testnet', 'mumbai']
}

export const setAll721Config = async function (taskArgs: any, hre: any) {
    const networks = environments[taskArgs.e]
    if (!taskArgs.e || networks.length === 0) {
      console.log(`Invalid environment argument: ${taskArgs.e}`)
    }
  
    await Promise.all(
      networks.map(async (network: string) => {
        networks.map(async (target: string) => {
          if (network !== target && network !== 'ethereum') {
            const checkWireUpCommand = `npx hardhat --network ${network} set721Config --target ${target}`
            shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
          }
        })
      })
    )
  }