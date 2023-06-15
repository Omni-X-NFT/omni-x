import { task } from 'hardhat/config'
import { setTrustedRemote } from './setTrustedRemote'
import { deployGhosts, deployOmniX, deployOmnixAll } from './deployOmniX'
import { linkOmniX, linkOmnixAll, prepareOmniX, prepareOmnixAll, prepareStargate, setupBridge } from './prepareOmniX'
import { verifyOmni, verifyAll } from './verify'
import { setAllTrustedRemote } from './setAllTrustedRemote'
import { checkNonce } from './checkNonce'
import { deployAll } from './deploy'
import { migrate } from './migrate'
import { deployAdvancedONFT721, deployAllAdvancedONFT721 } from './deployAdvancedONFT721'
import { prepareAdvancedONFT, prepareAllAdvancedONFT } from './prepareAdvancedONFT'
import { deployAdvancedONFT721Gasless, deployAllAdvancedONFT721Gasless } from './deployAdvancedONFT721Gasless'
import { prepareAdvancedONFTGasless, prepareAllAdvancedONFTGasless } from './prepareAdvancedONFTGasless'
import { deployReservoirRouter } from './deployReservoirRouter'
import { executeBatchOrder } from './executeBatchOrder'
import { addSingleChainCurrency, addCurrency } from './addCurrencies'
import { deployAllNFTMock, deployNFTMock } from './deployNFTMock'
import { testSgReceive } from './testSgReceive'
import { lzScan } from './lzScan' 

task(
  'setTrustedRemote',
  'setTrustedRemote(chainId, sourceAddr) to enable inbound/outbound messages with your other contracts',
  setTrustedRemote
).addParam('target', 'the target network name, ie: fuji, or mumbai, etc (from hardhat.config.js)')
  .addParam('contract', 'Contract Name')

task('deployOmniX', 'deploys an OmniX exchange')
  .setAction(deployOmniX)
task('deployGhosts', 'deploys an OmniX exchange')
  .setAction(deployGhosts)
task('prepareOmniX', 'deploys an OmniX exchange')
  .setAction(prepareOmniX)
task('linkOmniX', 'deploys an OmniX exchange')
  .addParam('dstchainname', 'destination chain name. ex: rinkeby')
  .setAction(linkOmniX)
task('deployAllX', 'deploys an OmniX exchange')
  .addParam('e', 'testnet or mainnet')
  .setAction(deployOmnixAll)
task('prepareAllX', 'deploys an OmniX exchange')
  .addParam('e', 'testnet or mainnet')
  .setAction(prepareOmnixAll)
task('linkAllX', 'deploys an OmniX exchange')
  .addParam('e', 'testnet or mainnet')
  .setAction(linkOmnixAll)

task('verifyOmniX', 'verify an omni')
  .setAction(verifyOmni)

task(
  'setAllTrustedRemote',
  'setAllTrustedRemote',
  setAllTrustedRemote
).addParam('e', 'testnet or mainnet')
  .addParam('contract', 'Contract Name')

task(
  'deployAll',
  'deploy all contracts',
  deployAll
).addParam('e', 'testnet or mainnet')
  .addParam('tags', 'Contract file name')
  .addOptionalParam('reset', 'Deploy from scratch')

task(
  'verifyAll',
  'verify all contracts',
  verifyAll
).addParam('e', 'testnet or mainnet')
  .addParam('tags', 'Contract file name')

task(
  'checkNonce',
  'check the transaction count of the wallet'
).setAction(checkNonce)

task(
  'prepareStargate',
  'set bridge and factory and create a pool'
).setAction(prepareStargate)

task('setupBridge', 'setup chain and add liquidity to the pool')
  .addParam('dstchainname', 'destination chain name. ex: rinkeby')
  .setAction(setupBridge)

task(
  'migrate',
  'update or check configuration of omnixexchange contracts'
).setAction(migrate)

task('deployAdvancedONFT721', 'deployAdvancedONFT721')
  .setAction(deployAdvancedONFT721)

task('deployAllAdvancedONFT721', 'deployAllAdvancedONFT721')
  .addParam('e', 'testnet or mainnet')
  .setAction(deployAllAdvancedONFT721)

task('prepareAdvancedONFT', 'prepareAdvancedONFT')
  .addParam('start', 'starting mint Id')
  .addParam('end', 'ending mint Id')
  .setAction(prepareAdvancedONFT)

task('prepareAllAdvancedONFT', 'prepareAllAdvancedONFT')
  .addParam('e', 'testnet or mainnet')
  .setAction(prepareAllAdvancedONFT)

task('deployAdvancedONFT721Gasless', 'deployAdvancedONFT721Gasless')
  .setAction(deployAdvancedONFT721Gasless)

task('deployAllAdvancedONFT721Gasless', 'deployAllAdvancedONFT721Gasless')
  .addParam('e', 'testnet or mainnet')
  .setAction(deployAllAdvancedONFT721Gasless)

task('prepareAdvancedONFTGasless', 'prepareAdvancedONFTGasless')
  .setAction(prepareAdvancedONFTGasless)

task('prepareAllAdvancedONFTGasless', 'prepareAllAdvancedONFTGasless')
  .addParam('e', 'testnet or mainnet')
  .setAction(prepareAllAdvancedONFTGasless)

task('deployReservoirRouter', 'deployReservoirRouter')
  .setAction(deployReservoirRouter)

task('executeBatchOrder', 'executeBatchOrder')
  .setAction(executeBatchOrder)

task('addSingleChainCurrency', 'addSingleChainCurrency')
  .addParam('token', 'token name')
  .setAction(addSingleChainCurrency)
task('addCurrency', 'addCurrency')
  .addParam('e', 'testnet or mainnet')
  .addParam('token', 'token name')
  .setAction(addCurrency)
task('deployNFTMock', 'deployNFTMock')
  .addParam('amount', 'amount of nfts to mint')
  .setAction(deployNFTMock)
task('deployAllNFTMock', 'deployAllNFTMock')
  .addParam('e', 'testnet or mainnet')
  .addParam('amount', 'amount of nfts to mint')
  .setAction(deployAllNFTMock)
task('testSgReceive', 'testSgReceive')
  .setAction(testSgReceive)
task('lzScan', 'lzScan')
  .addParam('hash', 'source tx hash')
  .setAction(lzScan)