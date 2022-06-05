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
- deployed TransferManagerGregs to  0x5fdCe0DA877C80c6adeE6210a03973152840120A
- deployed GhostlyGhosts to 0x71d5F3d2C3D0139312AB0eF4a462140204D05A64

## BSC testnet
- deployed CurrencyManager to  0x7dEdC2f494F2e224b0EA355D2961564B955819dF
- deployed StrategyStandardSale to  0xF702373cf4a3f911965cF42b1019FAA831724261
- deployed ExecutionManager to  0x5599a1D261CA90b9969E443346EF2B9a664b770f
- deployed RoyaltyFeeRegistry to  0x79ef90F603eC3b59eC65a73d04C41AA3aec70B88
- deployed RoyaltyFeeManager to  0x621aA79DE6B4611Dc21e5364452B23C2AdDf85ab
- deployed OmniXExchange to  0x884D90721f80F57de5FeAd59c9f50E8749ff478C
- deployed TransferManagerERC721 to  0xDD64E82F747D90C5d5A924C4BD1afac74AB81372
- deployed TransferManagerERC1155 to  0x3F540A7540196eDb097a0B4c90593EBe5Cf3EC7f
- deployed TransferManagerONFT721 to  0x63A4DA71FCEFc71f9dF29b9459deB185Bc2fdC85
- deployed TransferManagerONFT1155 to  0x1321deCadE9fE6b325136f2b94Bdb9f959702414
- deployed TransferSelectorNFT to  0x3C533373b3Ae78e3B0b500819f43851aBDa98949
- deployed LRTokenMock to  0x1e05a5980508A244B582dE5991565a84a4Fa406b
- deployed Nft721Mock to  0x346CEcc6764F79E986Cd8B5b3e3D552113fa9670
- deployed OFT to  0xAF3B1D8594666469288991016Ba7B5c4e44E2e99
- deployed ONFT721 to  0x577267C3Ff0c303151122e6a31b7d8089E7222f8
- deployed ONFT1155 to  0x3C4CF086436C68d3c3863fa3751aa38d54241406
- deployed TransferManagerGregs to  0x49fB1b5550AFFdFF32CffF03c1A8168f992296eF
- deployed GhostlyGhosts to 0x4642808070a46fBA0096c37dc52a2D44BfAC4841
## Mumbai

# How to test OmniXExchange with Gh0stlyGh0sts NFT on testnet

## deploy TransferManagerGhosts
- npx hardhat deployGhostTransfer --network rinkeby
- npx hardhat deployGhostTransfer --network bsct

## setTrustedRemote for each other.
- npx hardhat setTrustedRemote2 --network rinkeby --contract TransferManagerGhosts --src 0xED970A27b0220458C68434F0E91894103FF00B63 --dst 0x4FEE2C943Cd8747aba49C35A5320a19613817E1e --dstchain 97
- npx hardhat setTrustedRemote2 --network bsct --contract TransferManagerGhosts --src 0x4FEE2C943Cd8747aba49C35A5320a19613817E1e --dst 0xED970A27b0220458C68434F0E91894103FF00B63 --dstchain 4
- npx hardhat testOmniX --step make --tokenid 1 --nonce 1 --network rinkeby
- npx hardhat testOmniX --step take --tokenid 1 --network bsct
