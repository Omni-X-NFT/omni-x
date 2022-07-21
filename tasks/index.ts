import { task } from 'hardhat/config'
import { setTrustedRemote } from './setTrustedRemote'
import { setAllTrustedRemote } from './setAllTrustedRemote'
import { deployAll } from './deployAll'
import { verifyAll } from './verifyAll'
import { aonftSetWhitelist } from './aonftSetWhitelist'
import { aonftSetPrice } from './aonftSetPrice'

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

task(
  'aonftSetWhitelist',
  'set the whitelist on a selected network via merkle tree',
  aonftSetWhitelist
)

task(
  'aonftSetPrice',
  'setPrice(price) to set a new price for the mint',
  aonftSetPrice
).addParam('price', 'new price of the mint')
