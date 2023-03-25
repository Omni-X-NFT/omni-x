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