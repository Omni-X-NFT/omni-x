# Omni X

Omni X is an omnichain NFT marketplace based on top of LayerZero and LooksRare. The off-chain part is being served by a MongoDB Atlas cluster.

# Etherscan verification

With a valid .env file in place, first deploy your contract.

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```

# Performance optimizations

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).

# Deploy && Verify

## Milady
Modify `xdeploy` value of hardhat.config.ts with Milady collection params
```
npx hardhat xdeploy
npx hardhat setupAllArgs --tag Milady --e testnet --addr [deployed_address]
npx hardhat setAllXTrustedRemote --tag Milady --e testnet --addr [deployed_address]
npx hardhat verifyAll --e testnet --tags Milady --addr [deployed_address]

0x3ca0FCE5170acB1256EceC68557fd664B2baA390
0x896CA9931238169186001228ab2D3e060cA21179
```

## Doodle
Modify `xdeploy` value of hardhat.config.ts with Doodle collection params
```
npx hardhat xdeploy
npx hardhat setupAllArgs --tag Doodle --e testnet --addr [deployed_address]
npx hardhat setAllXTrustedRemote --tag Doodle --e testnet --addr [deployed_address]
npx hardhat verifyAll --e testnet --tags Doodle --addr [deployed_address]

0x531c201be36f36F6Ff142A5f15160815e01cC7A2
0x314c20Ff9C07De1935eA41eeBa368F03E36f4046
```

## Tiny Din0s
npx hardhat verifyAll --e testnet --tags ONFT --addr [deployed_address]
npx hardhat setupAllArgs --tag ONFT --e testnet --addr [deployed_address]
npx hardhat setAllXTrustedRemote --tag ONFT --e testnet --addr [deployed_address]

0x57Ed8cca698f69089E7F1134A585835f52D63980

## Art Gobblers
0x24E0af430B323E8917BA67bee94527f6C16b1AA0

## Metroverse
0x29146F23C966fdb26bEa075F6093928C56A8f531

## Founder Pirates
0xc7Ebe9524960B24Da1E17F0Bc3280E9bDB8697E0

npx hardhat verifyAll --e testnet --tags ONFT --addr [deployed_address]
npx hardhat setupAllArgs --tag ONFT --e testnet --addr [deployed_address]
npx hardhat setAllXTrustedRemote --tag ONFT --e testnet --addr [deployed_address]
# How to verify
- npx hardhat verifyOmniX --network fuji
- npx hardhat verifyOmniX --network bsct

# How to deploy and test with OFT && Ghosts
 *Caution* 
 TransferManagerGhosts should be deployed as same address to all networks.
## Deploy to fuji and bsct
- npx hardhat deployOmniX --network fuji
- npx hardhat deployOmniX --network bsct
- npx hardhat prepareOmniX --network fuji
- npx hardhat prepareOmniX --network bsct
- npx hardhat linkOmniX --network fuji --dstchainname bsct
- npx hardhat linkOmniX --network bsct --dstchainname fuji
- npx hardhat prepareStargate --network fuji
- npx hardhat prepareStargate --network bsct
- npx hardhat setupBridge --network fuji --dstchainname bsct
- npx hardhat setupBridge --network bsct --dstchainname fuji

## Test GhostlyGhosts with ONFT
### Assumption
- maker is on fuji
- taker is on bsct
- GhostlyGhosts NFT #1, #2 should be minted to maker before start to test on rinkeby
- on fuji TransferManagerGhosts contract should have some balances to pay the gas fees for cross transferring.

### Test
- npx hardhat testOmniX --step listing --tokenid 1 --nonce 1 --network fuji
- npx hardhat testOmniX --step prepare --network bsct
- npx hardhat testOmniX --step buy --tokenid 1 --network bsct

- npx hardhat testOmniX --step status --tokenid 1 --network fuji
- npx hardhat testOmniX --step status --tokenid 1 --network bsct

# How to deploy and test with OFT && Normal NFT
 *Caution* 
 This test should be executed after the above one is done.
## Deploy to fuji and bsct
- npx hardhat deployNormal --network fuji
- npx hardhat deployNormal --network bsct
- npx hardhat linkNormal --network fuji --dstchainname bsct
- npx hardhat linkNormal --network bsct --dstchainname fuji

## Test
- npx hardhat testNormal --step preparemaker --network fuji
- npx hardhat testNormal --step preparetaker --network bsct
- npx hardhat testNormal --step listing --tokenid 1 --nonce 2 --network fuji
- npx hardhat testNormal --step buy --tokenid 1 --network bsct

# Deployed Contracts at once
- npx hardhat deployAllX --e testnet [mainnet]
- npx hardhat prepareAllX --e testnet [mainnet]
- npx hardhat linkAllX --e testnet [mainnet]

*Caution*
If the collection is only on a certain chain, then TransferSelector can't determine TransferManager.
In this case you need to set the corresponding TransferManager for the collection.
