import { task } from 'hardhat/config'
import { setTrustedRemote } from './setTrustedRemote'
import { deployOmniX } from './deployOmniX'
import { linkOmniX, prepareOmniX } from './prepareOmniX'
import { testGhosts } from './test'

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
  .addParam('dstchainid', 'destination chain id. ex: 4')
  .addParam('dstchainname', 'destination chain name. ex: rinkeby')
  .setAction(linkOmniX)
task('testOmniX', 'test OmniXEchange with Gh0stlyGh0sts NFT between rinkeby vs bsctest')
  .addParam('step', 'make | approve | take')
  .addParam('tokenid', 'number')
  .addOptionalParam('nonce', 'number required when make step')
  .setAction(testGhosts)
