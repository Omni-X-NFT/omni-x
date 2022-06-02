import * as dotenv from 'dotenv'

import { HardhatUserConfig } from 'hardhat/config'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import 'hardhat-gas-reporter'
import 'solidity-coverage'
import './tasks/deploy'
import './tasks/deployGreg'
import './tasks/verify'
import './tasks/test'

dotenv.config()

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const accounts = [
  process.env.PRIVATE_KEY || '',
  process.env.PRIVATE_KEY2 || '',
  process.env.PRIVATE_KEY3 || ''
]

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.4',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    ropsten: {
      url: process.env.ROPSTEN_URL || '',
      accounts
    },
    rinkeby: {
      url: process.env.RINKEBY_URL || '',
      accounts
    },
    mumbai: {
      url: process.env.MUMBAI_URL || '',
      accounts
    },
    bsctest: {
      url: process.env.BSCTEST_URL || '',
      accounts
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD'
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
}

export default config
