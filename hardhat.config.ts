import { HardhatUserConfig } from 'hardhat/config'
import '@typechain/hardhat'
import 'hardhat-contract-sizer'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-waffle'
import 'hardhat-gas-reporter'
import 'hardhat-deploy'
import 'hardhat-deploy-ethers'
import 'solidity-coverage'
import './tasks'

import * as dotenv from 'dotenv'
dotenv.config()

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const accounts = [
  process.env.PRIVATE_KEY || '',
  process.env.PRIVATE_KEY1 || '',
  process.env.PRIVATE_KEY2 || ''
]

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',

  solidity: {
    version: '0.8.4',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },

  namedAccounts: {
    deployer: {
      default: 0 // wallet address 0, of the mnemonic in .env
    }
  },

  networks: {
    hardhat: {
      forking: {
        url: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
      }
    },
    ethereum: {
      url: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // public infura endpoint
      chainId: 1,
      accounts
    },
    avalanche: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      chainId: 43114,
      accounts
    },
    rinkeby: {
      url: 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // public infura endpoint
      chainId: 4,
      accounts
    },
    'bsc-testnet': {
      url: 'https://data-seed-prebsc-2-s1.binance.org:8545/',
      chainId: 97,
      accounts
    },
    fuji: {
      url: 'https://api.avax-test.network/ext/bc/C/rpc',
      chainId: 43113,
      accounts
    },
    mumbai: {
      url: 'https://polygon-mumbai.g.alchemy.com/v2/PBnAhVXSPI5sRtN4YRc4Xadl6bFpkyFv',
      chainId: 80001,
      accounts
    },
    'arbitrum-rinkeby': {
      url: 'https://rinkeby.arbitrum.io/rpc',
      chainId: 421611,
      accounts
    },
    'optimism-kovan': {
      url: 'https://kovan.optimism.io/',
      chainId: 69,
      accounts
    },
    'fantom-testnet': {
      url: 'https://rpc.testnet.fantom.network/',
      chainId: 4002,
      accounts
    },
    goerli: {
      url: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // public infura endpoint
      chainId: 5,
      accounts
    },
    'arbitrum-goerli': {
      url: 'https://goerli-rollup.arbitrum.io/rpc/',
      chainId: 421613,
      accounts
    },
    'optimism-goerli': {
      url: 'https://goerli.optimism.io/',
      chainId: 420,
      accounts
    },
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD'
  },

  // https://hardhat.org/plugins/nomiclabs-hardhat-etherscan#multiple-api-keys-and-alternative-block-explorers
  etherscan: {
    apiKey: {
      rinkeby: process.env.ETHERSCAN_API_KEY,
      bscTestnet: process.env.BSCSCAN_API_KEY,
      polygonMumbai: process.env.POLYGON_API_KEY,
      avalancheFujiTestnet: process.env.AVALANCHE_API_KEY
      // arbitrumTestnet: process.env.ARBITRUM_API_KEY,
      // optimisticKovan: process.env.OPTIMISTIC_API_KEY,
      // ftmTestnet: process.env.FANTOM_API_KEY
    }
  },

  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: false,
    strict: true
  }
}

export default config
/// yarn deploy --network rinkeby && yarn deploy --network bsc-testnet && yarn deploy --network fuji && yarn deploy --network mumbai && yarn deploy --network arbitrum-rinkeby && yarn deploy --network fantom-testnet && yarn deploy --network optimism-kovan
/// yarn verify --network rinkeby && yarn verify --network bsc-testnet && yarn verify --network fuji && yarn verify --network mumbai && yarn verify --network arbitrum-rinkeby && yarn verify --network fantom-testnet && yarn verify --network optimism-kovan
