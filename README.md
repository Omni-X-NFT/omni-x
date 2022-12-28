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
npx hardhat setupAllArgs --tag ONFT --e testnet --addr [deployed_address]

0x5D09D30D76EBBA528522f9b3c4BD6D861228Bb2b

## Art Gobblers
0x24E0af430B323E8917BA67bee94527f6C16b1AA0

## Metroverse
0x29146F23C966fdb26bEa075F6093928C56A8f531

## Founder Pirates
0xf4151134C5897C71F0C16D7AD76927c660F78c33