import { task } from 'hardhat/config'
import { setTrustedRemote } from './setTrustedRemote'
import { deployOmniX } from './deployOmniX'
import { linkOmniX, prepareOmniX } from './prepareOmniX'
import { testGhosts } from './test'
import { verifyOmni } from './verify'
import { deployNormal, linkNormal, testNormal } from './testNormal'
import { setAllTrustedRemote } from './setAllTrustedRemote'

task(
  'setTrustedRemote',
  'setTrustedRemote(chainId, sourceAddr) to enable inbound/outbound messages with your other contracts',
  setTrustedRemote
).addParam('target', 'the target network name, ie: fuji, or mumbai, etc (from hardhat.config.js)')
  .addParam('contract', 'Contract Name')

task('deployOmniX', 'deploys an OmniX exchange')
  .setAction(deployOmniX)

task('prepareOmniX', 'deploys an OmniX exchange')
  .setAction(prepareOmniX)

task('linkOmniX', 'deploys an OmniX exchange')
  .addParam('dstchainname', 'destination chain name. ex: rinkeby')
  .setAction(linkOmniX)

task('testOmniX', 'test OmniXEchange with Gh0stlyGh0sts NFT between rinkeby vs bsctest')
  .addParam('step', 'listing prepare buy')
  .addOptionalParam('tokenid', 'number. not required in prepare step')
  .addOptionalParam('nonce', 'number. required only in listing step')
  .setAction(testGhosts)

task('verifyOmni', 'verify an omni')
  .setAction(verifyOmni)

task('deployNormal', 'deploys an normal nft')
  .setAction(deployNormal)

task('linkNormal', 'link an normal nft')
  .addParam('dstchainname', 'destination chain name. ex: rinkeby')
  .setAction(linkNormal)

task('testNormal', 'test OmniXEchange with Normal NFT between fuji vs bsctest')
  .addParam('step', 'listing prepare buy')
  .addOptionalParam('tokenid', 'number. not required in prepare step')
  .addOptionalParam('nonce', 'number. required only in listing step')
  .setAction(testNormal)
task(
  'setAllTrustedRemote',
  'setAllTrustedRemote',
  setAllTrustedRemote
).addParam('e', 'testnet or mainnet')
  .addParam('contract', 'Contract Name')
