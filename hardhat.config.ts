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
import 'xdeployer'
import '@nomicfoundation/hardhat-foundry'
import '@matterlabs/hardhat-zksync-deploy'
import '@matterlabs/hardhat-zksync-solc'

import * as dotenv from 'dotenv'
dotenv.config()

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',

  solidity: {
    version: '0.8.17',
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 5
      }
    }
  },
  zksolc: {
    version: 'latest',
    settings: {}

  },

  namedAccounts: {
    deployer: {
      default: `privatekey://${process.env.PRIVATE_KEY}`
    }
  },

  networks: {
    hardhat: {
      forking: {
        url: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
      },
      zksync: false
    },
    ethereum: {
      url: process.env.ETH_RPC !== undefined ? process.env.ETH_RPC : 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // public infura endpoint
      chainId: 1,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    avalanche: {
      url: process.env.AVALACNHE_RPC !== undefined ? process.env.AVALANCHE_RPC : 'https://api.avax.network/ext/bc/C/rpc',
      chainId: 43114,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    bsc: {
      url: process.env.BSC_RPC !== undefined ? process.env.BSC_RPC : 'https://rpc.ankr.com/bsc',
      chainId: 56,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    polygon: {
      url: process.env.POLYGON_RPC !== undefined ? process.env.POLYGON_RPC : 'https://polygon.llamarpc.com',
      chainId: 137,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    fantom: {
      url: process.env.FANTOM_RPC !== undefined ? process.env.FANTOM_RPC : 'https://rpc.fantom.network',
      chainId: 250,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    moonbeam: {
      url: process.env.MOONBEAM_RPC !== undefined ? process.env.MOONBEAM_RPC : 'https://rpc.api.moonbeam.network',
      chainId: 1284,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    arbitrum: {
      url: process.env.ARB_RPC !== undefined ? process.env.ARB_RPC : 'https://rpc.ankr.com/arbitrum',
      chainId: 42161,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    optimism: {
      url: process.env.OP_RPC !== undefined ? process.env.OP_RPC : 'https://mainnet.optimism.io',
      chainId: 10,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    metis: {
      url: process.env.METIS_RPC !== undefined ? process.env.METIS_RPC : 'https://andromeda.metis.io/?owner=1088',
      chainId: 1088,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    zksync: {
      url: process.env.ZK_RPC !== undefined ? process.env.ZK_RPC : 'https://mainnet.era.zksync.io',
      chainId: 324,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: true,
      ethNetwork: 'ethereum'
    },
    gnosis: {
      url: process.env.GNOSIS_RPC !== undefined ? process.env.GNOSIS_RPC : 'https://rpc.ankr.com/gnosis',
      chainId: 100,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    klaytn: {
      url: process.env.KLAYTN_RPC !== undefined ? process.env.KLAYTN_RPC : 'https://public-node-api.klaytnapi.com/v1/cypress',
      chainId: 8217,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    'arbitrum-nova': {
      url: process.env.ARB_NOVA_RPC !== undefined ? process.env.ARB_NOVA_RPC : 'https://arbitrum-nova.publicnode.com',
      chainId: 42170,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    'polygon-zkevm': {
      url: process.env.POLYGON_ZKEVM_RPC !== undefined ? process.env.POLYGON_ZKEVM_RPC : 'https://zkevm-rpc.com',
      chainId: 1101,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    canto: {
      url: process.env.CANTO_RPC !== undefined ? process.env.CANTO_RPC : 'https://mainnode.plexnode.org:8545',
      chainId: 7700,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    kava: {
      url: process.env.KAVA_RPC !== undefined ? process.env.KAVA_RPC : 'https://evm.kava.io',
      chainId: 2222,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    base: {
      url: process.env.BASE_RPC !== undefined ? process.env.BASE_RPC : 'https://developer-access-mainnet.base.org',
      chainId: 8453,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    mantle: {
      url: process.env.MANTLE_RPC !== undefined ? process.env.MANTLE_RPC : 'https://rpc.mantle.xyz',
      chainId: 5000,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    tenet: {
      url: process.env.TENET_RPC !== undefined ? process.env.TENET_RPC : 'https://rpc.tenet.org',
      chainId: 1559,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    rinkeby: {
      url: 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // public infura endpoint
      chainId: 4,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    goerli: {
      url: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // public infura endpoint
      chainId: 5,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    'zksync-testnet': {
      url: 'https://testnet.era.zksync.dev',
      chainId: 280,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: true,
      ethNetwork: 'goerli'
    },
    'bsc-testnet': {
      url: process.env.BSC_TESTNET_RPC !== undefined ? process.env.BSC_TESTNET_RPC : 'https://data-seed-prebsc-2-s2.binance.org:8545',
      chainId: 97,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    fuji: {
      url: 'https://api.avax-test.network/ext/bc/C/rpc',
      chainId: 43113,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    mumbai: {
      url: process.env.MUMBAI_RPC !== undefined ? process.env.MUMBAI_RPC : 'https://rpc.ankr.com/polygon_mumbai',
      chainId: 80001,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    'arbitrum-rinkeby': {
      url: 'https://rinkeby.arbitrum.io/rpc',
      chainId: 421611,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    'arbitrum-goerli': {
      url: 'https://goerli-rollup.arbitrum.io/rpc/',
      chainId: 421613,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    'optimism-kovan': {
      url: 'https://kovan.optimism.io/',
      chainId: 69,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    'optimism-goerli': {
      url: 'https://goerli.optimism.io/',
      chainId: 420,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    'fantom-testnet': {
      url: 'https://rpc.ankr.com/fantom_testnet',
      chainId: 4002,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    },
    moonbeam_testnet: {
      url: 'https://rpc.testnet.moonbeam.network',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      zksync: false
    }
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD'
  },

  // https://hardhat.org/plugins/nomiclabs-hardhat-etherscan#multiple-api-keys-and-alternative-block-explorers
  etherscan: {
    apiKey: {
      goerli: process.env.ETHERSCAN_API_KEY || '',
      bscTestnet: process.env.BSCSCAN_API_KEY || '',
      polygonMumbai: process.env.POLYGON_API_KEY || '',
      avalancheFujiTestnet: process.env.AVALANCHE_API_KEY || '',
      mainnet: process.env.ETHERSCAN_API_KEY || '',
      bsc: process.env.BSCSCAN_API_KEY || '',
      polygon: process.env.POLYGON_API_KEY || '',
      avalanche: process.env.AVALANCHE_API_KEY || '',
      optimisticEthereum: process.env.OPTIMISTIC_API_KEY || '',
      arbitrumOne: process.env.ARBITRUM_API_KEY || '',
      arbtirumNova: process.env.ARBITRUM_NOVA_API_KEY || '',
      metis: process.env.METIS_API_KEY || '',
      fantom: process.env.FANTOM_API_KEY || '',
      base: process.env.BASE_API_KEY || '',
      // arbitrumTestnet: process.env.ARBITRUM_API_KEY || '',
      // optimisticKovan: process.env.OPTIMISTIC_API_KEY || '',
      ftmTestnet: process.env.FANTOM_API_KEY || '',
      'arbitrum-goerli': process.env.ARBITRUM_API_KEY || '',
      'optimism-goerli': process.env.OPTIMISTIC_API_KEY || '',
      moonbeam: process.env.MOONBEAM_API_KEY || ''

    },
    customChains: [
      {
        network: 'arbitrum-goerli',
        chainId: 421613,
        urls: {
          apiURL: 'https://api-goerli.arbiscan.io/api',
          browserURL: 'https://testnet.arbiscan.io/'
        }
      },
      {
        network: 'moonbeam_testnet',
        chainId: 1287,
        urls: {
          apiURL: 'https://api-moonbase.moonscan.io/api',
          browserURL: 'https://moonbase.moonscan.io'
        }
      },
      {
        network: 'optimism-goerli',
        chainId: 420,
        urls: {
          apiURL: 'https://api-goerli-optimism.etherscan.io/api',
          browserURL: 'https://goerli-optimism.etherscan.io'
        }
      },
      {
        network: 'arbitrumNova',
        chainId: 42170,
        urls: {
          browserURL: 'https://nova.arbiscan.io/',
          apiURL: 'https://api-nova.arbiscan.io/api'
        }
      }
     
    ]
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
