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

# Deployed Contracts
## Rinkeby
- deployed CurrencyManager to  0xec73CFFbD83c878fc4f50c0Cd74A5c119289ae07
- deployed StrategyStandardSale to  0x6ee39B7ef7F4a9A923dAA3010FC9A0B961229243
- deployed ExecutionManager to  0xaDf603eABbfEF66Efb6cb8D00fc72679B21c66f5
- deployed RoyaltyFeeRegistry to  0xF6F5E6FA59149F32fE51fD69d65b760Fe54E4abe
- deployed RoyaltyFeeManager to  0xED810C259D12ebE54EBAde1EbDa93850489EfcC7
- deployed OmniXExchange to  0x4880Bdb2D46a9159b0860d97848ed1B0cDfAf5E6
- deployed TransferManagerERC721 to  0x923b43E03B6108b53Ba6f0a96990E74C4823F093
- deployed TransferManagerERC1155 to  0x5209C469075F63d0CD06cF4c52DFA21B0Cb9dd96
- deployed TransferManagerONFT721 to  0x8A610409E6b4c4873E0E6105cbEF430aB2c60Af5
- deployed TransferManagerONFT1155 to  0x6Ccd136bb20701624e6c0ca5C6Cb9f7d30D4DEef
- deployed TransferSelectorNFT to  0x578cF9AA6AEe142BABE78e8c1f2024411Ce5d325
- deployed LRTokenMock to  0x4987c682F0b9aD7C15207193eBf0802E88B781D9
- deployed Nft721Mock to  0x7a63301bF0cdaA4e17B2565B1509259b2645969A
- deployed OFT to  0xEaDe6619E16db9ab0a10B505Dc15606fA28A7A94
- deployed ONFT721 to  0x2F7257e95B2f3A2969C85880Ce3AE0870fDa306F
- deployed ONFT1155 to  0x3Cff1472a9C33C23447997414c61b8E715e5564C

## Mumbai