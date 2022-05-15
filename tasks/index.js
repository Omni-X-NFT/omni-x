task(
  'setTrustedRemote',
  'setTrustedRemote(chainId, sourceAddr) to enable inbound/outbound messages with your other contracts',
  require('./setTrustedRemote')
).addParam('targetNetwork', 'the target network to set as a trusted remote')
// .addParam("contractName", "the contract name to call setTrustedRemote on")
