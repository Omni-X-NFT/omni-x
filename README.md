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

## Deploy to rinkeby and bsct
- npx hardhat deployOmniX --network fuji
- npx hardhat deployOmniX --network bsct
- npx hardhat prepareOmniX --network fuji
- npx hardhat prepareOmniX --network bsct
- npx hardhat linkOmniX --network fuji --dstchainname bsct
- npx hardhat linkOmniX --network bsct --dstchainname fuji

## Test GhostlyGhosts with ONFT
### Assumption
- maker is on rinkeby
- taker is on bsct
- GhostlyGhosts NFT #1, #2 should be minted to maker before start to test on rinkeby
- TransferManagerGhosts contract should have some balances to pay the gas fees for cross transferring.

### Test
- npx hardhat testOmniX --step make --tokenid 1 --nonce 3 --network fuji
- npx hardhat testOmniX --step take --tokenid 1 --network bsct
- npx hardhat testOmniX --step status --tokenid 1 --network fuji
- npx hardhat testOmniX --step status --tokenid 1 --network bsct

# Deployed Contracts
## Rinkeby
- deployed StrategyStandardSale to  0x796886146f6259ee8C346eb4e8e04450D1fCcEDB
- deployed CurrencyManager to  0x317619E68220A935A9dD9aF10F8AEF38393880c2
- deployed ExecutionManager to  0xcc05B1729f88d19fE78F3b63704e8583f6e23DeA
- deployed RoyaltyFeeRegistry to  0x10F614bB4adA6C874E0D561A274aeaBfdAca8845
- deployed RoyaltyFeeManager to  0x1915026D1B8598054D01265155ea9C66269677E6
- deployed OmniXExchange to  0x1fa724204c4eda2F080a923913F5b3441d4f8916
- deployed TransferManagerERC721 to  0x826EBE67E248bD92f92F7952F84B4578C3c16088
- deployed TransferManagerERC1155 to  0x764e4A40fBd1dd12Fe90506EEf61802EA1e1C15f
- deployed TransferSelectorNFT to  0xf77D6ac18F342B393ADeBA0477DedE1a7A630346
- deployed RemoteAddrManager to  0x134084f198c0592ecA631C45d0662475279783ed
- deployed TransferManagerONFT721 to  0xA3DDBa31325a1A224fecEEC5c2a7Aa3161532B7b
- deployed TransferManagerONFT1155 to  0x7Fa0f33B13a2dFAaCA921D3b53592a188d25Bd3a
- deployed TransferManagerGhosts to  0x155C95F6BAE7369C4DC00304Db5C6EEDd9Aa42aa
- deployed OFTMock to  0xff1935e723E5c2c9369224318C8cbe09542515C7

## BSC testnet
- deployed StrategyStandardSale to  0x97815054A089415BFB19719130491B2b663F0CD3
- deployed CurrencyManager to  0xFC0A62CcD791343F9E2f9308476c9ac8Dd71152E
- deployed ExecutionManager to  0xfB1fB8bCaC4A94DD2cF7cc0144334B64F10B7507
- deployed RoyaltyFeeRegistry to  0xB665169e0D48466Ca43Af7B7223BEd1E392a29E2
- deployed RoyaltyFeeManager to  0x31AdCC150fab2884f2f9491c73f82F6e11eFA57a
- deployed OmniXExchange to  0xDde0cb68178f25144d0EF015eDBa78f2Ba261Aa5
- deployed TransferManagerERC721 to  0x93aC82752E9c019E3C251Cb6C5108aEcF8D73E0a
- deployed TransferManagerERC1155 to  0x2c1bD9A08d376786a5c735ec901F03275056D65F
- deployed TransferSelectorNFT to  0x5cA0377D0f2dC06d37378ed20CB7f8DD55277689
- deployed RemoteAddrManager to  0x9976d4C81a0acfBec132c9D776C73e44E3Cc9AfB
- deployed TransferManagerONFT721 to  0x1e752219dC54acF8336A390087Dc54ad74A9b07D
- deployed TransferManagerONFT1155 to  0xcA10186a2636A887543024A5CDD57606FC52a8dA
- deployed TransferManagerGhosts to  0xad551CE845b6D126f3aB413C85215CaBc3FCdb93
- deployed OFTMock to  0x5dDebB0C8878d425fc4b942b97D5F1A2e0C4Fa1c
## Mumbai

