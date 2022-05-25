import { task } from 'hardhat/config'
import { setTrustedRemote } from './setTrustedRemote'

task(
  'setTrustedRemote',
  'setTrustedRemote(chainId, sourceAddr) to enable inbound/outbound messages with your other contracts',
  setTrustedRemote
).addParam('target', 'the target network to set as a trusted remote')
  .addParam('contractname', 'Contract Name')
// .addParam("contractName", "the contract name to call setTrustedRemote on")
