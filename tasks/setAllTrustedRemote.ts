import shell from 'shelljs'

import { environments } from './shared'

export const setAllTrustedRemote = async function (taskArgs: any, hre: any) {
  const networks = environments[taskArgs.e]
  if (!taskArgs.e || networks.length === 0) {
    console.log(`Invalid environment argument: ${taskArgs.e}`)
  }

  await Promise.all(
    networks.map(async (network: string) => {
      networks.map(async (target: string) => {
        if ((network !== target && network === 'polygon')) {
          const checkWireUpCommand = `npx hardhat --network ${network} setTrustedRemote --target ${target} --contract ${taskArgs.contract}`
          shell.exec(checkWireUpCommand).stdout.replace(/(\r\n|\n|\r|\s)/gm, '')
        }
      })
    })
  )
}
