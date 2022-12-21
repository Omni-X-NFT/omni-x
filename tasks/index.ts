import { task } from 'hardhat/config'
import { setTrustedRemote } from './setTrustedRemote'
import { setAllTrustedRemote } from './setAllTrustedRemote'
import { setupMiladyArgs, setupDoodleArgs, setXTrustedRemote, setAllXTrustedRemote, setupAllArgs } from './setupArgs'
import { deployAll } from './deploy'
import { verifyAll } from './verify'

task(
  'setTrustedRemote',
  'setTrustedRemote(chainId, sourceAddr) to enable inbound/outbound messages with your other contracts',
  setTrustedRemote
).addParam('target', 'the target network name, ie: fuji, or mumbai, etc (from hardhat.config.js)')
  .addParam('contract', 'Contract Name')

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
  .addParam('addr', 'Contract address xdeployed')

task(
  'setupMiladyArgs',
  'setup milady args',
  setupMiladyArgs
).addParam('tag', 'testnet or mainnet')
  .addParam('addr', 'Contract address xdeployed')

task(
  'setupDoodleArgs',
  'setup doodle args',
  setupDoodleArgs
).addParam('tag', 'testnet or mainnet')
  .addParam('addr', 'Contract address xdeployed')
  
task(
  'setXTrustedRemote',
  'setup trusted remote for xdeploy contracts',
  setXTrustedRemote
).addParam('e', 'testnet or mainnet')
  .addParam('tag', 'contract tag')
  .addParam('addr', 'Contract address xdeployed')

task(
  'setupAllArgs',
  'setup xdeployed collection args',
  setupAllArgs
).addParam('e', 'testnet or mainnet')
  .addParam('tag', 'testnet or mainnet')
  .addParam('addr', 'Contract address xdeployed')

task(
  'setAllXTrustedRemote',
  'setup trusted remote for xdeploy contracts',
  setAllXTrustedRemote
).addParam('e', 'testnet or mainnet')
  .addParam('tag', 'contract tag')
  .addParam('addr', 'Contract address xdeployed')
