import { task } from 'hardhat/config'
import { setTrustedRemote } from './setTrustedRemote'
import { deployOmniX } from './deployOmniX'
import { deployGhostTransfer, deployGregTransfer } from './deployGGTransfer'
import { setTrustedRemote2 } from './setTrustedRemote2'
import { testGhosts } from './test'

task(
  'setTrustedRemote',
  'setTrustedRemote(chainId, sourceAddr) to enable inbound/outbound messages with your other contracts',
  setTrustedRemote
).addParam('target', 'the target network name, ie: fuji, or mumbai, etc (from hardhat.config.js)')
  .addParam('contract', 'Contract Name')

task('deployOmniX', 'deploys an OmniX exchange')
  .setAction(deployOmniX)

task('deployGhostTransfer', 'deploys an Transfer manager for Gh0stlyGh0sts')
  .setAction(deployGhostTransfer)

task('deployGregTransfer', 'deploys an Transfer manager for Gh0stlyGh0sts')
  .setAction(deployGregTransfer)

task('setTrustedRemote2', 'set trusted remote')
  .addParam('contract', 'contract name')
  .addParam('src', 'contract address on source chain')
  .addParam('dst', 'contract address on dest chain')
  .addParam('dstchain', 'dest chain id')
  .setAction(setTrustedRemote2)

task('testOmniX', 'test OmniXEchange with Gh0stlyGh0sts NFT between rinkeby vs bsctest')
  .addParam('step', 'make | approve | take')
  .addParam('tokenid', 'number')
  .addOptionalParam('nonce', 'number required when make step')
  .setAction(testGhosts)