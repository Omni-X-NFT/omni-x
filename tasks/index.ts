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
import { MerkleGen } from './merkle'
import { mintGasless721 } from './mintGasless'
import { sendBatch721 } from './sendBatch721'
import { set721Config } from './set721Config'
import { setAll721Config } from './setAll721Config'
import { snap, convertFormat, addSTG, changeAmounts } from './takeSnapshot'
import { analyzeStuckTx } from './analyzeStuckTx'
import { deployAdvancedONFT721A, estimateSendFee, deployAllAdvancedONFT721A, prepareAllAdvancedONFT721A, prepareAdvancedONFT721A, mint, mintAll, sendCross, deployCollection } from './AdvancedONFTASuite'

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

task('merkle', 'generate merkle tree')
  .addParam('adr', 'minter address')
  .addParam('amt', 'amount of wl token')
  .setAction(MerkleGen)
task('mintGasless721', 'mintGasless721')
  .addParam('adr', 'address to mint to')
  .addParam('amt', 'amount of tokens')
  .addParam('gregs', 'amount of gregs for address')
  .setAction(mintGasless721)

task('sendBatch721', 'sendBatch721')
  .setAction(sendBatch721)

task('set721Config', 'set layer zero config for ONFT721')
  .addParam('target', 'target dst network')
  .setAction(set721Config)

task('setAll721Config', 'sets layer zero config on all chain for ONF721')
  .addParam('e', 'testnet or mainnet')
  .setAction(setAll721Config)

task('snap', 'take snapshot')
  .addParam('api', 'nft api provider')
  .addParam('target', 'target colleection')
  .setAction(snap)
task('convertFormat', 'convertFormat')
  .setAction(convertFormat)
task('addSTG', 'add stargate')
  .setAction(addSTG)
task('analyzeStuckTx', 'analyze stuck transaction lz')
  .addParam('adr', 'address of contract')
  .addParam('topic', 'event topic')
  .setAction(analyzeStuckTx)
task('changeAmounts', 'change amount of wl')
  .setAction(changeAmounts)
task('deployAdvancedONFT721A', 'deployAdvancedONFT721A')
  .addParam('collection', 'collection name')
  .setAction(deployAdvancedONFT721A)
task('deployAllAdvancedONFT721A', 'deployAllAdvancedONFT721A')
  .addParam('collection', 'collection name')
  .addParam('e', 'testnet or mainnet')
  .setAction(deployAllAdvancedONFT721A)
task('prepareAdvancedONFT721A', 'prepareAdvancedONFT721A')
  .addParam('collection', 'collection name')
  .addParam('target', 'target dst network')
  .addParam('lzconfig', 'true or false for lz config')
  .addParam('startmint', 'true or false for sale started')
  .addParam('reveal', 'true or false for revealed metadata')
  .addParam('seturi', 'true or false to set metadata')
  .setAction(prepareAdvancedONFT721A)
task('prepareAllAdvancedONFT721A', 'prepareAllAdvancedONFT721A')
  .addParam('lzconfig', 'true or false for lz config')
  .addParam('startmint', 'true or false for sale started')
  .addParam('reveal', 'true or false for revealed metadata')
  .addParam('collection', 'collection name')
  .addParam('seturi', 'true or false to set metadata')
  .addParam('e', 'testnet or mainnet')
  .setAction(prepareAllAdvancedONFT721A)
task('mint721A', 'mint721A')
  .addParam('amount', 'amount of tokens')
  .setAction(mint)
task('mintAll721A', 'mintAll721A')
  .addParam('e', 'testnet or mainnet')
  .addParam('amount', 'amount of tokens')
  .setAction(mintAll)
task('sendCross', 'sendCross')
  .addParam('tokenid', 'tokenid')
  .addParam('target', 'target dst network')
  .setAction(sendCross)
task('deployCollection', 'deployCollection')
  .addParam('collection', 'collection name')
  .addParam('e', 'testnet or mainnet')
  .addParam('lzconfig', 'true or false for lz config')
  .addParam('startmint', 'true or false for sale started')
  .addParam('reveal', 'true or false for revealed metadata')
  .setAction(deployCollection)
task('estimateSendFee', 'estimateSendFee')
  .setAction(estimateSendFee)
