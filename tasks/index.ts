import { task } from 'hardhat/config'
import { setTrustedRemote } from './setTrustedRemote'
import { setAllTrustedRemote } from './setAllTrustedRemote'
import { setupMiladyArgs } from './setupMiladyArgs'
import { setupDoodleArgs } from './setupDoodleArgs'
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
  'setupMilady',
  'setup milady args',
  setupMiladyArgs
).addParam('e', 'testnet or mainnet')
  .addParam('addr', 'Contract address xdeployed')

task(
  'setupDoodleArgs',
  'setup doodle args',
  setupDoodleArgs
).addParam('e', 'testnet or mainnet')
  .addParam('addr', 'Contract address xdeployed')
