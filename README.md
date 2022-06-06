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

# How to deploy

## deploy to rinkeby and bsct
- npx hardhat deployOmniX --network rinkeby
- npx hardhat deployOmniX --network bsct
## set trusted remote for ONFT, OFT
- npx hardhat setTrustedRemote2 --network rinkeby --contract ONFT721 --src [ONFT721_ADDR_RINKEBY] --dst [ONFT721_ADDR_BSCT] --dstchain 97
- npx hardhat setTrustedRemote2 --network bsct --contract ONFT721 --src [ONFT721_ADDR_BSCT] --dst [ONFT721_ADDR_RINKEBY] --dstchain 4

- npx hardhat setTrustedRemote2 --network rinkeby --contract ONFT721 --src [ONFT1155_ADDR_RINKEBY] --dst [ONFT1155_ADDR_BSCT] --dstchain 97
- npx hardhat setTrustedRemote2 --network bsct --contract ONFT721 --src [ONFT1155_ADDR_BSCT] --dst [ONFT1155_ADDR_RINKEBY] --dstchain 4

- npx hardhat setTrustedRemote2 --network rinkeby --contract ONFT721 --src [OFT_ADDR_RINKEBY] --dst [OFT_ADDR_BSCT] --dstchain 97
- npx hardhat setTrustedRemote2 --network bsct --contract ONFT721 --src [OFT_ADDR_BSCT] --dst [OFT_ADDR_RINKEBY] --dstchain 4

# Deployed Contracts
## Rinkeby
- deployed CurrencyManager to  0xec73CFFbD83c878fc4f50c0Cd74A5c119289ae07
- deployed StrategyStandardSale to  0x6ee39B7ef7F4a9A923dAA3010FC9A0B961229243
- deployed ExecutionManager to  0xaDf603eABbfEF66Efb6cb8D00fc72679B21c66f5
- deployed RoyaltyFeeRegistry to  0xF6F5E6FA59149F32fE51fD69d65b760Fe54E4abe
- deployed RoyaltyFeeManager to  0xED810C259D12ebE54EBAde1EbDa93850489EfcC7
- deployed OmniXExchange to  0xAb7cF13223C0205E6D1f70A52322d072D10A798d
- deployed TransferManagerERC721 to  0x85A5ff6650FF2Ec5361C9d4714e2b73D6Af4576b
- deployed TransferManagerERC1155 to  0x15343d04F37Ef11D092D8Fd333E6641678f5F0Bb
- deployed TransferManagerONFT721 to  0xa98b435fB6e91e22baFee45b1cD057bdBe636c63
- deployed TransferManagerONFT1155 to  0x9EA67a001940F6d9b6c157bd218Ea8865C46a3b0
- deployed TransferSelectorNFT to  0xF99D77660e22032c2621A7170d99EFB69098Bca6
- deployed LRTokenMock to  0x4987c682F0b9aD7C15207193eBf0802E88B781D9
- deployed Nft721Mock to  0x7a63301bF0cdaA4e17B2565B1509259b2645969A
- deployed OFT to  0xEaDe6619E16db9ab0a10B505Dc15606fA28A7A94
- deployed ONFT721 to  0x2F7257e95B2f3A2969C85880Ce3AE0870fDa306F
- deployed ONFT1155 to  0x3Cff1472a9C33C23447997414c61b8E715e5564C
- deployed TransferManagerGregs to  0x5fdCe0DA877C80c6adeE6210a03973152840120A
- deployed TransferManagerGhosts to  0x211DBFd713886d2BdBEF0E100795B1A004f4aD53
- deployed GhostlyGhosts to 0x71d5F3d2C3D0139312AB0eF4a462140204D05A64

## BSC testnet
- deployed CurrencyManager to  0x7dEdC2f494F2e224b0EA355D2961564B955819dF
- deployed StrategyStandardSale to  0xF702373cf4a3f911965cF42b1019FAA831724261
- deployed ExecutionManager to  0x5599a1D261CA90b9969E443346EF2B9a664b770f
- deployed RoyaltyFeeRegistry to  0x79ef90F603eC3b59eC65a73d04C41AA3aec70B88
- deployed RoyaltyFeeManager to  0x621aA79DE6B4611Dc21e5364452B23C2AdDf85ab
- deployed OmniXExchange to  0xf42445db4b0653c8a06EfaD2ca99bb5A2180CF95
- deployed TransferManagerERC721 to  0x10037337DF05a7e6c833cbc933e50e4a4c659ff2
- deployed TransferManagerERC1155 to  0x2Ea0F74fd8c13768345e13f937810Ff109c082Fb
- deployed TransferManagerONFT721 to  0xa60f5D6Fe15a1B3398B4854E6B9126842e3eA991
- deployed TransferManagerONFT1155 to  0xBB6876cc7115C87A7FD2aB0eB658810c28466135
- deployed TransferSelectorNFT to  0x383aF3dD766C173b9dCE3e2FE893CEA141e9BDE8
- deployed LRTokenMock to  0x1e05a5980508A244B582dE5991565a84a4Fa406b
- deployed Nft721Mock to  0x346CEcc6764F79E986Cd8B5b3e3D552113fa9670
- deployed OFT to  0xAF3B1D8594666469288991016Ba7B5c4e44E2e99
- deployed ONFT721 to  0x577267C3Ff0c303151122e6a31b7d8089E7222f8
- deployed ONFT1155 to  0x3C4CF086436C68d3c3863fa3751aa38d54241406
- deployed TransferManagerGregs to  0x49fB1b5550AFFdFF32CffF03c1A8168f992296eF
- deployed TransferManagerGhosts to  0x9D1f92d66C515112818053f16Ce4C81Ecd724F3F
- deployed GhostlyGhosts to 0x4642808070a46fBA0096c37dc52a2D44BfAC4841
## Mumbai

# How to test OmniXExchange with Gh0stlyGh0sts NFT on testnet

## deploy TransferManagerGhosts
- npx hardhat deployGhostTransfer --network rinkeby
- npx hardhat deployGhostTransfer --network bsct

## setTrustedRemote for each other.
- npx hardhat setTrustedRemote2 --network rinkeby --contract TransferManagerGhosts --src 0x211DBFd713886d2BdBEF0E100795B1A004f4aD53 --dst 0x9D1f92d66C515112818053f16Ce4C81Ecd724F3F --dstchain 97
- npx hardhat setTrustedRemote2 --network bsct --contract TransferManagerGhosts --src 0x9D1f92d66C515112818053f16Ce4C81Ecd724F3F --dst 0x211DBFd713886d2BdBEF0E100795B1A004f4aD53 --dstchain 4
- npx hardhat testOmniX --step make --tokenid 1 --nonce 1 --network rinkeby
- npx hardhat testOmniX --step take --tokenid 1 --network bsct
