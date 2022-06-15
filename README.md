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

# How to deploy and test
 *Caution* 
 TransferManagerGhosts should be deployed as same address to all networks.
## Deploy to rinkeby and bsct
- npx hardhat deployOmniX --network fuji
- npx hardhat deployOmniX --network bsct
- npx hardhat prepareOmniX --network fuji
- npx hardhat prepareOmniX --network bsct
- npx hardhat linkOmniX --network fuji --dstchainname bsct
- npx hardhat linkOmniX --network bsct --dstchainname fuji

# How to verify
- npx hardhat verifyOmni --network fuji
- npx hardhat verifyOmni --network bsct

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

# Deployed Contracts

## BSC testnet
- deployed StrategyStandardSale to  0xF879784C48d0C8c003Df4289e614d1771B8Ac75e
- deployed CurrencyManager to  0xD275A5285F9917c8cB7B58E8ADef25FD7CdB2144
- deployed ExecutionManager to  0x614389E0006e13F6f5be18faD6A3627D3c80CeC4
- deployed RoyaltyFeeRegistry to  0x9344a7f70E0F05E36fFD583f059f9F18355BFDDd
- deployed RoyaltyFeeManager to  0x0a6d3E201aE8d0dFd93eDeA13FF43372CC7f112f
- deployed OmniXExchange to  0xf4eF74634945d13e5f8F3e539885CAce8f079bE2
- deployed TransferManagerERC721 to  0x5F8D2c82ca3b5510b87A406B7e446dB480a2ECDe
- deployed TransferManagerERC1155 to  0x07Dbef39a5143c21D31b85D1D68a1eC1Ea05d0da
- deployed TransferSelectorNFT to  0x30be2979F1297C914fbD6De7A8a45549362f2b6E
- deployed RemoteAddrManager to  0x956B386B27eaA08b88AC945D52e4D65299767c88
- deployed TransferManagerONFT721 to  0x3C5155e243E1F25f56009F164d75c70ade97c588
- deployed TransferManagerONFT1155 to  0x1DF525AFF1B9e6baFeC04A92e99B163Bd7B1a498
- deployed TransferManagerGhosts to  0xD14e3adA7FbbdE9a0E34f5Cc94322275Db880036
- deployed OFTMock to  0xFC2c41Ab2A525bCf7BC479b9A7ebA7ab7c3c0850
## Fuji
- deployed StrategyStandardSale to  0xc454e1189B0677561bB42f0016f818829458e978
- deployed CurrencyManager to  0xAbe3BD6B19334A2EBB422078528d7C26Eef02626
- deployed ExecutionManager to  0x16007df2A3f7Aa502cf3990EEb4DA3F1D11c223C
- deployed RoyaltyFeeRegistry to  0xF879784C48d0C8c003Df4289e614d1771B8Ac75e
- deployed RoyaltyFeeManager to  0xD275A5285F9917c8cB7B58E8ADef25FD7CdB2144
- deployed OmniXExchange to  0x614389E0006e13F6f5be18faD6A3627D3c80CeC4
- deployed TransferManagerERC721 to  0x9344a7f70E0F05E36fFD583f059f9F18355BFDDd
- deployed TransferManagerERC1155 to  0x0a6d3E201aE8d0dFd93eDeA13FF43372CC7f112f
- deployed TransferSelectorNFT to  0xf4eF74634945d13e5f8F3e539885CAce8f079bE2
- deployed RemoteAddrManager to  0x5F8D2c82ca3b5510b87A406B7e446dB480a2ECDe
- deployed TransferManagerONFT721 to  0x07Dbef39a5143c21D31b85D1D68a1eC1Ea05d0da
- deployed TransferManagerONFT1155 to  0x30be2979F1297C914fbD6De7A8a45549362f2b6E
- deployed TransferManagerGhosts to  0xD14e3adA7FbbdE9a0E34f5Cc94322275Db880036
- deployed OFTMock to  0x956B386B27eaA08b88AC945D52e4D65299767c88