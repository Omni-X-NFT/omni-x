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
npx hardhat setupMiladyArgs --e testnet --addr [deployed_address] --network [network_name]
npx hardhat verifyAll --e testnet --tags Milady --addr [deployed_address] --network [network_name]
```

## Doodle
Modify `xdeploy` value of hardhat.config.ts with Doodle collection params
```
npx hardhat xdeploy
npx hardhat setupDoodleArgs --e testnet --addr [deployed_address] --network [network_name]
npx hardhat verifyAll --e testnet --tags Doodle --addr [deployed_address] --network [network_name]
```
