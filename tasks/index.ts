import { task } from 'hardhat/config'
import { deployOmniX, deployOmnixAll, addSingleChainCurrency, addCurrency, removeAllUSDC, removeCurrency, omnix, setupBridge, prepareStargate } from './OmniXSuite'
import { verifyOmni, verifyAll } from './verify'
import { deployAll } from './deploy'
import { deployAdvancedONFT721, prepareAdvancedONFT, set721Config, set721GaslessConfig, setAll721Config, setAll721GaslessConfig, prepareAllAdvancedONFT, prepareAdvancedONFTGasless, prepareAllAdvancedONFTGasless, deployAllAdvancedONFT721, deployAdvancedONFT721Gasless, deployAllAdvancedONFT721Gasless } from './AdvancedONFTSuite'
import { deployAdvancedONFT721A, expandCollection, estimateSendFee, setAllMetadata, setMetadata, deployAllAdvancedONFT721A, prepareAllAdvancedONFT721A, prepareAdvancedONFT721A, mint, mintAll, sendCross, deployCollection, setBridgeFees, trustedRemoteLookup } from './AdvancedONFTASuite'
import { lzScan, forceResume, hasStoredPayload, setTrustedRemote, setAllTrustedRemote } from './lzSuite'

task(
  'setTrustedRemote',
  'setTrustedRemote(chainId, sourceAddr) to enable inbound/outbound messages with your other contracts',
  setTrustedRemote
).addParam('target', 'the target network name, ie: fuji, or mumbai, etc (from hardhat.config.js)')
  .addParam('contract', 'Contract Name')

task('addSingleChainCurrency', 'addSingleChainCurrency')
  .addParam('token', 'token name')
  .setAction(addSingleChainCurrency)

task('addCurrency', 'addCurrency')
  .addParam('e', 'testnet or mainnet')
  .addParam('token', 'token name')
  .setAction(addCurrency)

task('removeCurrency', 'removeCurrency')
  .addParam('token', 'token name')
  .setAction(removeCurrency)

task('removeAllUSDC', 'removeAllUSDC')
  .addParam('e', 'testnet or mainnet')
  .setAction(removeAllUSDC)

task('omnix', 'omnix')
  .addParam('e', 'testnet or mainnet')
  .addParam('dependencies', 'true or false to redeploy dependent contracts')
  .setAction(omnix)

task('deployOmniX', 'deploys an OmniX exchange')
  .addParam('dependencies', 'true or false to redeploy dependent contracts')
  .setAction(deployOmniX)

task('deployAllX', 'deploys an OmniX exchange')
  .addParam('e', 'testnet or mainnet')
  .addParam('dependencies', 'true or false to redeploy dependent contracts')
  .setAction(deployOmnixAll)

task('verifyOmniX', 'verify an omni')
  .setAction(verifyOmni)

task(
  'setAllTrustedRemote',
  'setAllTrustedRemote',
  setAllTrustedRemote
).addParam('e', 'testnet or mainnet')
  .addParam('contract', 'Contract Name')
  .addParam('exclude', 'exclude chain name separated by single comma. Use none to ignore')
  .addParam('netexclude', 'exclude chain name separated by single comma. Use none to ignore')

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
  'prepareStargate',
  'set bridge and factory and create a pool'
).setAction(prepareStargate)

task('setupBridge', 'setup chain and add liquidity to the pool')
  .addParam('dstchainname', 'destination chain name. ex: rinkeby')
  .setAction(setupBridge)

task('deployAdvancedONFT721', 'deployAdvancedONFT721')
  .addParam('collection', 'collection name')
  .setAction(deployAdvancedONFT721)

task('deployAllAdvancedONFT721', 'deployAllAdvancedONFT721')
  .addParam('e', 'testnet or mainnet')
  .addParam('collection', 'collection name')
  .setAction(deployAllAdvancedONFT721)

task('prepareAdvancedONFT', 'prepareAdvancedONFT')
  .addParam('collection', 'collection name')
  .setAction(prepareAdvancedONFT)

task('prepareAllAdvancedONFT', 'prepareAllAdvancedONFT')
  .addParam('e', 'testnet or mainnet')
  .addParam('collection', 'collection name')
  .setAction(prepareAllAdvancedONFT)

task('deployAdvancedONFT721Gasless', 'deployAdvancedONFT721Gasless')
  .addParam('collection', 'collection name')
  .setAction(deployAdvancedONFT721Gasless)

task('deployAllAdvancedONFT721Gasless', 'deployAllAdvancedONFT721Gasless')
  .addParam('e', 'testnet or mainnet')
  .addParam('collection', 'collection name')
  .setAction(deployAllAdvancedONFT721Gasless)

task('prepareAdvancedONFTGasless', 'prepareAdvancedONFTGasless')
  .addParam('collection', 'collection name')
  .setAction(prepareAdvancedONFTGasless)

task('prepareAllAdvancedONFTGasless', 'prepareAllAdvancedONFTGasless')
  .addParam('e', 'testnet or mainnet')
  .addParam('collection', 'collection name')
  .setAction(prepareAllAdvancedONFTGasless)

task('set721Config', 'set layer zero config for ONFT721')
  .addParam('target', 'target dst network')
  .addParam('collection', 'collection name')
  .setAction(set721Config)

task('setAll721Config', 'sets layer zero config on all chain for ONF721')
  .addParam('e', 'testnet or mainnet')
  .addParam('collection', 'collection name')
  .setAction(setAll721Config)

task('set721GaslessConfig', 'set layer zero config for ONFT721')
  .addParam('target', 'target dst network')
  .addParam('collection', 'collection name')
  .setAction(set721GaslessConfig)

task('setAll721GaslessConfig', 'sets layer zero config on all chain for ONF721')
  .addParam('e', 'testnet or mainnet')
  .addParam('collection', 'collection name')
  .setAction(setAll721GaslessConfig)

task('deployAdvancedONFT721A', 'deployAdvancedONFT721A')
  .addParam('collection', 'collection name')
  .setAction(deployAdvancedONFT721A)

task('deployAllAdvancedONFT721A', 'deployAllAdvancedONFT721A')
  .addParam('collection', 'collection name')
  .addParam('e', 'testnet or mainnet')
  .addParam('exclude', 'exclude chain name separated by single comma. Use none to ignore')
  .setAction(deployAllAdvancedONFT721A)

task('prepareAdvancedONFT721A', 'prepareAdvancedONFT721A')
  .addParam('collection', 'collection name')
  .addParam('target', 'target dst network')
  .addParam('lzconfig', 'true or false for lz config')
  .addParam('startmint', 'true or false for sale started')
  .addParam('reveal', 'true or false for revealed metadata')
  .addParam('bridgefee', 'true or false to set bridge fees')
  .setAction(prepareAdvancedONFT721A)

task('prepareAllAdvancedONFT721A', 'prepareAllAdvancedONFT721A')
  .addParam('lzconfig', 'true or false for lz config')
  .addParam('startmint', 'true or false for sale started')
  .addParam('reveal', 'true or false for revealed metadata')
  .addParam('collection', 'collection name')
  .addParam('e', 'testnet or mainnet')
  .addParam('netexclude', 'exclude chain name separated by single comma. Use none to ignore')
  .addParam('exclude', 'exclude chain name separated by single comma. Use none to ignore')
  .setAction(prepareAllAdvancedONFT721A)

task('setBridgeFees', 'setBridgeFees')
  .addParam('collection', 'collection name')
  .addParam('e', 'testnet or mainnet')
  .addParam('exclude', 'exclude chain name separated by single comma. Use none to ignore')
  .setAction(setBridgeFees)

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

task('setMetadata', 'setMetadata')
  .addParam('collection', 'collection name')
  .setAction(setMetadata)

task('setAllMetadata', 'setAllMetadata')
  .addParam('collection', 'collection name')
  .addParam('e', 'testnet or mainnet')
  .addParam('exclude', 'exclude chain name separated by single comma. Use none to ignore')
  .setAction(setAllMetadata)

task('expandCollection', 'expandCollection')
  .addParam('collection', 'collection name')
  .addParam('e', 'testnet or mainnet')
  .addParam('oldchains', 'exclude chain name separated by single comma. Use none to ignore')
  .addParam('newchains')
  .addParam('lzconfig', 'true or false for lz config')
  .setAction(expandCollection)
task('lzScan', 'lzScan')
  .addParam('hash', 'tx hash')
  .addParam('e', 'testnet or mainnet')
  .setAction(lzScan)

task('compile:solidity:solc:get-build', async (_, __, runSuper) => {
  const solcBuild = await runSuper()
  console.log(solcBuild)

  return solcBuild
})

task('forceResume', 'forceResume')
  .addParam('target', 'target network')
  .addParam('srcua', 'source user address')
  .setAction(forceResume)

task('hasStoredPayload', 'hasStoredPayload')
  .addParam('target', 'target network')
  .addParam('srcua', 'source user address')
  .setAction(hasStoredPayload)

task('trustedRemoteLookup', 'trustedRemoteLookup')
  .addParam('target', 'target network')
  .addParam('collection', 'collection name')
  .setAction(trustedRemoteLookup)